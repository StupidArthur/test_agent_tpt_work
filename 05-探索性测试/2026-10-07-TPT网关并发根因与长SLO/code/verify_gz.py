"""Verify each stored .sse.gz decompresses to the recorded response_sha256."""
import gzip, hashlib, json
from pathlib import Path

TASK = Path(__file__).resolve().parents[1]


def main():
    issues, checked = [], 0
    for pat in ('wave-*.json', 'long-*.json', 'recovery-*.json'):
        for p in sorted(TASK.glob(pat)):
            d = json.loads(p.read_text(encoding='utf-8'))
            for r in d.get('rows', []):
                rp = TASK / r['response_path']
                if not rp.exists():
                    issues.append({'id': r['id'], 'issue': 'missing_file'})
                    continue
                got = hashlib.sha256(gzip.decompress(rp.read_bytes())).hexdigest().upper()
                checked += 1
                if got != r.get('response_sha256'):
                    issues.append({'id': r['id'], 'issue': 'hash_mismatch'})
    print(json.dumps({'checked': checked, 'issue_count': len(issues), 'issues': issues[:20]}, ensure_ascii=False))
    (TASK / 'code' / 'verify_result.json').write_text(json.dumps({'checked': checked, 'issues': issues}, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
