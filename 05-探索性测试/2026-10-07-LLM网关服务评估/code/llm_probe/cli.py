"""命令行：列用例、按模块/编号/目标执行、落盘结果与证据。

用法（在任务目录下）：
  python -m llm_probe list
  python -m llm_probe run --module api --target tpt-gateway-public
  python -m llm_probe run --module api --items API-01,API-02,API-07
  python -m llm_probe report
"""
from __future__ import annotations

import argparse
import datetime as _dt
import json
import os
import sys
import time

from . import runner
from .evidence import EvidenceStore
from .report import generate_report, validate_delivery

HERE = os.path.dirname(os.path.abspath(__file__))
CODE_DIR = os.path.dirname(HERE)
TASK_DIR = os.path.dirname(CODE_DIR)

# 估算每个实例的请求数（用于“明确显示预计请求数”）
EST_REQUESTS = {
    "API-01": 1, "API-02": 1, "API-03": 1, "API-04": 2, "API-05": 3, "API-06": 3,
    "API-07": 2, "API-08": 3, "API-09": 1, "API-10": 1,
    "TPT-01": 1, "TPT-03": 1, "TPT-06": 4, "TPT-08": 1, "TPT-09": 3,
    "PERF-01": 30, "PERF-03": 10,
    "CAP-01": 186, "CAP-02": 0, "CAP-05": 0,
}


def load_config(path=None):
    path = path or os.path.join(TASK_DIR, "配置快照.json")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def make_target(cfg, name, env=None):
    for t in cfg["targets"]:
        if t["name"] == name:
            return runner.Target(t, env=env)
    raise SystemExit(f"unknown target: {name}")


def cmd_list(args):
    cfg = load_config(args.config)
    for module, table in runner.MODULES.items():
        print(f"# module={module}")
        for item in sorted(table):
            print(f"  {item:8s} instances=1  est_requests={EST_REQUESTS.get(item, '?')}")
    print(f"# 条件项(未内置运行器，需隔离/声明/冻结): {', '.join(runner.CONDITIONAL_ITEMS)}")
    print("# CAP-03/04/06 新入口: capacity --target <name> --plan-file <confirmed-plan.json>; 默认仅预览，--execute 才发请求")
    print(f"# targets: {', '.join(t['name'] for t in cfg['targets'])}")
    return 0


def cmd_run(args):
    cfg = load_config(args.config)
    target = make_target(cfg, args.target)
    opts = dict(cfg.get("run_options", {}))
    opts.update({k: v for k, v in vars(args).items() if v is not None and k not in ("config",)})
    if isinstance(opts.get("users"), str):
        opts["users"] = [int(x) for x in opts["users"].split(",") if x.strip()]
    if isinstance(opts.get("burst_levels"), str):
        opts["burst_levels"] = [int(x) for x in opts["burst_levels"].split(",") if x.strip()]
    if opts.get("slo") is None:
        opts["slo"] = cfg["run_options"].get("slo", {})
    store = EvidenceStore(os.path.join(TASK_DIR, "证据"))
    if not target.key:
        print(f"[warn] 环境变量 {target.api_key_env} 未设置，凭据缺失（鉴权项会如实反映 401/连接错误）")

    items = args.items.split(",") if args.items else sorted(runner.MODULES.get(args.module, {}))
    ts = _dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    log_dir = os.path.join(TASK_DIR, "运行日志")
    os.makedirs(log_dir, exist_ok=True)
    log_path = os.path.join(log_dir, f"run-{ts}.jsonl")

    est = sum(EST_REQUESTS.get(i, 1) for i in items) * max(1, len(target.models) or 1)
    print(f"# target={target.name} module={args.module} items={items} est_requests≈{est}")
    results = []
    t0 = time.monotonic()
    with open(log_path, "a", encoding="utf-8", newline="\n") as log:
        log.write(json.dumps({"event": "start", "target": target.name, "module": args.module,
                              "items": items, "est_requests": est, "ts": ts,
                              "key_present": bool(target.key)}) + "\n")
        # 每项单独执行，便于中断恢复
        for item in items:
            got = runner.run(target, args.module, [item], store, opts)
            for r in got:
                results.append(r.to_dict())
                log.write(json.dumps({"event": "instance", "instance_id": r.instance_id,
                                      "status": r.status}) + "\n")
                print(f"  {r.status:4s} {r.instance_id}")
    out = {
        "run": {"target": target.name, "module": args.module, "items": items, "ts": ts,
                "est_requests": est, "seconds": round(time.monotonic() - t0, 3),
                "key_present": bool(target.key), "base_url": target.base_url},
        "instances": results,
    }
    res_dir = os.path.join(TASK_DIR, "结果")
    os.makedirs(res_dir, exist_ok=True)
    out_path = os.path.join(res_dir, f"{target.name}_{args.module}_{ts}.json")
    with open(out_path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"-> {out_path}")
    return 0


def cmd_report(args):
    cfg = load_config(args.config)
    path = generate_report(TASK_DIR, cfg)
    checks = validate_delivery(TASK_DIR)
    print(f"-> {path}")
    for name, ok, detail in checks:
        print(f"[{'OK' if ok else 'WARN'}] {name}: {detail}")
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(prog="llm_probe")
    ap.add_argument("--config", default=None)
    sub = ap.add_subparsers(dest="cmd", required=True)

    sub.add_parser("list")

    r = sub.add_parser("run")
    r.add_argument("--module", required=True, choices=list(runner.MODULES))
    r.add_argument("--target", required=True)
    r.add_argument("--items", default=None)
    r.add_argument("--samples", type=int, default=None)
    r.add_argument("--warmup", type=int, default=None)
    r.add_argument("--think-time", dest="think_time", type=float, default=None)
    r.add_argument("--min-seconds", dest="min_seconds", type=float, default=None)
    r.add_argument("--min-turns", dest="min_turns", type=int, default=None)
    r.add_argument("--max-seconds", dest="max_seconds", type=float, default=None)
    r.add_argument("--arrival-rate", dest="arrival_rate", type=float, default=None)
    r.add_argument("--duration", type=float, default=None)
    r.add_argument("--users", default=None, help="逗号分隔的用户档位，如 1,5")
    r.add_argument("--burst-levels", dest="burst_levels", default=None, help="逗号分隔的并发档位")
    r.add_argument("--max-in-flight", dest="max_in_flight", type=int, default=None)
    r.add_argument("--queue-limit", dest="queue_limit", type=int, default=None)

    sub.add_parser("report")

    cap = sub.add_parser("capacity", help="preview confirmed-plan capacity suite; no requests without --execute")
    cap.add_argument("--target", required=True)
    cap.add_argument("--plan-file", required=True)
    cap.add_argument("--execute", action="store_true")

    args = ap.parse_args(argv)
    if args.cmd == "list":
        return cmd_list(args)
    if args.cmd == "run":
        return cmd_run(args)
    if args.cmd == "report":
        return cmd_report(args)
    if args.cmd == "capacity":
        from . import capacity_suite
        with open(args.plan_file, encoding="utf-8") as f:
            plan = json.load(f)
        if not args.execute:
            print(json.dumps(capacity_suite.preview(plan), ensure_ascii=False, indent=2))
            return 0
        cfg = load_config(args.config)
        target = make_target(cfg, args.target)
        store = EvidenceStore(os.path.join(TASK_DIR, "证据"))
        result = capacity_suite.execute(target, store, plan)
        out_dir = os.path.join(TASK_DIR, "结果", "容量复核")
        os.makedirs(out_dir, exist_ok=True)
        dest = os.path.join(out_dir, result['run_id'] + '.json')
        with open(dest, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(json.dumps({'result': dest, 'requests_sent': result['requests_sent']}, ensure_ascii=False))
        return 0
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
