import collections,hashlib,json
from pathlib import Path
TASK=Path(__file__).resolve().parents[1]
waves=[json.loads(p.read_text(encoding='utf-8')) for p in sorted(TASK.glob('wave-*.json'),key=lambda p:int(p.stem.split('-')[1]))]
totals=collections.Counter();usage=collections.Counter();messages=collections.Counter()
for w in waves:
    totals.update(w['statuses'])
    for r in w['rows']:
        for k,v in (r.get('usage') or {}).items():
            if isinstance(v,int):usage[k]+=v
        if r.get('error_body'):
            try:
                msg=json.loads(r['error_body'])['error']['message']
                messages[msg.split(' (request_id:')[0]]+=1
            except Exception:pass
summary={'requests':sum(w['planned'] for w in waves),'statuses':dict(totals),'usage':dict(usage),'error_messages':dict(messages),'waves':[{k:v for k,v in w.items() if k!='rows'} for w in waves]}
(TASK/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
index=[]
for p in TASK.rglob('*'):
    if p.is_file() and p.name!='evidence-index.json':
        index.append({'path':str(p.relative_to(TASK)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest().upper(),'cases':[p.stem] if p.name.startswith('wave-') else ['DIRECT-CONCURRENCY']})
(TASK/'evidence-index.json').write_text(json.dumps(index,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(summary,ensure_ascii=True))
