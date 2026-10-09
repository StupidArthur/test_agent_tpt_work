from pathlib import Path
from collections import Counter
import json,hashlib,math

review=Path(__file__).resolve().parents[1]; root=review.parents[1]
task=root/'探索性测试/2026-10-07-LLM网关最终容量验收/续跑-2026-10-08-TaskA'
issues=[]; hashes=[]; windows=[]
for line in (task/'evidence-index.jsonl').read_text(encoding='utf-8').splitlines():
    if not line.strip():continue
    e=json.loads(line);p=task/e['path']
    actual=hashlib.sha256(p.read_bytes()).hexdigest() if p.exists() else None
    hashes.append({'path':e['path'],'sha256':actual,'matches':actual==e['sha256'].lower()})
    if actual!=e['sha256'].lower():issues.append({'path':e['path'],'error':'hash mismatch'})
def pct(xs):
    return sorted(xs)[math.ceil(.95*len(xs))-1] if xs else None
for p in sorted((task/'results').glob('w*-win*.json')):
    s=json.loads(p.read_text(encoding='utf-8'))
    raw=[json.loads(x) for x in p.with_suffix('.raw.jsonl').read_text(encoding='utf-8').splitlines() if x.strip()]
    ok=[x for x in raw if x.get('gateway_service_success')]
    e2e=[x['e2e'] for x in ok if x.get('e2e') is not None]
    cats=Counter(c for x in raw for c in x.get('cats',[]))
    tests={'count':len(raw)==s['attempted'],'success':len(ok)==s['gateway_service_success'],
     'rate':abs(len(ok)/len(raw)*100-s['gateway_service_success_rate'])<.00051,
     'p95':abs(pct(e2e)-s['e2e']['p95'])<.000002,
     'categories':dict(cats)==s['categories'],
     'quality_mismatch':sum(bool(x.get('model_quality_mismatch')) for x in raw)==s['model_quality_mismatch']}
    for k,v in tests.items():
        if not v:issues.append({'window':s['label'],'error':k})
    windows.append({'label':s['label'],'tier':s['planned_concurrency'],'done':s['done'],
    'elapsed_s':s['elapsed_s'],'attempts':len(raw),'success_rate':len(ok)/len(raw)*100,
    'e2e_p95':pct(e2e),'client_limited':s['min_peak_ratio']<.90,
    'valid_duration':s['done'] and s['elapsed_s']>=600 and s['attempted']>=100,
    'launch_spread_s':s['max_launch_spread_s'],'categories':dict(cats),'recalculation':tests})
tiers={}
for n in sorted({w['tier'] for w in windows}):
    ws=[w for w in windows if w['tier']==n]
    valid=[w for w in ws if w['valid_duration'] and not w['client_limited']]
    tiers[str(n)]={'windows':len(ws),'valid_windows':len(valid),
       'pass_thresholds':[t for t in [3,5,10] if len(valid)>=2 and all(w['success_rate']>=99 and w['e2e_p95']<=t for w in valid)],
       'invalid_windows':[w['label'] for w in ws if w not in valid],
       'failure_in_valid_windows':[w['label'] for w in valid if w['success_rate']<99]}
recover=json.loads((task/'results/responses-boundary-recovery.json').read_text(encoding='utf-8'))
summary={'hash_records':len(hashes),'hashes':hashes,'windows':windows,'tiers':tiers,'issues':issues,
 'requests':sum(w['attempts'] for w in windows),'recoveries':recover,
 'capacity':{'3s':{'verified':60,'first_valid_failing_tier':70,'planning':300},
 '5s':{'verified':85,'first_valid_failing_tier':100,'planning':425},
 '10s':{'verified':100,'first_valid_failing_tier':None,'planning':500,'unconfirmed_tiers':[200,210]}}}
(review/'审核/TaskA最终核对.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:summary[k] for k in ['hash_records','requests','tiers','issues']},ensure_ascii=False))
