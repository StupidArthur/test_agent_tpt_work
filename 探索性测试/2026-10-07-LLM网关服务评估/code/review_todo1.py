"""Manager's offline corrections; snapshot old bytes, never issue HTTP requests."""
from pathlib import Path
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parent.parent
SUB = ROOT / '补测/todo_1'
ARCHIVE = SUB / '管理者修订前快照'
ARCHIVE.mkdir(exist_ok=True)
manifest = []

def save(file, text):
    raw = file.read_bytes()
    relative = file.relative_to(ROOT)
    old = ARCHIVE / relative
    old.parent.mkdir(parents=True, exist_ok=True)
    if not old.exists():old.write_bytes(raw)
    file.write_text(text, encoding='utf-8', newline='\n')
    manifest.append(dict(path=str(relative).replace('\\','/'),
        before_snapshot=str(old.relative_to(ROOT)).replace('\\','/'),
        before_sha256=hashlib.sha256(old.read_bytes()).hexdigest(),
        after_sha256=hashlib.sha256(file.read_bytes()).hexdigest(),
        kind='offline document correction; no new gateway request'))

coverage = (SUB/'36项覆盖表.md').read_text(encoding='utf-8')
counts = dict(complete=0, partial=0, unverified=0)
for line in coverage.splitlines():
    if re.match(r'\| (API|TPT|PERF|CAP)-\d',line):
        status=line.split('|')[3].strip()
        counts['complete' if status.startswith('完整') else 'partial' if status.startswith('部分') else 'unverified'] += 1
assert sum(counts.values()) == 36
for name in ('检查清单.md','复核报告.md','复核结果.json','36项覆盖表.md'):
    file=SUB/name;text=file.read_text(encoding='utf-8')
    text=text.replace('完整实测 16、部分实测 15、未验证 6（含子项拆分）','完整实测 15、部分实测 13、未验证 8（36 个主项，子项另列）')
    text=text.replace('16 完整 / 15 部分 / 6 未验证（含子项）','15 完整 / 13 部分 / 8 未验证')
    text=text.replace('完整 16/部分 15/未验证 6','完整 15/部分 13/未验证 8')
    text=text.replace('该测试项全部必需断言在本轮取得实际值并满足','该测试项全部必需断言取得实际值；是否符合预期另行判定')
    text=text.replace('性能/容量 output token 口径含隐藏推理，报告须标注','性能/容量吞吐按服务返回的总 output_tokens 计算，组成语义待确认')
    text=text.replace('空正文=预算被隐藏推理占满','终态原因是 max_output_tokens，预算组成未确认')
    if name.endswith('.md'):
        text+='\n\n管理者修订：统计按36个主项重算为15/13/8；计量组成尚未确认。修改前字节见管理者修订前快照，未重新执行网关请求。\n'
    else:
        obj=json.loads(text);obj['manager_revision']={'coverage_counts':counts,'new_requests':0,'reason':'counts and metering wording corrected; old bytes archived'}
        text=json.dumps(obj,ensure_ascii=False,indent=2)
    save(file,text)

file=ROOT/'候选问题.json';obj=json.loads(file.read_text(encoding='utf-8'))
obj['管理者复核_20261007']=[
 dict(id='DIFF-01',result='计量语义待确认',judgement='吞吐采用服务返回总 output_tokens；是否包含隐藏推理以及细分口径未确认。'),
 dict(id='DIFF-06',result='已观察达限空正文',judgement='status=incomplete、reason=max_output_tokens；不推断预算被哪一类token占满。'),
 dict(id='DIFF-08',result='结构差异观察，未确认缺陷',judgement='可选字段、推理形态、opaque ID 格式不同不足以判缺陷；需对应契约及实际消费者要求。')]
save(file,json.dumps(obj,ensure_ascii=False,indent=2))
(SUB/'管理者修订索引.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')

for workload,item in [('text','CAP-02'),('tool','CAP-03')]:
    plan=dict(confirmed=False,approval_reference=None,workload=workload,model='flash',effort='low',
        max_requests=30000,max_users=20,output_tokens=256,tool_output_tokens=128,
        baseline_turns=10,think_time=5,recovery_tolerance=.2,
        connect_timeout=10,idle_timeout=60,total_timeout=180,
        slo=dict(confirmed=False,success_rate=.99,turn_p95_s=10,first_text_p95_s=2),
        stages=[dict(item=item,users=[1,5,10,20],windows=1,min_seconds=120,min_turns=30,max_seconds=600),
                dict(item='CAP-04',users=[10,20],windows=2,min_seconds=600,min_turns=100,max_seconds=900),
                dict(item='CAP-06',users=[20],windows=1,min_seconds=120,min_turns=30,max_seconds=600)])
    (SUB/f'容量执行计划-{workload}-待确认.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(dict(coverage=counts,archived=len(manifest),new_gateway_requests=0),ensure_ascii=False))
