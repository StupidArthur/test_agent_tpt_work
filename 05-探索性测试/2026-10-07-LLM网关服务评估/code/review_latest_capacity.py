"""Offline review: transport completion is distinct from nonempty answer."""
import collections,gzip,hashlib,json,math
from pathlib import Path
TASK=Path(__file__).resolve().parents[1]
BASE=TASK.parent
LATEST=BASE/'2026-10-07-TPT网关并发根因与长SLO'
DEST=TASK/'审核/最新容量复核'
DEST.mkdir(parents=True,exist_ok=True)
sources=[];rows=[];groups=[];issues=[]
def source(p):
    sources.append({'path':p.relative_to(BASE).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest().upper()})
for p in sorted(LATEST.glob('long-*.json')):
    source(p);d=json.loads(p.read_text(encoding='utf-8'));counter=collections.Counter()
    for r in d['rows']:
        q=LATEST/r['response_path'];source(q);raw=gzip.decompress(q.read_bytes())
        if hashlib.sha256(raw).hexdigest().upper()!=r['response_sha256']:issues.append(r['id'])
        text=[];reason=[];bad_json=0
        for line in raw.decode('utf-8',errors='replace').splitlines():
            if not line.startswith('data: ') or line[6:]=='[DONE]':continue
            try:
                o=json.loads(line[6:])
                for c in o.get('choices',[]):
                    delta=c.get('delta') or {}
                    text.append(delta.get('content') or '')
                    reason.append(delta.get('reasoning_content') or '')
            except ValueError:bad_json+=1
        txt=''.join(text);thought=''.join(reason)
        row={'case':p.stem,'id':r['id'],'http':r.get('status'),'protocol_complete':r['complete'],'text_chars':len(txt),'text_words':len(txt.split()),'reasoning_chars':len(thought),'finish_reasons':r['finish_reasons'],'usage':r['usage'],'response':q.relative_to(BASE).as_posix(),'json_errors':bad_json}
        rows.append(row);counter['attempted']+=1
        if r['complete']:
            counter['protocol_complete']+=1
            counter['nonempty_text']+=bool(txt.strip())
            counter['empty_text']+=not bool(txt.strip())
            counter['visible_reasoning']+=bool(thought.strip())
    groups.append({'wave':p.stem,**dict(counter)})
checks=[]
for pat in ['wave-120-*.json','wave-248-*.json','wave-1600-pool200-*.json','wave-1100-nopool.json']:
    for p in sorted(LATEST.glob(pat)):
        source(p);d=json.loads(p.read_text(encoding='utf-8'));good=[r for r in d['rows'] if r['complete']]
        times=sorted(r['end']-r['start'] for r in good)
        checks.append({'wave':p.stem,'planned':d['planned'],'complete':len(good),'conn_limit':d.get('conn_limit'),'statuses':d['statuses'],'p95':times[math.ceil(len(times)*.95)-1] if times else None})
for name in ['2026-10-07-TPT网关SLO边界补测','2026-10-07-TPT网关并发根因与长SLO','2026-10-07-TPT网关短请求并发验证','2026-10-07-预设Agent容量评估','2026-10-07-DeepSeek直连并发限额验证']:
    source(BASE/name/'报告.md')
summary={'groups':groups,'attempted':len(rows),'protocol_complete':sum(r['protocol_complete'] for r in rows),'protocol_complete_empty_text':sum(r['protocol_complete'] and not r['text_chars'] for r in rows),'protocol_complete_nonempty_text':sum(r['protocol_complete'] and bool(r['text_chars']) for r in rows),'response_hash_issues':issues,'batch_checks':checks,'interpretation':'Nonempty answer is necessary but not sufficient for business success. No new requests.'}
(DEST/'长请求正文复核.json').write_text(json.dumps({'summary':summary,'rows':rows},ensure_ascii=False,indent=2),encoding='utf-8')
(DEST/'来源哈希.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in summary.items() if k not in ['groups','batch_checks']},ensure_ascii=True))
