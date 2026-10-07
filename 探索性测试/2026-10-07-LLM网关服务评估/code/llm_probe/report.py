"""报告生成与交付自查（离线，不发请求）。"""
from __future__ import annotations

import glob
import json
import os
import re

from .evidence import sha256_file

SECRET_RE = re.compile(r"sk-[A-Za-z0-9_\-]{20,}")


def _load_results(task_dir):
    out = []
    for p in sorted(glob.glob(os.path.join(task_dir, "结果", "*.json"))):
        try:
            with open(p, encoding="utf-8") as f:
                out.append((p, json.load(f)))
        except Exception:  # noqa: BLE001
            continue
    return out


def _load_index(task_dir):
    recs = []
    p = os.path.join(task_dir, "证据索引.jsonl")
    if os.path.exists(p):
        with open(p, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        recs.append(json.loads(line))
                    except Exception:  # noqa: BLE001
                        pass
    return recs


def generate_report(task_dir, cfg=None):
    results = _load_results(task_dir)
    index = _load_index(task_dir)
    counts = {"通过": 0, "失败": 0, "不确定": 0, "未验证": 0}
    attempts = 0
    instance_rows = []
    for path, data in results:
        for inst in data.get("instances", []):
            st = inst.get("status", "未验证")
            counts[st] = counts.get(st, 0) + 1
            attempts += len(inst.get("attempts", []))
            instance_rows.append((inst.get("instance_id"), inst.get("item"), st))

    lines = []
    lines.append("# LLM 网关服务评估 —— 报告（自动生成）\n")
    lines.append("> 本报告由 `code/llm_probe report` 离线生成；不发起任何网络请求。\n")
    lines.append("## 1. 范围与环境\n")
    lines.append("- 对象：测试机 → 网关 → 上游 这条路径的客户端可观测 API 表现；不含软件 UI/登录/设置。")
    lines.append("- 本轮真实网关状态：见 `环境与负载.md` 与 `运行日志/`（历史公网地址返回 502，另两条候选不可达）。")
    lines.append("- 代码：`code/`（Python 3.11 标准库）；离线验证见 `证据/离线验证/offline_summary.json`。\n")
    lines.append("## 2. 完整性\n")
    lines.append(f"- 结果文件数：{len(results)}；实例行：{len(instance_rows)}")
    lines.append(f"- 状态分布：{counts}")
    lines.append(f"- 累计 attempt：{attempts}")
    lines.append(f"- 证据条目（索引）：{len(index)}")
    lines.append("- 说明：36 是测试项数，不是请求数；状态分布不能合成一个“case 全通过”数。\n")
    lines.append("## 3. 实例明细\n")
    lines.append("| 实例 | 测试项 | 状态 |")
    lines.append("|---|---|---|")
    for iid, item, st in instance_rows:
        lines.append(f"| {iid} | {item} | {st} |")
    lines.append("")
    lines.append("## 4. 性能\n")
    lines.append("- 见 `结果/perf_*.json` 的 metrics（SLO 未确认，只出测量，不出达标结论）。\n")
    lines.append("## 5. 容量\n")
    lines.append("- 见 `结果/cap_*.json` 的 `capacity_conclusion`；并发请求数不改称用户数；SLO 未确认不出可达用户数。\n")
    lines.append("## 6. 差异（候选问题）\n")
    lines.append("- 真实网关可达性：候选环境问题，见运行日志。\n")
    lines.append("## 7. 未验证与补测\n")
    lines.append("- 条件项（隔离环境缺失）：API-11、API-12、TPT-10 相应故障实例。")
    lines.append("- 需有效凭据与可达网关：全部真实 API/TPT/PERF/CAP 实例。")
    lines.append("- 图片/JSON/思考档/长上下文等：需目录能力声明与冻结样本。\n")
    lines.append("## 8. 恢复与交付\n")
    lines.append("- 未对真实网关发起负载；无遗留负载进程。")
    lines.append("- 证据哈希见 `证据索引.jsonl`；脱敏仅移除凭据。\n")
    lines.append("_生成时间：见文件 mtime；范围不超过已测范围。_\n")

    path = os.path.join(task_dir, "报告.md")
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines))
    return path


def validate_delivery(task_dir):
    checks = []
    index = _load_index(task_dir)
    # 1) 证据存在且哈希一致
    missing, mismatch = [], []
    for rec in index:
        p = os.path.join(task_dir, "证据", rec["rel_path"])
        if not os.path.exists(p):
            missing.append(rec["rel_path"])
        elif sha256_file(p) != rec["sha256"]:
            mismatch.append(rec["rel_path"])
    checks.append(("证据存在", not missing, f"missing={missing}"))
    checks.append(("证据哈希一致", not mismatch, f"mismatch={mismatch}"))
    # 2) 证据无明文密钥
    leaked = []
    for rec in index:
        p = os.path.join(task_dir, "证据", rec["rel_path"])
        if os.path.exists(p):
            try:
                txt = open(p, encoding="utf-8", errors="ignore").read()
                if SECRET_RE.search(txt):
                    leaked.append(rec["rel_path"])
            except Exception:  # noqa: BLE001
                pass
    checks.append(("证据无明文密钥", not leaked, f"leaked={leaked}"))
    # 3) 结果文件状态字段完整
    bad = []
    for path, data in _load_results(task_dir):
        for inst in data.get("instances", []):
            if not inst.get("status"):
                bad.append(path)
    checks.append(("结果状态完整", not bad, f"bad={bad}"))
    # 4) 失效尝试进入计数（attempts 中错误被记录）
    dropped = []
    for path, data in _load_results(task_dir):
        for inst in data.get("instances", []):
            for a in inst.get("attempts", []):
                if a.get("error_kind") is None and a.get("http_status") is None:
                    dropped.append(inst.get("instance_id"))
    checks.append(("失败尝试有记录", not dropped, f"dropped={dropped}"))
    return checks
