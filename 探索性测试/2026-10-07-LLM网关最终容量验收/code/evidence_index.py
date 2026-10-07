"""Build evidence-index.jsonl (path + SHA-256 + kind) for the acceptance task."""
import hashlib, json
from pathlib import Path

TASK = Path(__file__).resolve().parents[1]


def main():
    rows = []
    for p in sorted(TASK.rglob('*')):
        if not p.is_file() or p.name in ('evidence-index.jsonl',):
            continue
        rel = p.relative_to(TASK).as_posix()
        if rel.startswith('运行日志/'):
            kind = 'runlog'
        elif rel.startswith('results/standard-agent/wire/'):
            kind = 'agent_wire'
        elif rel.startswith('results/'):
            kind = 'result'
        elif rel.startswith('code/'):
            kind = 'code'
        else:
            kind = 'doc'
        rows.append({'path': rel, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest().upper(), 'kind': kind})
    (TASK / 'evidence-index.jsonl').write_text('\n'.join(json.dumps(r, ensure_ascii=False) for r in rows), encoding='utf-8')
    print('indexed', len(rows), 'files')


if __name__ == '__main__':
    main()
