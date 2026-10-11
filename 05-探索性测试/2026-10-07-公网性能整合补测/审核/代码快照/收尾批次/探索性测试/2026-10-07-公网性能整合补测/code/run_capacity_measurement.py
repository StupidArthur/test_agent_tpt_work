"""Bounded public measurements, deliberately no SLO pass/capacity verdict."""
import dataclasses,json,time,threading
import psutil
from run_performance import TARGETS,STORE,TASK
from llm_probe.capacity_suite import make_turn,Budget
from llm_probe.capacity import run_closed_loop,run_open_arrival
from llm_probe.stats import summarise

budget=Budget(3000)
target=TARGETS['gateway-responses']
root=TASK/'结果'/'用户曲线';root.mkdir(exist_ok=True)

def write(path,obj):path.write_text(json.dumps(obj,ensure_ascii=False,indent=2),encoding='utf-8')
def peak(reqs):
    events=sorted([(r.start,1) for r in reqs]+[(r.end,-1) for r in reqs])
    active=high=0
    for _,d in events:active+=d;high=max(high,active)
    return high
def measure_closed(workload,users):
    label=f'{workload}-{users}'
    dest=root/(label+'.json')
    if dest.exists():print('SKIP '+label,flush=True);return
    plan=dict(workload=workload,model='flash',effort='low',output_tokens=1024,tool_output_tokens=512)
    item='CAP-02' if workload=='text' else 'CAP-03'
    fn=make_turn(target,STORE,plan,budget,item,label)
    turn_rows=[];lock=threading.Lock();resources=[];stop=threading.Event()
    def monitor():
        p=psutil.Process()
        while not stop.is_set():
            resources.append({'monotonic':time.monotonic(),'rss':p.memory_info().rss,'threads':p.num_threads(),'cpu_s':sum(p.cpu_times()[:2])})
            stop.wait(5)
    monitor_thread=threading.Thread(target=monitor);monitor_thread.start()
    def turn(u,i):
        t=fn(u,i)
        if t is None:raise RuntimeError('Frozen measurement budget insufficient; retain partial wire, do not fabricate turns')
        row=dataclasses.asdict(t)|{'user':u,'turn_index':i,'checks':t.checks,'evidence':t.evidence}
        STORE.write_json(f'capacity-measurement/{label}/u{u}-t{i}.json',row,instances=[item],kind='measurement_turn')
        with lock:turn_rows.append(row)
        return t
    try:r=run_closed_loop(turn,users=users,think_time=5,min_seconds=120,min_turns=30,max_seconds=240)
    finally:stop.set();monitor_thread.join()
    reqs=r.requests
    obj={'mode':'measurement_only','workload':workload,'users':users,'think_time':5,'start':r.start,'end':r.end,
         'duration':r.duration_s,'stopped_by':r.stopped_by,'sample_met':r.duration_s>=120 and len(r.turns)>=30,
         'attempted_turns':len(r.turns),'successful_turns':sum(t.ok for t in r.turns),'actual_requests':len(reqs),
         'request_peak':peak(reqs),'turn_e2e_s':summarise(r.turn_latencies()).to_dict(),
         'first_text_s':summarise(r.first_text_waits()).to_dict(),'turns':turn_rows,'resources':resources,
         'slo':None,'capacity_verdict':'unverified; no confirmed business SLO, no boundary sustained verification'}
    write(dest,obj)
    print(json.dumps({k:obj[k] for k in ['workload','users','attempted_turns','successful_turns','request_peak','turn_e2e_s']},ensure_ascii=False),flush=True)

def arrival(rate):
    label='arrival-'+str(rate);dest=root/(label+'.json')
    if dest.exists():print('SKIP '+label,flush=True);return
    plan=dict(workload='text',model='flash',effort='low',output_tokens=256,tool_output_tokens=512)
    fn=make_turn(target,STORE,plan,budget,'CAP-05',label)
    r=run_open_arrival(lambda i:fn(0,i),arrival_rate=rate,duration=120,max_in_flight=10,queue_limit=10)
    reqs=[q for t in r['results'] for q in t.requests]
    obj={k:v for k,v in r.items() if k!='results'}
    obj.update(mode='measurement_only',arrival_rate=rate,max_in_flight=10,queue_limit=10,
        accounting_ok=r['scheduled']==r['completed']+r['failed']+r['rejected'],request_peak=peak(reqs),
        sample_met=r['duration_s']>=120 and r['scheduled']>=30,
        turns=[dataclasses.asdict(t)|{'checks':t.checks,'evidence':t.evidence,'queue_wait':t.queue_wait,
            'planned_arrival':t.planned_arrival,'actual_worker_start':t.actual_worker_start} for t in r['results']],
        interpretation='low-rate scheduler check; does not locate throughput/queue boundary')
    write(dest,obj);print(json.dumps({k:obj[k] for k in ['arrival_rate','scheduled','completed','failed','rejected','request_peak','accounting_ok']}),flush=True)

if __name__=='__main__':
    baseline_plan=dict(workload='text',model='flash',effort='low',output_tokens=256,tool_output_tokens=512)
    baseline_fn=make_turn(target,STORE,baseline_plan,budget,'CAP-06','baseline')
    baseline=[baseline_fn(0,i) for i in range(10)]
    write(root/'baseline.json',{'turns':[dataclasses.asdict(t)|{'checks':t.checks,'evidence':t.evidence} for t in baseline],
        'ok':all(t.ok for t in baseline),'e2e_s':summarise([t.end-t.start for t in baseline]).to_dict()})
    for workload in ['text','tool']:
        for users in [1,5,10]:measure_closed(workload,users)
    for rate in [.25,.5,1]:arrival(rate)
    plan=dict(workload='text',model='flash',effort='low',output_tokens=256,tool_output_tokens=512)
    fn=make_turn(target,STORE,plan,budget,'CAP-06','recovery')
    turns=[fn(0,i) for i in range(10)]
    write(root/'recovery.json',{'turns':[dataclasses.asdict(t)|{'checks':t.checks,'evidence':t.evidence} for t in turns],
        'actual_requests_in_measurement':budget.sent,'ok':all(t.ok for t in turns),'workers_drained':True,
        'e2e_s':summarise([t.end-t.start for t in turns]).to_dict(),
        'latency_tolerance':None,'latency_recovery_verdict':'unverified; no confirmed recovery tolerance'})
    print('END capacity measurement '+str(budget.sent)+' requests',flush=True)
