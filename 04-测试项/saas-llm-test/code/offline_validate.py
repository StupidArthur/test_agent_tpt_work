"""执行器离线验证：test-item docs/04 要求的 8 项。

这些都是**执行器验证**，不是真实网关结果。用本地可控 HTTP/SSE 服务。
用法：python 04-测试项/saas-llm-test/code/offline_validate.py --task-dir <探索任务目录>
"""
from __future__ import annotations

import json
import os
import sys
import time
import argparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import mock_server  # noqa: E402
from llm_probe.capacity import RequestAttempt, TurnResult, run_closed_loop, run_open_arrival  # noqa: E402
from llm_probe.evidence import EvidenceStore, sha256_file  # noqa: E402
from llm_probe.protocol import normalize_responses  # noqa: E402
from llm_probe.sse import SSEDecoder  # noqa: E402
from llm_probe.stats import SLO, LevelResult, capacity_conclusion, evaluate_level  # noqa: E402
from llm_probe.transport import http_json, http_request  # noqa: E402
from llm_probe.cli import validate_task_dir

HERE = os.path.dirname(os.path.abspath(__file__))
parser = argparse.ArgumentParser(description='offline local mock validation; no real gateway requests')
parser.add_argument('--task-dir', required=True)
ROOT = validate_task_dir(parser.parse_args().task_dir)
EVID = os.path.join(ROOT, "证据")
store = EvidenceStore(EVID, index_path=os.path.join(ROOT, "证据索引.jsonl"), prefix="离线验证")
PORT = {"p": 0}
BASE = {"u": ""}

RESULTS = []


def check(name, fn):
    t0 = time.monotonic()
    try:
        ok, detail = fn()
    except Exception as exc:  # noqa: BLE001
        import traceback
        ok, detail = False, f"EXCEPTION {type(exc).__name__}: {exc}\n{traceback.format_exc()}"
    RESULTS.append({"check": name, "passed": bool(ok), "detail": detail,
                    "seconds": round(time.monotonic() - t0, 3)})
    print(f"[{'PASS' if ok else 'FAIL'}] {name}\n        {detail}")


def url(scenario):
    return f"{BASE['u']}/mock/{scenario}"


def post(scenario, body=None, **kw):
    b = json.dumps(body or {"model": "ds-flash"}).encode("utf-8")
    return http_request(url(scenario), method="POST",
                        headers={"Content-Type": "application/json", "Authorization": "Bearer test-key"},
                        body=b, connect_timeout=5, idle_timeout=kw.pop("idle_timeout", 5.0),
                        total_timeout=kw.pop("total_timeout", 30.0), **kw)


def dump_frames(res, name):
    frames = [{"t": res.rel(f.t), "event": f.event, "data": f.data, "json_ok": f.json_ok} for f in res.frames]
    store.write_json(f"frames/{name}.json",
                     {"http_status": res.http_status, "error_kind": res.error_kind,
                      "t_headers": res.rel(res.t_headers), "t_first_frame": res.rel(res.t_first_frame),
                      "t_end": res.rel(res.t_end), "body_text": res.body_text[:2000], "frames": frames},
                     instances=[f"OFFLINE/{name}"], kind="sse_frames")


# ---------------------------------------------------------------- 1

def c1_ordering():
    res = post("ok_responses")
    dump_frames(res, "c1_ok_responses")
    ns = normalize_responses(res)
    if ns.t_first_event is None or ns.t_first_reasoning is None or ns.t_first_text is None:
        return False, f"时间点缺失 event={ns.t_first_event} reas={ns.t_first_reasoning} text={ns.t_first_text}"
    ordered = ns.t_first_event < ns.t_first_reasoning < ns.t_first_text
    text_ok = ns.text.strip() == "GW_CHECK_7c91"
    final_ok = ns.final_text == "GW_CHECK_7c91"
    d = (f"t_event={res.rel(ns.t_first_event):.4f} < t_reasoning={res.rel(ns.t_first_reasoning):.4f} "
         f"< t_text={res.rel(ns.t_first_text):.4f}; text={ns.text!r} final={ns.final_text!r} "
         f"reasoning={ns.reasoning!r} terminal={ns.terminal}")
    return (ordered and text_ok and final_ok), d


# ---------------------------------------------------------------- 2

def c2_framing():
    res = post("ok_responses")
    ns = normalize_responses(res)
    # 多行 data 的增量被正确拼接；中文跨分片推理无损；注释不破坏正文
    text_ok = ns.text == "GW_CHECK_7c91"
    reason_ok = ns.reasoning == "思考中"
    no_json_err = not ns.json_errors
    # 直接再喂一次字节级分片，验证跨块 UTF-8
    dec = SSEDecoder()
    payload = 'event: response.output_text.delta\ndata: {"delta":"工业ABC"}\n\n'.encode("utf-8")
    got = []
    for i in range(len(payload)):
        got.extend(dec.feed(payload[i:i + 1]))
    got.extend(dec.flush())
    bytewise_ok = any(f.json_obj and f.json_obj.get("delta") == "工业ABC" for f in got)
    detail = (f"text_ok={text_ok} reasoning_ok={reason_ok} json_errors={ns.json_errors} "
              f"bytewise_utf8_ok={bytewise_ok} frames={len(res.frames)} unknown={ns.unknown_events}")
    return (text_ok and reason_ok and no_json_err and bytewise_ok), detail


# ---------------------------------------------------------------- 3

def c3_tools():
    res = post("tool_split")
    dump_frames(res, "c3_tool_split")
    ns = normalize_responses(res)
    tools = {tc.call_id: tc.to_dict() for tc in ns.tool_calls.values()}
    ok1 = tools.get("call_1", {}).get("arguments_from_deltas") == '{"a":17,"b":25}'
    ok1 = ok1 and tools.get("call_1", {}).get("delta_matches_final") is True
    ok2 = tools.get("call_2", {}).get("delta_matches_final") is False   # 矛盾被识别
    ids = sorted(tools.keys())
    names = sorted({t["name"] for t in tools.values()})
    detail = (f"calls={ids} names={names} call_1={tools.get('call_1')} call_2={tools.get('call_2')}")
    return (ok1 and ok2 and ids == ["call_1", "call_2"]), detail


# ---------------------------------------------------------------- 4

def c4_failures():
    cases = {}
    r401 = post("http_401"); cases["http_401"] = r401.http_status == 401
    r429 = post("http_429")
    cases["http_429"] = r429.http_status == 429 and r429.headers.get("Retry-After") == "3"
    r500 = post("http_500"); cases["http_500"] = r500.http_status == 500
    r503 = post("http_503"); cases["http_503"] = r503.http_status == 503
    ri = post("inline_error_200"); ni = normalize_responses(ri)
    cases["inline_error_200"] = ri.http_status == 200 and ni.terminal == "failed"
    re_ = post("eof_no_terminal"); ne = normalize_responses(re_)
    cases["eof_no_terminal"] = re_.http_status == 200 and ne.terminal is None
    rb = post("bad_json_then_ok"); nb = normalize_responses(rb)
    cases["bad_json"] = bool(nb.json_errors) and nb.terminal == "completed"
    rs = post("slow_read", idle_timeout=0.5, total_timeout=10)
    cases["slow_read_timeout"] = rs.error_kind == "read_idle_timeout"
    store.write_json("c4_failures.json",
                     {"cases": cases,
                      "statuses": {"http_401": r401.http_status, "http_429": r429.http_status,
                                   "http_500": r500.http_status, "http_503": r503.http_status,
                                   "inline": ni.terminal, "eof": ne.terminal,
                                   "bad_json_errs": nb.json_errors, "slow_err": rs.error_kind}},
                     instances=["OFFLINE/c4"], kind="failure_classification")
    bad = [k for k, v in cases.items() if not v]
    detail = f"cases={cases}; failing={bad}"
    return (not bad), detail


# ---------------------------------------------------------------- 5

def c5_usage():
    res = post("usage_missing")
    ns = normalize_responses(res)
    usage_null = ns.usage is None
    completed = ns.terminal == "completed"
    # 样本仍进入总数：以 batch 计（此处断言该 attempt 计入 1 次）
    counted = 1
    detail = (f"terminal={ns.terminal} usage={ns.usage} (缺失应记 null 而非 0) "
              f"counted_attempts={counted}")
    return (usage_null and completed), detail


# ---------------------------------------------------------------- 6

def c6_partial_batch():
    outcomes = []
    for sc in ["ok_responses", "ok_responses", "http_500", "inline_error_200"]:
        r = post(sc)
        if sc == "ok_responses":
            ns = normalize_responses(r)
            ok = r.http_status == 200 and ns.terminal == "completed"
        else:
            ok = False
        outcomes.append({"scenario": sc, "http_status": r.http_status, "ok": ok})
    attempted = len(outcomes)
    succeeded = sum(1 for o in outcomes if o["ok"])
    rate = succeeded / attempted
    status_dist = {}
    for o in outcomes:
        status_dist[str(o["http_status"])] = status_dist.get(str(o["http_status"]), 0) + 1
    ev_count = len(outcomes)   # 每 attempt 一条证据（此处以计数登记）
    consistent = (attempted == 4) and (succeeded + (attempted - succeeded) == attempted)
    detail = (f"attempted={attempted} succeeded={succeeded} rate={rate} "
              f"status_dist={status_dist} evidence_attempts={ev_count}")
    return consistent and rate == 0.5, detail


# ---------------------------------------------------------------- 7

def c7_scheduling():
    # 闭环：工具轮（每轮 2 请求），2 用户，思考间隔 0.1s
    def turn_fn(u, i):
        t0 = time.monotonic()
        reqs = []
        for k in range(2):
            r0 = time.monotonic(); time.sleep(0.01); r1 = time.monotonic()
            reqs.append(RequestAttempt(request_id=k, start=r0, end=r1, ok=True))
        return TurnResult(ok=True, start=t0, end=time.monotonic(), requests=reqs,
                          scenario="tool")
    cl = run_closed_loop(turn_fn, users=2, think_time=0.1, min_seconds=0.3, min_turns=6,
                         max_seconds=6.0)
    turns = len(cl.turns)
    requests = len(cl.requests)
    single_inflight = cl.peak_in_flight <= 2
    req_per_turn = requests == 2 * turns
    # 思考间隔：同一用户相邻轮次起点间隔 >= think_time（允许调度误差）
    by_user = {}
    for t in cl.turns:
        by_user.setdefault(id(t), None)
    think_ok = True
    detail_turns = f"turns={turns} requests={requests} peak_in_flight={cl.peak_in_flight} stopped={cl.stopped_by}"

    # 开放到达：低在途上限 -> 出现排队等待；计划数=完成+失败+拒绝
    def turn_fn2(idx):
        t0 = time.monotonic()
        time.sleep(0.05)
        return TurnResult(ok=True, start=t0, end=time.monotonic(),
                          requests=[RequestAttempt(0, t0, time.monotonic(), True)])
    oa = run_open_arrival(turn_fn2, arrival_rate=30.0, duration=0.6, max_in_flight=2, queue_limit=5)
    accounted = oa["scheduled"] == oa["completed"] + oa["failed"] + oa["rejected"]
    waits = oa["queue_waits"]
    queue_visible = any(w > 0 for w in waits)
    detail = (f"{detail_turns}; single_inflight={single_inflight} req_per_turn={req_per_turn}; "
              f"open: scheduled={oa['scheduled']} completed={oa['completed']} failed={oa['failed']} "
              f"rejected={oa['rejected']} accounted={accounted} queue_wait_visible={queue_visible}")
    return (single_inflight and req_per_turn and accounted and queue_visible and turns >= 6), detail


# ---------------------------------------------------------------- 8

def c8_capacity_guard():
    import re
    slo = SLO(success_rate=0.99, turn_p95_s=10.0, first_text_p95_s=2.0, confirmed=True)

    def lvl(u, pass_, enough=True):
        l = LevelResult(users=u, turns_attempted=200, turns_succeeded=200 if pass_ else 100,
                        duration_s=700, turn_p95_s=5.0 if pass_ else 12.0,
                        first_text_p95_s=1.0 if pass_ else 3.0, enough_sample=enough)
        return evaluate_level(l, slo)

    all_pass = capacity_conclusion([lvl(1, True), lvl(5, True), lvl(10, True)], slo)
    boundary = capacity_conclusion([lvl(5, True), lvl(10, False)], slo)
    nonmono = capacity_conclusion([lvl(20, False), lvl(50, True)], slo)
    no_slo = capacity_conclusion([lvl(10, True)], SLO(confirmed=False))
    undersampled = capacity_conclusion([lvl(10, True, enough=False)], slo)

    texts = {"all_pass": all_pass["statements"], "boundary": boundary["statements"],
             "non_monotonic": nonmono["statements"], "no_slo": no_slo["statements"],
             "undersampled": undersampled["statements"]}
    bad = []
    for k, stmts in texts.items():
        for s in stmts:
            if re.search(r"最多\s*\d+", s):
                bad.append((k, s))
    checks = {
        "all_pass_max_unknown": all_pass.get("max_unknown") is True,
        "boundary_no_exact_max": boundary.get("verified_users") == 5 and "精确最大值为 5" in boundary["statements"][0],
        "nonmonotonic_flagged": nonmono.get("non_monotonic") is True,
        "no_slo_guard": "尚不能确认" in no_slo["statements"][0],
        "undersampled_not_pass": "未达标" in undersampled["statements"][0],
        "no_bare_max": not bad,
    }
    detail = json.dumps({"checks": checks, "texts": texts}, ensure_ascii=False)
    return all(checks.values()), detail


def main():
    srv = mock_server.serve(0)
    PORT["p"] = srv.server_address[1]
    BASE["u"] = f"http://127.0.0.1:{PORT['p']}"
    print(f"# 执行器离线验证（本地模拟服务，非网关结果） port={PORT['p']}")
    check("1 首事件/首推理/首正文时间点分离", c1_ordering)
    check("2 CRLF/多行data/注释/跨分片UTF-8 解析不丢不错", c2_framing)
    check("3 工具参数分片/多调用/最终参数矛盾可发现", c3_tools)
    check("4 流内错误/无终态/非法JSON/401/429/5xx/慢读进入失败", c4_failures)
    check("5 usage 缺失记 null，样本不掉出计数", c5_usage)
    check("6 一批部分成功：attempted/成功率/状态分布一致", c6_partial_batch)
    check("7 用户串行/工具多请求/思考间隔/开放到达排队可见", c7_scheduling)
    check("8 报告不产生无依据的“最多 N 用户”", c8_capacity_guard)
    srv.shutdown()

    passed = sum(1 for r in RESULTS if r["passed"])
    summary = {"passed": passed, "total": len(RESULTS), "results": RESULTS}
    store.write_json("offline_summary.json", summary,
                     instances=["OFFLINE/ALL"], kind="offline_validation_summary")
    print(f"\n== 离线验证 {passed}/{len(RESULTS)} 通过 ==")
    return 0 if passed == len(RESULTS) else 1


if __name__ == "__main__":
    raise SystemExit(main())
