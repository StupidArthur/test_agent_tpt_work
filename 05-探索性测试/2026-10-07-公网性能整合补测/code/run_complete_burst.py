"""Complete-response control for the deliberately capped historical 800-token burst."""
import concurrent.futures,json,time,threading
import psutil
from run_performance import SAMPLER,TARGETS,TASK,LONG,body,save_group
t=TARGETS['gateway-responses']
for n in [1,5,10]:
    group=f'complete-burst-{n}';rows=[];waves=[]
    done=TASK/'结果'/f'{group}-waves.json'
    if done.exists() and len(json.loads(done.read_text(encoding='utf-8')))>=3:continue
    SAMPLER.measure(t,body(t,LONG,8192),cases=['CAP-01','PERF-03'],group=group,warmup=True,
        expected={'nonempty':True,'min_text_chars':1200,'contains':['END_PERF_7f91'],'terminal_allowed':['completed'],'output_cap':8192})
    for wave in range(3):
        barrier=threading.Barrier(n);start=time.monotonic()
        def one(i):
            barrier.wait()
            return SAMPLER.measure(t,body(t,LONG,8192),cases=['CAP-01','PERF-03'],group=group,
                expected={'nonempty':True,'min_text_chars':1200,'contains':['END_PERF_7f91'],
                          'terminal_allowed':['completed'],'output_cap':8192})
        with concurrent.futures.ThreadPoolExecutor(n) as pool:got=list(pool.map(one,range(n)))
        rows+=got
        proc=psutil.Process()
        waves.append({'wave':wave,'wall_s':time.monotonic()-start,'attempted':n,'successful':sum(r['ok'] for r in got),
            'client_after_wave':{'rss':proc.memory_info().rss,'cpu_s':sum(proc.cpu_times()[:2]),'threads':proc.num_threads()},
            'peak_active_requests':max(sum(r['start_monotonic']<=p<r['end_monotonic'] for r in got) for p in [r['start_monotonic'] for r in got]),
            'output_tokens':sum(r['metrics']['output_tokens'] for r in got) if all(r['metrics']['output_tokens'] is not None for r in got) else None})
        save_group(group,rows);done.write_text(json.dumps(waves,ensure_ascii=False,indent=2),encoding='utf-8')
