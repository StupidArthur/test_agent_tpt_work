from pathlib import Path
import hashlib
import json

task = Path(__file__).resolve().parents[1]
root = task.parents[1]
sources = json.loads((task / '审核/来源SHA256.json').read_text(encoding='utf-8'))
issues = []
for name, expected in sources.items():
    actual = hashlib.sha256((root / name).read_bytes()).hexdigest()
    if actual != expected:
        issues.append({'file': name, 'expected': expected, 'actual': actual})
rows = json.loads((task / '审核/逐项处置.json').read_text(encoding='utf-8'))
if isinstance(rows, dict):
    rows = rows.get('cases', rows.get('rows', rows.get('results', [])))
result = {'source_files_checked': len(sources), 'reviewed_results': len(rows), 'issues': issues}
(task / '审核/收尾核对.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
if issues or len(rows) != 158:
    raise SystemExit(json.dumps(result, ensure_ascii=False))
files = [p for p in task.rglob('*') if p.is_file() and p.name != '交付SHA256.json']
files += [root / p for p in [
    'tools/ui-operations/business/fixtures/cleanup.mjs',
    'tools/ui-operations/automation/settings.mjs',
    'tools/ui-operations/business/catalog.json',
    'tools/ui-operations/business/discovery.json',
    'tools/ui-operations/verification.json',
]]
manifest = {p.relative_to(root).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(files)}
(task / '审核/交付SHA256.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(result, ensure_ascii=False))
