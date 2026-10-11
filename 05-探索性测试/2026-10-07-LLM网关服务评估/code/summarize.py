"""汇总：把 结果/*.json 的每个实例取最新一次，写 结果/汇总.json（供报告引用）。

同实例多次运行以“最新一次”为准（历史文件保留）；标注被取代的旧结果。
用法：python code/summarize.py
"""
import glob
import json
import os
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES = os.path.join(ROOT, "结果")


def main():
    latest = {}
    superseded = []
    for p in sorted(glob.glob(os.path.join(RES, "*.json"))):
        if os.path.basename(p) == "汇总.json":
            continue
        d = json.load(open(p, encoding="utf-8"))
        for i in d["instances"]:
            iid = i["instance_id"]
            if iid in latest:
                superseded.append({"instance_id": iid, "superseded_file": os.path.basename(p)})
            latest[iid] = {"file": os.path.basename(p), "status": i["status"],
                           "item": i["item"], "assertions": i["assertions"],
                           "notes": i["notes"], "evidence": i["evidence"]}
    counts = Counter(v["status"] for v in latest.values())
    by_item = {}
    for iid, v in sorted(latest.items()):
        by_item.setdefault(v["item"], []).append(iid)
    out = {"counts": dict(counts), "instances": latest,
           "superseded": superseded, "items_seen": sorted(by_item)}
    with open(os.path.join(RES, "汇总.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print("status counts:", dict(counts))
    print("instances:", len(latest), "superseded:", len(superseded))
    print("->", os.path.join(RES, "汇总.json"))


if __name__ == "__main__":
    main()
