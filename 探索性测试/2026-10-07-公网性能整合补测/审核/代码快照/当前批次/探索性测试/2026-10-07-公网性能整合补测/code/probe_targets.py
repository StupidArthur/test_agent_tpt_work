"""Bounded credential/model readiness; existing test keys loaded in memory only."""
import json
import sys
from pathlib import Path

REPO=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(REPO/'04-测试项/saas-llm-test/code'))
from llm_probe.transport import http_request
from llm_probe.evidence import EvidenceStore

TASK=Path(__file__).resolve().parents[1]
store=EvidenceStore(str(TASK/'证据'))
cfg=json.loads((REPO/'04-测试项/saas-llm-test/archive/v1/llm-bench-kit/config.json').read_text(encoding='utf-8'))
out=[]
for name in ['flash-public-low','deepseek-flash-low']:
    t=next(x for x in cfg['targets'] if x['name']==name)
    r=http_request(t['base_url'].rstrip('/')+'/models',headers={'Authorization':'Bearer '+t['api_key']},
        stream=False,connect_timeout=10,idle_timeout=20,total_timeout=30)
    try:body=json.loads(r.body_text)
    except ValueError:body={}
    row=dict(target=name,url=t['base_url'],http=r.http_status,error_kind=r.error_kind,
             model_ids=[m.get('id') for m in body.get('data',[])],body=body,
             credential_reference='archive/v1/llm-bench-kit/config.json:'+name,request_count=1)
    rec=store.write_json('准备/'+name+'.json',row,instances=['PREP','PERF-07'],kind='target_discovery')
    out.append(row)
    print(json.dumps({k:row[k] for k in ['target','http','error_kind','model_ids']},ensure_ascii=False),flush=True)
(TASK/'目标准备.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
