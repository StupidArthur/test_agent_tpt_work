from pathlib import Path
import json,hashlib,collections,re,subprocess
T=Path(__file__).resolve().parents[1]; R=T.parents[1]; E=T.parent
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def lines(p):return [json.loads(x) for x in p.read_text(encoding='utf-8-sig').splitlines() if x.strip()]
def h(b):return hashlib.sha256(b).hexdigest()
out={}; allhash={}; main=read(R/'tools/ui-operations/business/catalog.json')['functions']; byname={x['name']:x for x in main}
for machine,folder in [('PCG','2026-10-06-业务函数复用回归'),('PC88','2026-10-07-PC88-记忆工具库复跑')]:
 b=E/folder; results=[read(p) for p in sorted((b/'结果').glob('*.json'))]; calls=lines(b/'运行日志/业务调用.jsonl'); events=lines(b/'运行日志/business.jsonl'); eventmap={x.get('event_id'):x for x in events}; callmap={x['call_id']:x for x in calls}; checks={}; issues=[]
 def check(rel,digest):
  if not rel or not digest:return
  key=(rel,digest)
  if key in checks:return
  p=b/rel
  if not p.exists():checks[key]={'path':rel,'expected':digest,'status':'missing'};return
  raw=p.read_bytes(); actual=h(raw); status='match' if actual==digest else 'mismatch'; equivalent=None
  if status=='mismatch':
   lf=raw.replace(b'\r\n',b'\n')
   if h(lf)==digest:equivalent='LF'
   elif h(lf.replace(b'\n',b'\r\n'))==digest:equivalent='CRLF'
  checks[key]={'path':rel,'expected':digest,'actual':actual,'status':status,'line_ending_equivalent':equivalent}
 for c in calls:
  for prefix in ['args','return']:check(c.get(prefix+'_path'),c.get(prefix+'_sha256'))
  for m in c.get('modules',[]):check(m.get('snapshot'),m.get('sha256'))
 for d in results:
  for v in d.get('evidence',[]):check(v.get('path'),v.get('sha256'))
 if machine=='PC88':
  for c in lines(b/'证据索引.jsonl'):
   for prefix in ['args','return']:check(c.get(prefix+'_path'),c.get(prefix+'_sha256'))
   for m in c.get('modules',[]):check(m.get('snapshot'),m.get('sha256'))
 rows=[]
 for d in results:
  cid=d['case_id']; row={'case':cid,'reported':d['status'],'notes':d.get('notes'),'assertions':[],'issues':[]}
  if machine=='PCG':
   for a in d['assertions']:
    ev=[eventmap.get(x) for x in a.get('read_refs',[])]; row['assertions'].append({'id':a['id'],'actual':a['actual'],'reads':ev})
    if any(x is None for x in ev):row['issues'].append('missing_read')
   if any(x not in callmap for x in d.get('business_call_refs',[])):row['issues'].append('missing_call')
   selected=[eventmap[x] for x in d.get('action_refs',[]) if x in eventmap]
   ts=[x.get('captured_at','') for x in selected]
   if ts and (min(ts)<d['started_at'] or max(ts)>d['ended_at']):row['issues'].append('action_time_outside_result_window')
  else:
   for a in d.get('attempts',[]):
    for s in a.get('subchecks',[]):
     row['assertions'].append(s)
     source=s.get('source','')
     if 'CALL-<' in source or '…' in source or re.search(r'CALL-[a-f0-9]{8}(?!-)',source):row['issues'].append('abbreviated_or_placeholder_reference')
   if not d.get('evidence_refs'):row['issues'].append('empty_evidence_refs')
  rows.append(row)
 cat=read(b/'code/business/catalog.json'); entries=cat if isinstance(cat,list) else cat['functions']; mappings=[]
 for f in entries:
  same=byname.get(f['name']); mappings.append({'task_function':f['name'],'main_function':same['name'] if same else None,'task_file':f['file'],'main_file':same['file'] if same else None,'used_calls':sum(x.get('function_name',x.get('function'))==f['name'] for x in calls),'disposition':'existing_name_review_implementation' if same else 'needs_capability_mapping'})
 out[machine]={'results':rows,'counts':dict(collections.Counter(d['status'] for d in results)),'calls':len(calls),'event_count':len(events),'hash_checks':list(checks.values()),'hash_summary':dict(collections.Counter(x['status'] for x in checks.values())),'function_mappings':mappings,'used':dict(collections.Counter(x.get('function_name',x.get('function')) for x in calls))}
 for p in [b/'README.md',b/'code/business/catalog.json',b/'运行日志/business.jsonl',b/'运行日志/业务调用.jsonl',*sorted((b/'结果').glob('*.json'))]:allhash[p.relative_to(R).as_posix()]=h(p.read_bytes())
 print(machine,'counts',out[machine]['counts'],'calls',len(calls),'hashes',out[machine]['hash_summary'])
 print('HASH_ERRORS',json.dumps([x for x in checks.values() if x['status']!='match'],ensure_ascii=False)[:3000])
 print('FUNCTION_MAPPING',len(entries),'same names',sum(x['main_function'] is not None for x in mappings),'unmatched',[(x['task_function'],x['used_calls']) for x in mappings if not x['main_function']])
 if machine=='PCG':
  cases={x['id']:x for x in read(b/'用例/cases.json')}
  for row in rows:
   if row['reported']=='通过':continue
   print(row['case'],row['reported'],cases[row['case']]['title'],json.dumps([{'id':x['id'],'expected':next(a for a in cases[row['case']]['assertions'] if a['id']==x['id'])['expected'],'actual':str(x['actual'])[:110]} for x in row['assertions']],ensure_ascii=False),row['notes'])
  env=read(b/'环境记录.json');raw=(b/'用例/cases.json').read_bytes();print('QUEUE_HASH',env.get('queue_sha256'),h(raw),'LF',h(raw.replace(b'\r\n',b'\n')),'CRLF',h(raw.replace(b'\r\n',b'\n').replace(b'\n',b'\r\n')))
(T/'审核/全量结果与工具审计.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
(T/'审核/来源SHA256.json').write_text(json.dumps(allhash,ensure_ascii=False,indent=2),encoding='utf-8')
