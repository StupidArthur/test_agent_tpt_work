"""Read-only delivery audit. Never imports network executors."""
from pathlib import Path
import json, hashlib, math
from collections import Counter
from datetime import datetime, timezone

review = Path(__file__).resolve().parents[1]
root = review.parents[1]
local = root/'探索性测试/2026-10-08-PC-local-工具发现与断言验证'
api = root/'探索性测试/2026-10-07-LLM网关最终容量验收/续跑-2026-10-08-TaskA'
sources = {}
def read(p):
    b=p.read_bytes();sources[p.relative_to(root).as_posix()]=hashlib.sha256(b).hexdigest()
    return json.loads(b.decode('utf-8-sig'))
def lines(p):
    b=p.read_bytes();sources[p.relative_to(root).as_posix()]=hashlib.sha256(b).hexdigest()
    return [json.loads(x) for x in b.decode('utf-8-sig').splitlines() if x.strip()]
calls=lines(local/'运行日志/业务调用.jsonl')
events=lines(local/'运行日志/business.jsonl')
call_ids={c.get('call_id',c.get('business_call_id')) for c in calls}
event_ids={e.get('event_id') for e in events}
rows=[]
for p in sorted((local/'结果').glob('FIND-*.json')):
    r=read(p)
    rows.append({'case_id':r['case_id'],'business_status':r.get('business_status'),
    'discovery_status':r.get('discovery_status'),'gap_type':r.get('gap_type'),
    'missing_calls':[x for x in r.get('call_refs',[]) if x not in call_ids],
    'missing_events':[x for x in r.get('event_refs',[]) if x not in event_ids],
    'missing_search_files':[q.get('raw_output_path') for q in r.get('queries',[]) if not (local/q.get('raw_output_path','')).is_file()]})
queue=read(local/'用例/发现队列.json')
windows=[]
for p in sorted((api/'results').glob('w*-win*.json')):
    r=read(p);raw=lines(p.with_suffix('.raw.jsonl'))
    ok=[x for x in raw if x.get('gateway_service_success')]
    vals=sorted(x['e2e'] for x in ok if x.get('e2e') is not None)
    p95=vals[math.ceil(.95*len(vals))-1] if vals else None
    windows.append({'label':r['label'],'done':r['done'],'attempted':r['attempted'],
    'raw_count':len(raw),'ok':len(ok),'success_rate':r['gateway_service_success_rate'],
    'e2e_p95':r['e2e']['p95'] if r.get('e2e') else None,'recomputed_p95':p95,
    'elapsed_s':r['elapsed_s'],'min_peak_ratio':r['min_peak_ratio'],
    'counts_match':len(raw)==r['attempted'] and len(ok)==r['gateway_service_success'],
    'p95_matches':p95 is not None and abs(p95-r['e2e']['p95'])<.000002,
    'formal_window_complete':r['done'] and r['elapsed_s']>=600 and r['attempted']>=100,
    'cpu_sample_note':'CPU/threads/TCP sampled after burst drained; does not measure pressure peaks'})
expected={f'w{u}-win{w}' for u in [55,60,80,85,200,210] for w in [1,2]}
out={'captured_at':datetime.now(timezone.utc).isoformat(),'local':{
 'total':len(queue),'recorded':len(rows),'remaining':[c['id'] for c in queue if c['id'] not in {r['case_id'] for r in rows}],
 'statuses':dict(Counter(r['business_status'] for r in rows)),'cases':rows,
 'report_exists':(local/'报告.md').is_file(),'improvement_list_exists':(local/'改进清单.json').is_file(),
 'new_function_list':read(local/'新增函数清单.json'),'task_catalog':read(local/'code/business/catalog.json')},
 'api':{'expected_windows':12,'present':len(windows),'formal_complete':sum(w['formal_window_complete'] for w in windows),
 'missing':sorted(expected-{w['label'] for w in windows}),'windows':windows,
 'report_exists':(api/'验收报告-续跑.md').is_file(),'summary_exists':(api/'结果汇总.json').is_file()},
 'merge_status':'当前交付不完整，原资料保持；等待完成版位置与远程分支确认'}
(review/'审核').mkdir(parents=True,exist_ok=True)
(review/'审核/本地初审.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
(review/'审核/来源SHA256.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'local_results':len(rows),'local_missing_refs':sum(bool(r['missing_calls'] or r['missing_events']) for r in rows),
 'api_present':len(windows),'api_complete':sum(w['formal_window_complete'] for w in windows),
 'api_recalculation_issues':[w['label'] for w in windows if not w['counts_match'] or not w['p95_matches']]},ensure_ascii=False))
