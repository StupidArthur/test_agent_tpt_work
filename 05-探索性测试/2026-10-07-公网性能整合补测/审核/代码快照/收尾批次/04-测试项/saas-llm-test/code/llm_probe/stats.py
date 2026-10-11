"""统计、SLO 与容量结论守卫。

口径来自 docs/03-指标与容量.md：
- p95 使用排序后最近秩 ceil(0.95*n)；
- 成功率 = 通过全部必需断言的请求/轮次 ÷ 全部正式尝试；
- usage 缺失记 null，不能填 0；
- 并发请求数不能改称用户数。
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Optional


def percentile(values, q: float) -> Optional[float]:
    """最近秩 ceil(q*n)。values 需可排序；空返回 None。"""
    xs = sorted(v for v in values if v is not None)
    if not xs:
        return None
    n = len(xs)
    rank = max(1, math.ceil(q * n))
    return xs[min(rank, n) - 1]


@dataclass
class Distribution:
    n: int
    mean: Optional[float]
    p50: Optional[float]
    p95: Optional[float]
    min: Optional[float]
    max: Optional[float]

    def to_dict(self) -> dict:
        return {"n": self.n, "mean": self.mean, "p50": self.p50, "p95": self.p95,
                "min": self.min, "max": self.max}


def summarise(values) -> Distribution:
    xs = [v for v in values if v is not None]
    if not xs:
        return Distribution(0, None, None, None, None, None)
    return Distribution(
        n=len(xs),
        mean=round(sum(xs) / len(xs), 6),
        p50=round(percentile(xs, 0.50), 6),
        p95=round(percentile(xs, 0.95), 6),
        min=round(min(xs), 6),
        max=round(max(xs), 6),
    )


@dataclass
class SLO:
    success_rate: Optional[float] = None      # 例 0.99
    turn_p95_s: Optional[float] = None
    first_text_p95_s: Optional[float] = None
    confirmed: bool = False

    def to_dict(self) -> dict:
        return {"success_rate": self.success_rate, "turn_p95_s": self.turn_p95_s,
                "first_text_p95_s": self.first_text_p95_s, "confirmed": self.confirmed}


@dataclass
class LevelResult:
    users: int
    turns_attempted: int = 0
    turns_succeeded: int = 0
    requests_attempted: int = 0
    requests_succeeded: int = 0
    peak_in_flight: int = 0
    duration_s: float = 0.0
    turn_p95_s: Optional[float] = None
    first_text_p95_s: Optional[float] = None
    success_rate: Optional[float] = None
    rate_limited: int = 0
    errors: dict = field(default_factory=dict)
    client_bottleneck: bool = False
    enough_sample: bool = False
    meets_slo: Optional[bool] = None
    notes: list = field(default_factory=list)

    def to_dict(self) -> dict:
        return self.__dict__.copy()


def evaluate_level(level: LevelResult, slo: SLO) -> LevelResult:
    """按固定 SLO 判定档位；样本不足/取值缺失 → 不合格（未达成，不判通过）。"""
    if level.turns_attempted > 0:
        level.success_rate = level.turns_succeeded / level.turns_attempted
    if not slo.confirmed:
        level.meets_slo = None
        level.notes.append("SLO 未确认，仅测量")
        return level
    checks = []
    if slo.success_rate is not None and level.success_rate is not None:
        checks.append(level.success_rate >= slo.success_rate)
    if slo.turn_p95_s is not None and level.turn_p95_s is not None:
        checks.append(level.turn_p95_s <= slo.turn_p95_s)
    if slo.first_text_p95_s is not None and level.first_text_p95_s is not None:
        checks.append(level.first_text_p95_s <= slo.first_text_p95_s)
    if not checks:
        level.meets_slo = None
        level.notes.append("SLO 项无可比较取值")
        return level
    level.meets_slo = all(checks) and level.enough_sample and not level.client_bottleneck
    if not level.enough_sample:
        level.notes.append("样本不足，不得判通过")
    return level


def capacity_conclusion(levels, slo: SLO, credential_mode: str = "单 key"):
    """生成受证据约束的用户容量结论句。绝不产出“最多 N 用户”这种无边界断言。"""
    out = {"statements": [], "verified_users": None, "boundary": None,
           "non_monotonic": False, "max_unknown": False}
    if not slo.confirmed:
        out["statements"].append("无已确认 SLO：仅有观测数据，尚不能确认可支持用户数。")
        return out
    ordered = sorted(levels, key=lambda l: l.users)
    passed = [l for l in ordered if l.meets_slo is True]
    failed = [l for l in ordered if l.meets_slo is False]
    # 非单调：大档通过而小档失败
    for i, l in enumerate(ordered):
        later_pass = [x for x in ordered[i + 1:] if x.meets_slo is True]
        if l.meets_slo is False and later_pass:
            out["non_monotonic"] = True
            out["statements"].append(
                f"非单调：{l.users} 档未达标而更高 {later_pass[-1].users} 档通过，不能直接认作可靠容量。")
            break
    if not passed:
        out["statements"].append("所有已测档位均未达标：尚不能确认可支持用户数。")
        return out
    if failed:
        u = max(l.users for l in passed)
        f = min(l.users for l in failed if l.users > u) if any(l.users > u for l in failed) else None
        out["verified_users"] = u
        out["boundary"] = [u, f]
        out["statements"].append(
            f"在负载 L、SLO S、凭据模式 {credential_mode} 下，当前已验证 {u} 同时活跃用户；"
            + (f"{f} 用户未满足某项 SLO，边界位于已测档位之间，不能声称精确最大值为 {u}。"
               if f else "更高档位未达失败，最大值未知。"))
        return out
    top = max(l.users for l in passed)
    out["verified_users"] = top
    out["max_unknown"] = True
    out["statements"].append(
        f"在负载 L、SLO S、凭据模式 {credential_mode} 下，已持续验证到 {top} 同时活跃用户；"
        "更高未测，最大值未知。")
    return out
