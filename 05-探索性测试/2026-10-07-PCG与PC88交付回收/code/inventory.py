from pathlib import Path
import json, hashlib, collections

TASK=Path(__file__).resolve().parents[1]
ROOT=TASK.parents[1]
EXP=TASK.parent
sources={'PCG':EXP/'2026-10-06-业务函数复用回归','PC88':EXP/'2026-10-07-PC88-记忆工具库复跑'}
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
main=read(ROOT/'tools/ui-operations/business/catalog.json')['functions']
summary={}
for name,base in sources.items():
    results=[]
    for p in sorted((base/'结果').glob('*.json')):
        d=read(p)
        results.append({'file':p.name,'keys':list(d),'data':d})
    cat=read(base/'code/business/catalog.json')
    entries=cat if isinstance(cat,list) else cat['functions']
    logs=[]
    log=base/'运行日志/业务调用.jsonl'
    if log.exists():logs=[json.loads(x) for x in log.read_text(encoding='utf-8-sig').splitlines() if x.strip()]
    summary[name]={'results':results,'functions':entries,'calls':len(logs),'used':dict(collections.Counter(x.get('function_name',x.get('function')) for x in logs)),'log_example':logs[:1]}
out=TASK/'审核';out.mkdir(exist_ok=True)
(out/'交付结构.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
for name,d in summary.items():
    print(name,'results',len(d['results']),'functions',len(d['functions']),'calls',d['calls'])
    for x in d['results']:
        v=x['data']; print(x['file'],v.get('status',v.get('verdict',v.get('result'))),json.dumps(v.get('assertions',v.get('checks',[])),ensure_ascii=False)[:1000])
    print('RESULT_EXAMPLE',json.dumps(d['results'][0],ensure_ascii=False)[:11000])
    print('FUNCTIONS',json.dumps([{k:x.get(k) for k in ['name','file','export','description']} for x in d['functions']],ensure_ascii=False))
print('MAIN_FUNCTIONS',json.dumps([{k:x.get(k) for k in ['name','file','export','description']} for x in main],ensure_ascii=False))
