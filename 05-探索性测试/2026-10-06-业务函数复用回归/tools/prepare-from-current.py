"""Prepare a separate next-round task. Never operate TPT Work."""
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

root = Path(__file__).resolve().parent.parent
source = root.parent / '2026-10-06-运行时断言回归'
if any((root / '结果').glob('*.json')):
    raise SystemExit('Execution records exist; do not rebuild the task.')
if (root / '来源快照.json').exists():
    raise SystemExit('Task already prepared; retain its frozen source snapshot.')
for directory in ('用例', '夹具', '结果', '运行日志', '证据', '审核', 'code/business', 'code/automation'):
    (root / directory).mkdir(parents=True, exist_ok=True)
files = [
    '用例/cases.json', '用例/可选-时序专项.json',
    '用例/扩展夹具索引.json', '功能树.md', '场景顺序.md', '扩展场景与夹具.md',
    '结果格式.md', '执行契约.md', '审核指标.md',
    'tools/compare.cjs', 'tools/check-records.cjs', 'tools/record.cjs',
    'tools/prepare-fixtures.py', 'tools/link_fixture.py',
]
for directory in ('夹具/扩展', '夹具/skill-template', '夹具/expert-template',
                  '夹具/expert-missing-agent', '夹具/expert-bad-json'):
    files.extend(str(file.relative_to(source)).replace('\\', '/')
                 for file in sorted((source / directory).rglob('*')) if file.is_file())
manifest = []
for relative in files:
    original = source / relative
    data = original.read_bytes()
    target = root / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    manifest.append({'path': relative, 'source_sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)})
cases = json.loads((root / '用例/cases.json').read_text(encoding='utf-8'))
optional = json.loads((root / '用例/可选-时序专项.json').read_text(encoding='utf-8'))
snapshot = {
    'source_task': source.name,
    'captured_at': datetime.now(timezone.utc).isoformat(),
    'case_count': len(cases), 'assertion_count': sum(len(case['assertions']) for case in cases),
    'optional_count': len(optional), 'files': manifest,
    'note': '冻结当前用例与模板；未复制结果、运行环境、运行上下文、已安装样本或正在开发的脚本。等待当前轮完成后复盘。',
}
(root / '来源快照.json').write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
state = {'phase': '准备完成-等待当前轮复盘', 'execution_allowed': False,
         'case_review_pending': True, 'source_task': source.name,
         'case_count': len(cases), 'assertion_count': snapshot['assertion_count'],
         'optional_count': len(optional), 'review_notes': '待当前轮释放UI并完成用例调整审核；此时尚不启动。'}
(root / '任务状态.json').write_text(json.dumps(state, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
catalog = {'schema_version': '1.0', 'functions': [],
           'note': '当前轮业务函数尚未审核；这里不登记虚假的可调用能力。复盘时迁入合适函数，执行中能力缺失再补写。'}
(root / 'code/business/catalog.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({key: snapshot[key] for key in ('case_count', 'assertion_count', 'optional_count')}, ensure_ascii=False))
