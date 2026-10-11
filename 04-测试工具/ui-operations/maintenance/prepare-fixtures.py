"""Create unique local fixtures; never operate the application."""
import argparse
import hashlib
import json
import re
from pathlib import Path
import zipfile

library = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--run', required=True, help='Unique ASCII suffix, e.g. 20261006-agent2')
parser.add_argument('--task-root', required=True)
args = parser.parse_args()
root = Path(args.task_root).resolve()
if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,63}', args.run):
    parser.error('run must be 1–64 ASCII letters, numbers, hyphens or underscores')
source = library / 'fixtures/templates/扩展'
dest = root / '夹具/本轮' / args.run
if dest.exists():
    parser.error('run directory already exists; reuse its fixtures or choose a new suffix')
for file in source.rglob('*'):
    if not file.is_file():
        continue
    output = dest / file.relative_to(source)
    output.parent.mkdir(parents=True, exist_ok=True)
    data = file.read_bytes()
    if file.suffix in ('.md', '.json', '.txt'):
        data = data.decode('utf-8').replace('RUN', args.run).encode('utf-8')
    output.write_bytes(data)
for template, directory in [('skill-template', 'skill-src'), ('expert-template', 'expert-src'),
                             ('expert-missing-agent', 'expert-missing-agent'), ('expert-bad-json', 'expert-bad-json')]:
    for file in (library / 'fixtures/templates' / template).rglob('*'):
        if not file.is_file():
            continue
        output = dest / directory / file.relative_to(library / 'fixtures/templates' / template)
        output.parent.mkdir(parents=True, exist_ok=True)
        data = file.read_bytes()
        if file.suffix in ('.md', '.json', '.txt'):
            data = data.decode('utf-8').replace('RUN', args.run).replace('-suffix', '-' + args.run).encode('utf-8')
        output.write_bytes(data)
zip_dir = dest / 'zips'
zip_dir.mkdir()
for package in (dest / 'packages').iterdir():
    if not package.is_dir():
        continue
    with zipfile.ZipFile(zip_dir / (package.name + '.zip'), 'w', zipfile.ZIP_DEFLATED) as archive:
        for file in sorted(package.rglob('*')):
            if file.is_file():
                archive.write(file, file.relative_to(package).as_posix())
bindings = {
    'extension_run': args.run,
    'extension_fixture_root': str(dest),
    'attachment_long_name': 'fast-assert-long-filename-for-layout-and-tooltip-complete-name-regression.txt',
    'variant_cn_tech_name': 'fast-assert-cn-tech-' + args.run,
    'collection_expected_names': ['fast-assert-collection-one-' + args.run],
    'mixed_expected_status': {
        'fast-assert-mixed-valid-' + args.run: '成功',
        'fast-assert-root-' + args.run: '跳过',
        'fast-assert-mixed-invalid-' + args.run: '失败',
    },
}
# These are fixture-defined expectations, not observations of the product.
(dest / '预期绑定.json').write_text(json.dumps(bindings, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
manifest = [{
    'path': str(file.relative_to(root)).replace('\\', '/'),
    'sha256': hashlib.sha256(file.read_bytes()).hexdigest(),
} for file in sorted(dest.rglob('*')) if file.is_file()]
(dest / '夹具索引.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'fixture_root': str(dest), 'files': len(manifest), 'expected_bindings': str(dest / '预期绑定.json')}, ensure_ascii=False))
