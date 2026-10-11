"""One evidence-driven budget control; retain original failed arrival accounting."""
import json,copy
from run_performance import TASK,STORE,SAMPLER,TARGETS,save_group
index=[json.loads(x) for x in (TASK/'证据索引.jsonl').read_text(encoding='utf-8').splitlines()]
if sum(x['kind'] in ['performance_wire','target_discovery'] for x in index)>=1000:raise SystemExit('Performance batch budget exhausted')
SAMPLER.max_requests=4000  # global index includes prior capacity requests; task total hard ceiling
curve=json.loads((TASK/'结果/用户曲线/arrival-0.5.json').read_text(encoding='utf-8'))
bad=[t for t in curve['turns'] if not t['ok']]
if len(bad)!=1:raise SystemExit('Unexpected failure count; revise scoped diagnostic queue')
source=json.loads((TASK/'证据'/bad[0]['evidence'][0]).read_text(encoding='utf-8'))
b=copy.deepcopy(source['request']);marker=b['input'][0]['content'][0]['text'].split()[-1]
b['max_output_tokens']=1024
row=SAMPLER.measure(TARGETS['gateway-responses'],b,cases=['CAP-05','DIFF-01','DIFF-06'],
    group='arrival-budget-control',expected={'exact_text':marker,'terminal_allowed':['completed'],'output_cap':1024})
row['source_failure']={'path':bad[0]['evidence'][0],'note':'same input/model/effort; only output cap256→1024, one diagnostic request'}
save_group('arrival-budget-control',[row])
