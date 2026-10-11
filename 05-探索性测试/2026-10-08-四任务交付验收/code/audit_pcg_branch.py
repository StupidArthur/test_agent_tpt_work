from pathlib import Path
import subprocess, json, hashlib
from collections import Counter

review=Path(__file__).resolve().parents[1]
root=review.parents[1]
ref='origin/review/pcg-ui-dedup-night'
prefix='探索性测试/2026-10-07-PCG-UI工具去重夜间验证/'
sources={}
cache={}
def git(*args):
    return subprocess.check_output(['git',*args],cwd=root)
def obj(name):
    p=prefix+name;b=blob(name);sources[p]=hashlib.sha256(b).hexdigest()
    return json.loads(b.decode('utf-8-sig'))
def blob(name):
    if name not in cache:cache[name]=git('show',ref+':'+prefix+name)
    return cache[name]
def jsonlines(name):
    b=blob(name);sources[prefix+name]=hashlib.sha256(b).hexdigest()
    return [json.loads(x) for x in b.decode('utf-8-sig').splitlines() if x.strip()]
paths=git('-c','core.quotePath=false','ls-tree','-r','--name-only',ref,prefix).decode('utf-8').splitlines()
changed=git('-c','core.quotePath=false','diff','--name-only','origin/main...'+ref).decode('utf-8').splitlines()
records=[]
for p in paths:
    if p.startswith(prefix+'结果/') and p.endswith('.json') and p.count('/')==3:
        records.append(obj(p[len(prefix):]))
queue=obj('用例/队列.json')
state=obj('任务状态.json')
catalog=obj('code/business/catalog.json')
new=obj('新增函数清单.json')
calls=jsonlines('运行日志/业务调用.jsonl')
events=jsonlines('运行日志/business.jsonl')
call_ids={c.get('call_id') for c in calls}
event_ids={e.get('event_id') for e in events}
hashes={}
hash_issues=[]
for c in calls:
    for p,s in [(c.get('args_path'),c.get('args_sha256')),(c.get('return_path'),c.get('return_sha256'))]+[(m.get('snapshot'),m.get('sha256')) for m in c.get('modules',[])]:
        if p and s:hashes[p]=s
for p,s in hashes.items():
    try:
        actual=hashlib.sha256(blob(p)).hexdigest()
        if actual!=s:hash_issues.append({'path':p,'expected':s,'actual':actual})
    except subprocess.CalledProcessError:hash_issues.append({'path':p,'error':'missing'})
reference_issues=[]
for r in records:
    missing_calls=[x for x in r.get('call_refs',[]) if x not in call_ids]
    missing_events=[x for a in r.get('assertions',[]) for x in a.get('event_refs',[]) if x not in event_ids]
    if missing_calls or missing_events:reference_issues.append({'case':r['case_id'],'missing_calls':missing_calls,'missing_events':missing_events})
summary={'branch':ref,'commit':git('rev-parse',ref).decode().strip(),'changed_files':len(changed),
 'changed_outside_task':[p for p in changed if not p.startswith(prefix)],
 'recorded':len(records),'total':len(queue),'statuses':dict(Counter(r.get('status') for r in records)),
 'remaining':[c['id'] for c in queue if c['id'] not in {r['case_id'] for r in records}],
 'comparisons_recorded':[r['case_id'] for r in records if r['case_id'].startswith('DEDUP')],
 'state':state,'task_catalog':catalog,'new_function_list':new,
 'hashes_checked':len(hashes),'hash_issues':hash_issues,'reference_issues':reference_issues,
 'last_business_call':{k:calls[-1].get(k) for k in ['call_id','function_name','started_at','ended_at','status']} if calls else None,
 'non_pass':[r for r in records if r.get('status')!='通过'],
 'result_summary':[{'case_id':r['case_id'],'status':r.get('status'),'call_refs':r.get('call_refs'),
 'null_assertions':[a for a in r.get('assertions',[]) if a.get('actual') is None]} for r in records]}
(review/'审核').mkdir(parents=True,exist_ok=True)
(review/'审核/PCG分支初审.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
(review/'审核/PCG分支来源SHA256.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:summary[k] for k in ['commit','recorded','total','statuses','changed_outside_task','comparisons_recorded']},ensure_ascii=False))
for r in summary['non_pass']:
    print(json.dumps({'case_id':r['case_id'],'status':r['status'],'assertions':r.get('assertions')},ensure_ascii=False))
