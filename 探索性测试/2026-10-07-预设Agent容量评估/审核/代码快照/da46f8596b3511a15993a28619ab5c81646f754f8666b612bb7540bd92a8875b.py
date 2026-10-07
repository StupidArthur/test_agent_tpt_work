"""Gateway-only replay of captured standard-agent context and real two-call pattern."""
import copy,json,sys,time,uuid,threading,dataclasses
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3];TASK=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'04-测试项/saas-llm-test/code'))
from llm_probe.transport import http_request
from llm_probe.protocol import normalize
from llm_probe.runner import Target,_attempt_record
from llm_probe.evidence import EvidenceStore
from llm_probe.stats import summarise
from llm_probe.capacity import TurnResult,RequestAttempt,run_closed_loop,run_open_arrival
cfg=json.loads((ROOT/'04-测试项/saas-llm-test/archive/v1/llm-bench-kit/config.json').read_text(encoding='utf8'))
c=next(t for t in cfg['targets'] if t['name']=='flash-public-low')
TARGET=Target(dict(name='preset-capacity-public',base_url=c['base_url'],api_key_env='TEST_KEY',protocol='responses',models=['flash']),env={'TEST_KEY':c['api_key']})
STORE=EvidenceStore(str(TASK/'证据'));LOCK=threading.Lock();SENT=0
idx=TASK/'证据索引.jsonl'
if idx.exists():SENT=sum(json.loads(x).get('kind')=='preset_capacity_wire' for x in idx.read_text(encoding='utf8').splitlines() if x.strip())
LOADS=json.loads((TASK/'负载回放.json').read_text(encoding='utf8'))['loads']
def write(p,obj):
 p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(obj,ensure_ascii=False,indent=2),encoding='utf8')
def task_turn(stage,user,index):
 global SENT
 source=LOADS[(user+index)%len(LOADS)];marker='CAP_AGENT_'+uuid.uuid4().hex
 b=copy.deepcopy(source['body']);s=json.dumps(b,ensure_ascii=False).replace(source['marker'],marker)
 # Fresh task directories match the actual product's new-task system prompt.
 s=s.replace(source['cwd'].replace('\\','\\\\'),source['cwd'].replace('\\','\\\\')+'-'+marker)
 b=json.loads(s);start=time.monotonic();reqs=[];refs=[];metrics=[];checks={};first_text=None
 def send(body):
  global SENT
  with LOCK:
   if SENT>=30000:raise RuntimeError('Frozen request ceiling 30000 reached')
   SENT+=1;rid=SENT
  r=http_request(TARGET.responses_url(),method='POST',headers=TARGET.headers(stream=True),body=json.dumps(body).encode(),stream=True,connect_timeout=10,idle_timeout=60,total_timeout=180)
  ns=normalize(r,'responses');ok=r.http_status==200 and r.error_kind is None and ns.terminal=='completed' and not ns.json_errors
  reqs.append(RequestAttempt(rid,r.t0,r.t_end,ok,r.error_kind,str(r.http_status)))
  kinds={k:r.rel(getattr(ns,'t_first_'+k)) for k in ('reasoning','tool','text')}
  vals=[v for v in kinds.values() if v is not None]
  metrics.append({'first_effective':min(vals) if vals else None,**kinds,'usage':ns.usage,'e2e':r.rel(r.t_end),'ok':ok})
  rec=STORE.write_json(f'wire/{stage}/{rid:05}-{marker}.json',{'request':body,'response':_attempt_record(r,ns),'body_text':r.body_text,'frames':[dict(t=f.t-r.t0,event=f.event,data=f.data,raw=f.raw,json_ok=f.json_ok) for f in r.frames],'metrics':metrics[-1],'source_session':source['session'],'user':user,'task_index':index},instances=['LOAD-03' if stage=='preflight' else 'CAPACITY-01' if 'scan' in stage or stage=='baseline' else 'CAPACITY-02' if 'sustain' in stage or 'arrival' in stage else 'CAPACITY-03'],kind='preset_capacity_wire');refs.append(rec['rel_path'])
  return ns,ok
 n,ok=send(b);checks['first_completed']=ok
 calls=list(n.tool_calls.values());checks['expected_tool']=len(calls)==1 and calls[0].name=='pwsh' and bool(calls[0].call_id)
 if ok and checks['expected_tool']:
  tc=calls[0];args=tc.final_arguments if tc.final_arguments is not None else tc.arguments
  try:parsed=json.loads(args);checks['tool_arguments']=bool(parsed.get('command'))
  except Exception:checks['tool_arguments']=False
  if checks['tool_arguments']:
   # Sandbox fixture, never execute returned shell command. Numeric result already independently checked.
   time.sleep(source['tool_delay_s'])
   second=copy.deepcopy(b)
   if n.text:second['input'].append({'type':'message','role':'assistant','content':[{'type':'output_text','text':n.text}]})
   second['input'] += [{'type':'function_call','call_id':tc.call_id,'name':tc.name,'arguments':args},{'type':'function_call_output','call_id':tc.call_id,'output':source['tool_result']}]
   n2,ok2=send(second);checks['second_completed']=ok2
   checks['final_numbers']=all(x in n2.text for x in (marker,'TOTAL=21000','COST=14700','PROFIT=6300','MARGIN=30%'))
   checks['final_report']=len(n2.text)>=300 and '|' in n2.text and not n2.tool_calls
   first_text=None if metrics[-1]['text'] is None else reqs[-1].start-start+metrics[-1]['text']
 result=TurnResult(all(v is True for v in checks.values()),start,time.monotonic(),reqs,first_text_wait=first_text,scenario='standard-sales-analysis')
 result.metrics=metrics;result.checks=checks;result.evidence=refs;result.source_session=source['session']
 STORE.write_json(f'tasks/{stage}/{marker}.json',dataclasses.asdict(result)|{'metrics':metrics,'checks':checks,'evidence':refs,'source_session':source['session']},instances=['CAPACITY-01','CAPACITY-02','CAPACITY-03'],kind='preset_task')
 return result
def summary(turns,baseline=None):
 req=[q for t in turns for q in t.requests];effective=[m['first_effective'] for t in turns for m in t.metrics]
 e=summarise([t.end-t.start for t in turns]);f=summarise(effective)
 sr=sum(t.ok for t in turns)/len(turns) if turns else 0;rr=sum(q.ok for q in req)/len(req) if req else 0
 gates={'task_success':sr>=.99,'request_success':rr>=.99,'first_effective_complete':len(effective)==sum(v is not None for v in effective),'first_effective_p95':f.p95 is not None and f.p95<=5}
 if baseline:gates['task_p95_vs_baseline']=e.p95 is not None and e.p95<=baseline*1.5
 return {'tasks':len(turns),'successful_tasks':sum(t.ok for t in turns),'task_success_rate':sr,'requests':len(req),'request_success_rate':rr,'task_e2e':e.to_dict(),'first_effective_per_request':f.to_dict(),'gates':gates,'slo_met':all(gates.values())}
def peak(reqs):
 events=sorted([(q.start,1) for q in reqs]+[(q.end,-1) for q in reqs]);n=high=0
 for _,d in events:n+=d;high=max(high,n)
 return high
def run_stage(name,users,minimum_seconds,minimum_turns,maximum_seconds,baseline=None):
 dest=TASK/'结果'/f'{name}.json'
 if dest.exists():return json.loads(dest.read_text(encoding='utf8'))
 begin=time.time();r=run_closed_loop(lambda u,i:task_turn(name,u,i),users=users,think_time=5,min_seconds=minimum_seconds,min_turns=minimum_turns,max_seconds=maximum_seconds)
 obj={'stage':name,'users':users,'think_time_s':5,'start_epoch':begin,'end_epoch':time.time(),'duration_s':r.duration_s,'stop_reason':r.stopped_by,'attempted_turns':len(r.turns),'actual_requests':len(r.requests),'peak_in_flight':peak(r.requests),'summary':summary(r.turns,baseline),'turns':[{'ok':x.ok,'start':x.start,'end':x.end,'first_effective_s':x.first_text_wait,'checks':x.checks,'metrics':x.metrics,'evidence':x.evidence,'source_session':x.source_session,'error':x.error} for x in r.turns]}
 write(dest,obj);print(json.dumps({k:obj[k] for k in ('stage','users','duration_s','attempted_turns','actual_requests','peak_in_flight','summary')},ensure_ascii=False),flush=True);return obj
if __name__=='__main__':
 if len(LOADS)!=10:raise SystemExit('Need 10 complete preset samples')
 (TASK/'结果').mkdir(exist_ok=True)
 baseline=run_stage('baseline-1user',1,0,30,900)
 basep=baseline['summary']['task_e2e']['p95']
 passed=[]
 for n in (5,10,20,40):
  row=run_stage(f'scan-{n}users',n,120,30,240,basep)
  if not row['summary']['slo_met']:break
  passed.append(n)
 arr=run_open_arrival(lambda i:task_turn('arrival-0.05',0,i),arrival_rate=.05,duration=600,max_in_flight=10,queue_limit=10)
 req=[q for x in arr['results'] for q in x.requests]
 obj={k:v for k,v in arr.items() if k!='results'};obj.update(stage='arrival-0.05',request_peak=peak(req),accounting_ok=arr['scheduled']==arr['completed']+arr['failed']+arr['rejected'],summary=summary(arr['results'],basep),turns=[{'ok':x.ok,'queue_wait_s':x.queue_wait,'planned_arrival':x.planned_arrival,'actual_worker_start':x.actual_worker_start,'first_effective_s':x.first_text_wait,'metrics':x.metrics,'checks':x.checks,'evidence':x.evidence} for x in arr['results']]);write(TASK/'结果/arrival-0.05.json',obj)
 print(json.dumps({'open_arrival':{'scheduled':arr['scheduled'],'completed':arr['completed'],'failed':arr['failed'],'rejected':arr['rejected'],'summary':obj['summary']},'passing_levels':passed},ensure_ascii=False),flush=True)
