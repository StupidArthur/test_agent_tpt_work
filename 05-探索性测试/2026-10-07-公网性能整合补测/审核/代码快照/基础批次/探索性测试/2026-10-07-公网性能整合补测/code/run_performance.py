"""This task's frozen scenes, using public measurement functions; resumable by group."""
import concurrent.futures
import hashlib
import json
import os
import sys
import time
from pathlib import Path

REPO=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(REPO/'04-测试项/saas-llm-test/code'))
from llm_probe import protocol as P
from llm_probe.runner import Target
from llm_probe.evidence import EvidenceStore
from llm_probe.performance import Sampler,aggregate

TASK=Path(__file__).resolve().parents[1]
STORE=EvidenceStore(str(TASK/'证据'))
SAMPLER=Sampler(STORE,max_requests=1000)
if Path(STORE.index_path).exists():
    SAMPLER.sent=sum(json.loads(line).get('kind') in ['target_discovery','performance_wire','capacity_wire']
        for line in Path(STORE.index_path).read_text(encoding='utf-8').splitlines() if line.strip())
cfg=json.loads((REPO/'04-测试项/saas-llm-test/archive/v1/llm-bench-kit/config.json').read_text(encoding='utf-8'))
TARGETS={}
for name,alias,proto,model in [('flash-public-low','gateway-responses','responses','flash'),
    ('flash-public-low','gateway-chat','chat','flash'),('deepseek-flash-low','direct-chat','chat','deepseek-flash')]:
    c=next(x for x in cfg['targets'] if x['name']==name)
    TARGETS[alias]=Target(dict(name=alias,base_url=c['base_url'],api_key_env='TEST_CREDENTIAL',protocol=proto,models=[model]),
                          env={'TEST_CREDENTIAL':c['api_key']})


def body(target,prompt,cap=256,stream=True,effort='low'):
    if target.protocol=='responses':
        return P.responses_body(target.models[0],text=prompt,stream=stream,max_output_tokens=cap,
                                reasoning_effort=None if effort=='off' else effort)
    extra={'think_level':effort} if target.name=='gateway-chat' else {'effort':effort}
    return P.chat_body(target.models[0],messages=[{'role':'user','content':prompt}],stream=stream,
                       max_tokens=cap,include_usage=stream,extra_fields=extra)


def save_group(group,rows):
    dest=TASK/'结果'/f'{group}.json';dest.parent.mkdir(exist_ok=True)
    result=dict(group=group,summary=aggregate(rows),samples=rows)
    dest.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(dict(group=group,attempted=result['summary']['attempted'],succeeded=result['summary']['succeeded'],
                         e2e=result['summary']['success_metrics']['e2e']),ensure_ascii=False),flush=True)


def run_group(group,target,prompts,cases,cap=256,stream=True,effort='low',expect=None):
    done=TASK/'结果'/f'{group}.json'
    rows=json.loads(done.read_text(encoding='utf-8'))['samples'] if done.exists() else []
    if len(rows)>=len(prompts):print('SKIP recorded '+group,flush=True);return
    if not rows:
        b=body(target,prompts[0],cap,stream,effort)
        e=expect(0,prompts[0]) if callable(expect) else expect
        SAMPLER.measure(target,b,cases=cases,group=group,expected=e,warmup=True)
    for i,prompt in enumerate(prompts):
        if i<len(rows):continue
        b=body(target,prompt,cap,stream,effort)
        expected=expect(i,prompt) if callable(expect) else expect
        row=SAMPLER.measure(target,b,cases=cases,group=group,expected=expected)
        rows.append(row)
        save_group(group,rows)  # each attempt persisted; interruptions leave exact progress
    return rows


def foundation():
    run_group('short-responses',TARGETS['gateway-responses'],['只输出 PERF_MARK_7f91']*30,['PERF-01','PERF-02'],
              expect={'exact_text':'PERF_MARK_7f91','terminal_allowed':['completed']})
    for alias in ['gateway-chat','direct-chat']:
        t=TARGETS[alias]
        # Probe current Chat route, not assumed from history. No retries on unsupported route.
        probe=SAMPLER.measure(t,body(t,'只输出 OK',256,False),cases=['PREP','PERF-07'],group=alias+'-probe',expected={'exact_text':'OK'})
        if not probe['ok']:
            save_group(alias+'-blocked',[probe]);continue
        run_group(alias+'-short',t,['用一句话介绍你自己']*30,['PERF-01','PERF-07'],stream=False)
        run_group(alias+'-first-text',t,['写一句问候']*30,['PERF-02','PERF-07'])
    # Interleave reasoning efforts instead of separate time slots.
    target=TARGETS['gateway-responses'];rows=[]
    for effort in ['off','low','medium','high']:
        path=TASK/'结果'/f'efforts-{effort}.json'
        if path.exists():rows+=json.loads(path.read_text(encoding='utf-8'))['samples']
    for i in range(10):
        for effort in ['off','low','medium','high']:
            if sum(r['group']=='efforts-'+effort for r in rows)>i:continue
            rows.append(SAMPLER.measure(target,body(target,'9.11和9.9哪个大？只输出较大的数。',2048,True,effort),
                cases=['PERF-06','PERF-02'],group='efforts-'+effort,expected={'exact_text':'9.9'}))
            save_group('efforts-'+effort,[r for r in rows if r['group']=='efforts-'+effort])
    for i in range(20):
        if sum(r['group']=='efforts-low' for r in rows)>10+i:continue
        rows.append(SAMPLER.measure(target,body(target,'9.11和9.9哪个大？只输出较大的数。',2048),
            cases=['PERF-06','PERF-02'],group='efforts-low',expected={'exact_text':'9.9'}))
        save_group('efforts-low',[r for r in rows if r['group']=='efforts-low'])
    for effort in ['off','low','medium','high']:
        save_group('efforts-'+effort,[r for r in rows if r['group']=='efforts-'+effort])


LONG='请用中文写一篇约1500字的科普文章，主题是时间序列预测，包含方法、例子和局限。正文最后另起一行写 END_PERF_7f91。'

def long_and_output():
    for alias in ['gateway-responses','gateway-chat','direct-chat']:
        if (TASK/'结果'/f'{alias}-blocked.json').exists():continue
        t=TARGETS[alias]
        for stream in [True,False]:
            run_group(alias+('-long-stream' if stream else '-long-json'),t,[LONG]*10,
                ['PERF-03','PERF-02','PERF-07'] if alias!='gateway-responses' else ['PERF-03','PERF-02'],
                cap=8192,stream=stream,expect={'nonempty':True,'contains':['END_PERF_7f91'],'terminal_allowed':['completed'],'output_cap':8192})
    for cap in [128,512,2048]:
        run_group('output-'+str(cap),TARGETS['gateway-responses'],[LONG]*10,['PERF-05'],cap=cap,
            expect={'terminal_allowed':['completed','incomplete'],'output_cap':cap})


def contexts():
    target=TARGETS['gateway-responses']
    for size in [20,1250,2500]:
        rows=[];fixed=1791000000+size*100
        for variant in ['repeat','fresh']:
            path=TASK/'结果'/f'context-{size}-{variant}.json'
            if path.exists():rows+=json.loads(path.read_text(encoding='utf-8'))['samples']
        for i in range(10):
            for variant in ['repeat','fresh']:
                if sum(r['group']==f'context-{size}-{variant}' for r in rows)>i:continue
                seed=fixed if variant=='repeat' else fixed+(i+1)*10000
                # Fresh content changes throughout the prefix; do not call it a verified cold cache.
                filler=''.join(f'第{seed+j}项：这是一段用于测量预填充速度的测试文本，包含若干中文词组。' for j in range(size))
                mid=f'MID_{seed}';end=f'END_{seed}'
                prompt=filler[:len(filler)//2]+f'\n中部暗号={mid}\n'+filler[len(filler)//2:]+f'\n尾部暗号={end}\n请原样输出中部暗号和尾部暗号，不解释。'
                group=f'context-{size}-{variant}'
                fixture=TASK/'夹具'/f'{group}-{i}.txt';fixture.parent.mkdir(exist_ok=True)
                fixture.write_text(prompt,encoding='utf-8')
                row=SAMPLER.measure(target,body(target,prompt,512),cases=['PERF-04'],group=group,
                    expected={'contains':[mid,end],'terminal_allowed':['completed'],'nonempty':True})
                row['fixture']={'path':str(fixture.relative_to(TASK)).replace('\\','/'),'sha256':hashlib.sha256(fixture.read_bytes()).hexdigest()}
                rows.append(row)
                save_group(group,[r for r in rows if r['group']==group])


def tools():
    from llm_probe.capacity_suite import make_turn,Budget
    target=TARGETS['gateway-responses'];plan=dict(workload='tool',model='flash',effort='low',output_tokens=1024,tool_output_tokens=512)
    turn=make_turn(target,STORE,plan,Budget(60),'PERF-02','tool')
    path=TASK/'结果'/'tool-timing.json'
    rows=json.loads(path.read_text(encoding='utf-8'))['turns'] if path.exists() else []
    import dataclasses
    for i in range(len(rows),30):
        t=turn(0,i)
        rows.append(dataclasses.asdict(t)|{'checks':t.checks,'evidence':t.evidence})
        p=TASK/'结果'/'tool-timing.json';p.parent.mkdir(exist_ok=True)
        p.write_text(json.dumps({'group':'tool-timing','turns':rows,'attempted':len(rows),'succeeded':sum(t['ok'] for t in rows)},ensure_ascii=False,indent=2),encoding='utf-8')
        print(f'tool-timing {i+1}/30 ok={t.ok}',flush=True)


def burst():
    target=TARGETS['gateway-responses']
    for n in [1,5,10]:
        rows=[];waves=[]
        for wave in range(3):
            start=time.monotonic()
            def one(i):
                return SAMPLER.measure(target,body(target,'请按编号逐行列举生活中的100个细节观察。',800),
                    cases=['CAP-01','PERF-05'],group=f'burst-{n}',
                    expected={'nonempty':True,'terminal_allowed':['completed'],'output_cap':800})
            with concurrent.futures.ThreadPoolExecutor(n) as pool: got=list(pool.map(one,range(n)))
            rows+=got;waves.append({'wave':wave,'wall_s':time.monotonic()-start,'attempted':len(got),
                'boundary_valid':sum(r['ok'] for r in got),'fully_completed':sum(r['fully_completed'] for r in got),
                'service_output_tokens':sum(r['metrics']['output_tokens'] or 0 for r in got)})
        save_group(f'burst-{n}',rows)
        (TASK/'结果'/f'burst-{n}-waves.json').write_text(json.dumps(waves,ensure_ascii=False,indent=2),encoding='utf-8')


def stability():
    target=TARGETS['gateway-responses'];start=time.monotonic();rows=[];resources=[]
    while time.monotonic()-start<600 or len(rows)<100:
        if time.monotonic()-start>900:break
        rows.append(SAMPLER.measure(target,body(target,'只输出 PERF_STABLE_7f91'),cases=['PERF-08'],group='stability',
            expected={'exact_text':'PERF_STABLE_7f91'}))
        resources.append({'elapsed':time.monotonic()-start,'process_cpu_s':time.process_time(),'threads':__import__('threading').active_count()})
        save_group('stability',rows)
        (TASK/'结果'/'stability-resources.json').write_text(json.dumps(resources,indent=2),encoding='utf-8')
        time.sleep(5)
    (TASK/'结果'/'stability-window.json').write_text(json.dumps(dict(elapsed=time.monotonic()-start,attempted=len(rows),
        sample_met=time.monotonic()-start>=600 and len(rows)>=100,think_time=5,users=1,slo='unconfirmed'),indent=2),encoding='utf-8')


steps={'foundation':foundation,'long':long_and_output,'contexts':contexts,'tools':tools,'burst':burst,'stability':stability}
if __name__=='__main__':
    for name in sys.argv[1:]:
        print('BEGIN '+name,flush=True);steps[name]();print('END '+name,flush=True)
