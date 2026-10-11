"""Build evidence-index.json: every artifact path + SHA-256 + owning case."""
import hashlib, json
from pathlib import Path

TASK = Path(__file__).resolve().parents[1]


def case_of(rel):
    name = Path(rel).name
    if name.startswith(('wave-', 'long-', 'recovery-')):
        return Path(name).stem
    if rel.startswith('code/'):
        return 'CODE'
    return 'GW-SLO-BOUNDARY'


def main():
    index = []
    for p in sorted(TASK.rglob('*')):
        if not p.is_file():
            continue
        rel = p.relative_to(TASK).as_posix()
        if rel == 'evidence-index.json':
            continue
        index.append({'path': rel, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest().upper(),
                      'case': case_of(rel)})
    (TASK / 'evidence-index.json').write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding='utf-8')
    print('indexed', len(index), 'files')


if __name__ == '__main__':
    main()
