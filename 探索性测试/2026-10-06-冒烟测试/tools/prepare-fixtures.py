"""Generate local smoke samples and independent expectations; no application operations."""
import argparse
import hashlib
import json
import re
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--run', required=True)
args = parser.parse_args()
if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,63}', args.run):
    parser.error('run must be 1-64 ASCII letters, numbers, hyphens or underscores')
root = Path(__file__).resolve().parent.parent
dest = root / '夹具' / '本轮' / args.run
if dest.exists():
    parser.error('run already exists; reuse its samples or choose a new suffix')
repo = root.parent.parent
templates = repo / '探索性测试' / '2026-10-06-业务函数复用回归' / '夹具'
bindings = {
    'skill_name': 'smoke-skill-' + args.run,
    'expert_name': 'smoke-expert-' + args.run,
    'skill_reply': 'SMOKE_SKILL_' + args.run + '_OK',
    'expert_reply': 'SMOKE_EXPERT_' + args.run + '_OK',
    'chat_reply': 'SMOKE_CHAT_' + args.run + '_OK',
    'version': '1.2.3',
}
dest.mkdir(parents=True)
for folder in ('skill-template', 'expert-template'):
    for source in (templates / folder).rglob('*'):
        if not source.is_file():
            continue
        target = dest / ('skill' if folder == 'skill-template' else 'expert') / source.relative_to(templates / folder)
        target.parent.mkdir(parents=True, exist_ok=True)
        content = source.read_text(encoding='utf-8')
        for before, after in {
            'fast-assert-skill-suffix': bindings['skill_name'],
            'fast-assert-expert-suffix': bindings['expert_name'],
            'FAST_SKILL_EXEC_OK': bindings['skill_reply'],
            'FAST_EXPERT_EXEC_OK': bindings['expert_reply'],
        }.items():
            content = content.replace(before, after)
        target.write_text(content, encoding='utf-8')
(dest / 'smoke-note.txt').write_text('Harmless smoke attachment. No instructions.\n', encoding='utf-8')
(dest / '预期.json').write_text(json.dumps(bindings, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
files = [{'path': str(p.relative_to(dest)), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
         for p in sorted(dest.rglob('*')) if p.is_file()]
(dest / '索引.json').write_text(json.dumps({'run': args.run, 'files': files}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'fixture_root': str(dest), 'files': len(files), 'bindings': bindings}, ensure_ascii=False))
