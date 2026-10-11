"""调度：闭环用户曲线与开放到达。可注入 turn_fn，便于离线验证。"""
from __future__ import annotations

import threading
import time
import concurrent.futures
from dataclasses import dataclass, field
from typing import Callable, Optional


@dataclass
class RequestAttempt:
    request_id: int
    start: float
    end: float
    ok: bool
    error: Optional[str] = None
    status: Optional[str] = None


@dataclass
class TurnResult:
    ok: bool
    start: float
    end: float
    requests: list = field(default_factory=list)     # list[RequestAttempt]
    first_text_wait: Optional[float] = None          # 相对整轮起点
    error: Optional[str] = None
    scenario: str = "text"


@dataclass
class ClosedLoopResult:
    users: int
    turns: list = field(default_factory=list)
    peak_in_flight: int = 0
    requests: list = field(default_factory=list)
    duration_s: float = 0.0
    start: float = 0.0
    end: float = 0.0
    stopped_by: str = ""

    def turn_latencies(self):
        return [t.end - t.start for t in self.turns]

    def first_text_waits(self):
        return [t.first_text_wait for t in self.turns if t.first_text_wait is not None]


def run_closed_loop(
    turn_fn: Callable[[int, int], TurnResult],   # (user_index, turn_index) -> TurnResult
    *,
    users: int,
    think_time: float,
    min_seconds: float = 0.0,
    min_turns: int = 0,
    max_seconds: float = 600.0,
    clock=time.monotonic,
    sleep=time.sleep,
) -> ClosedLoopResult:
    """每个用户顺序发轮次，轮次间等待 think_time；单用户最多一个在途请求。"""
    res = ClosedLoopResult(users=users)
    lock = threading.Lock()
    in_flight = {"n": 0}
    stop_flag = threading.Event()
    start = clock()
    res.start = start

    def wrapped(u, i):
        with lock:
            in_flight["n"] += 1
            if in_flight["n"] > res.peak_in_flight:
                res.peak_in_flight = in_flight["n"]
        try:
            return turn_fn(u, i)
        finally:
            with lock:
                in_flight["n"] -= 1

    def worker(u: int):
        turn_i = 0
        while not stop_flag.is_set():
            t = wrapped(u, turn_i)
            with lock:
                res.turns.append(t)
                for r in t.requests:
                    res.requests.append(r)
            turn_i += 1
            # think time (interruptible)
            deadline = clock() + think_time
            while not stop_flag.is_set() and clock() < deadline:
                sleep(min(0.02, max(0.0, deadline - clock())))

    threads = [threading.Thread(target=worker, args=(u,), daemon=True) for u in range(users)]
    for th in threads:
        th.start()

    # monitor until both sample conditions satisfied or hard deadline
    while True:
        elapsed = clock() - start
        with lock:
            nturns = len(res.turns)
        enough = elapsed >= min_seconds and nturns >= min_turns
        if enough:
            res.stopped_by = "sample_met"
            stop_flag.set()
            break
        if elapsed >= max_seconds:
            res.stopped_by = "max_seconds"
            stop_flag.set()
            break
        sleep(0.05)

    stop_flag.set()
    for th in threads:
        th.join()  # turn_fn transport has finite request timeouts; never return with live workers
    res.end = clock()
    res.duration_s = res.end - res.start
    return res


def run_open_arrival(
    turn_fn: Callable[[int], TurnResult],
    *,
    arrival_rate: float,          # 轮次/s
    duration: float,
    max_in_flight: int,
    queue_limit: int,
    clock=time.monotonic,
    sleep=time.sleep,
):
    """按到达率生成独立轮次；超过在途/队列上限记拒绝（不静默丢弃）。

    返回 dict：scheduled / completed / failed / rejected / queue_wait 列表 / 在途峰值。
    """
    lock = threading.Lock()
    state = {"completed": 0, "failed": 0, "rejected": 0, "in_flight": 0,
             "peak": 0, "queue": 0}
    results = []
    next_id = {"n": 0}
    interval = 1.0 / arrival_rate if arrival_rate > 0 else 0.0
    start = clock()
    threads = []

    def do_turn(idx, planned_t, actual_start):
        actual_start = clock()
        with lock:
            state['queue'] -= 1
            state['in_flight'] += 1
            state['peak'] = max(state['peak'], state['in_flight'])
        try:
            t = turn_fn(idx)
        except Exception as exc:  # noqa: BLE001
            t = TurnResult(ok=False, start=actual_start, end=clock(), error=str(exc))
        with lock:
            state["in_flight"] -= 1
            if t.ok:
                state["completed"] += 1
            else:
                state["failed"] += 1
            t.queue_wait = actual_start - planned_t  # type: ignore[attr-defined]
            t.planned_arrival = planned_t  # type: ignore[attr-defined]
            t.actual_worker_start = actual_start  # type: ignore[attr-defined]
            results.append(t)

    scheduled = 0
    if arrival_rate <= 0 or duration < 0 or max_in_flight <= 0 or queue_limit < 0:
        raise ValueError('positive rate/in-flight, nonnegative duration/queue required')
    pool = concurrent.futures.ThreadPoolExecutor(max_workers=max_in_flight)
    while clock() - start < duration:
        planned = start + scheduled * interval
        now = clock()
        if now < planned:
            sleep(min(0.005, planned - now))
            continue
        with lock:
            if state['in_flight'] + state['queue'] >= max_in_flight + queue_limit:
                state['rejected'] += 1
                scheduled += 1
                continue
            state['queue'] += 1
            actual_start = clock()
            next_id["n"] += 1
            idx = next_id["n"]
        threads.append(pool.submit(do_turn, idx, planned, actual_start))
        scheduled += 1

    pool.shutdown(wait=True)
    for future in threads:
        future.result()
    # wait for in-flight
    while True:
        with lock:
            if state["in_flight"] <= 0:
                break
        sleep(0.02)

    with lock:
        out = dict(state)
    out["scheduled"] = scheduled
    out["queue_waits"] = [getattr(t, "queue_wait", 0.0) for t in results]
    out["results"] = results
    out["duration_s"] = clock() - start
    return out
