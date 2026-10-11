"""生成原始证据索引：逐请求证据（在 wave JSON 内）+ 文件哈希。

逐请求证据位于 results/{simple-text,agent-tool}/w*.json 的 turns[].requests[]；
本脚本为每个 wave 文件与其 SHA-256、以及代码文件哈希建立索引。
"""
import hashlib, json
from pathlib import Path

TASK = Path(__file__).resolve().parents[1]


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest().upper()


def main():
    entries = []
    for sub in ('simple-text', 'agent-tool'):
        for p in sorted((TASK / 'results' / sub).glob('w*.json')):
            d = json.loads(p.read_text(encoding='utf-8'))
            entries.append({
                'path': p.relative_to(TASK).as_posix(),
                'sha256': sha(p),
                'workload': d['workload'], 'concurrency': d['planned_concurrency'],
                'attempted': d['attempted_turns'], 'successful': d['successful'],
                'requests_evidence': 'turns[].requests[] (request/status/frames/normalized/timings)',
            })
    code_hashes = {}
    for p in sorted((TASK / 'code').glob('*.py')):
        code_hashes[p.name] = sha(p)
    out = {'wave_evidence': entries, 'code_sha256': code_hashes}
    (TASK / 'evidence').mkdir(exist_ok=True)
    (TASK / 'evidence' / '原始证据索引.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    (TASK / 'code' / 'CODE_SHA256.json').write_text(json.dumps(code_hashes, ensure_ascii=False, indent=2), encoding='utf-8')
    print('indexed', len(entries), 'wave files;', len(code_hashes), 'code files')


if __name__ == '__main__':
    main()
