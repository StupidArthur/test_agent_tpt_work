"""Ten real short requests, serial; reusable measurement library, no retries."""
import json,sys,hashlib
from pathlib import Path
TASK=Path(__file__).resolve().parents[1]
ROOT=TASK.parents[1]
sys.path.insert(0,str(ROOT/'04-测试项/saas-llm-test/code'))
from llm_probe.runner import Target
from llm_probe.evidence import EvidenceStore
from llm_probe.performance import Sampler,aggregate
from llm_probe.protocol import chat_body
cfg=json.loads((ROOT/'04-测试项/saas-llm-test/archive/v1/llm-bench-kit/config.json').read_text(encoding='utf-8'))
c=next(t for t in cfg['targets'] if t['name']=='flash-public-low')
target=Target({'name':'gateway-chat','base_url':c['base_url'],'api_key_env':'TEST_KEY','protocol':'chat','models':['flash']},env={'TEST_KEY':c['api_key']})
store=EvidenceStore(str(TASK/'短请求/证据'));sampler=Sampler(store,max_requests=10)
rows=[]
for i in range(10):
    body=chat_body('flash',messages=[{'role':'user','content':'Reply with exactly OK. Do not explain.'}],stream=True,max_tokens=128,include_usage=True,extra_fields={'think_level':'low'})
    r=sampler.measure(target,body,cases=['GW-SHORT-C1'],group='short-serial',expected={'exact_text':'OK'})
    rows.append(r)
    dest=TASK/'短请求';dest.mkdir(exist_ok=True)
    (dest/'results.json').write_text(json.dumps({'samples':rows,'summary':aggregate(rows)},ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'i':i+1,'ok':r['ok'],'http':r['http'],'text':r['normalized'].get('text'),'metrics':r['metrics']},ensure_ascii=True),flush=True)
summary=aggregate(rows)
report=['# TPT 网关短请求：单并发响应时间','', '模型 flash，think_level=low，Chat Completions SSE；输入要求只回复 OK，输出上限 128 token。10 次顺序执行、没有预热排除或重试，每个请求独立连接，因此耗时包含连接建立。首正文从发起 HTTP 请求到首个非空正文，完整时间到响应读取结束。','',f"成功 {summary['succeeded']}/10。",'', '|指标（秒）|均值|P50|P95|最小|最大|','|---|---:|---:|---:|---:|---:|']
for key,name in [('first_text','首正文'),('e2e','完整响应')]:
    s=summary['success_metrics'][key]
    report.append('|'+name+'|'+'|'.join(f'{s[k]:.3f}' if s[k] is not None else '未观测' for k in ['mean','p50','p95','min','max'])+'|')
report+=['','P95 为小样本最近秩统计，此处等于最大值；这是当次测量，不是稳定容量/SLO。原始逐请求帧及时间见证据索引，结果见 results.json。']
(TASK/'短请求/报告.md').write_text('\n'.join(report)+'\n',encoding='utf-8')
print(json.dumps(summary['success_metrics'],ensure_ascii=True),flush=True)
