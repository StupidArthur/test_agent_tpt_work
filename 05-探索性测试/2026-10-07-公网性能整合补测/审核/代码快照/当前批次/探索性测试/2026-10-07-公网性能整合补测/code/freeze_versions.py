"""Source snapshots and declared public measurement plan; never stores credentials."""
import hashlib,json,platform,subprocess
from pathlib import Path
task=Path(__file__).resolve().parents[1];repo=task.parents[1]
snapshot=task/'审核'/'代码快照';snapshot.mkdir(parents=True,exist_ok=True)
files=list((repo/'04-测试项/saas-llm-test/code/llm_probe').glob('*.py'))+list((task/'code').glob('*.py'))
records=[]
for f in files:
    data=f.read_bytes();name=f.relative_to(repo).as_posix()
    dest=snapshot/'当前批次'/name;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
    records.append({'path':name,'sha256':hashlib.sha256(data).hexdigest(),'snapshot':dest.relative_to(task).as_posix()})
old=json.loads((task/'代码版本-基础批次.json').read_text(encoding='utf-8'))
reconstructed=[]
for entry in old['files']:
    f=repo/entry['path'];data=f.read_bytes()
    if f.name=='performance.py':
        data=data.replace(b"        if 'min_text_chars' in expected: checks['min_text_chars']=len(ns.text)>=expected['min_text_chars']\n",b'')
        data=data.replace(b",start_monotonic=res.t0,end_monotonic=res.t_end",b'')
    if f.name=='run_performance.py':
        data=data.replace(b"'min_text_chars':1200,",b'')
        current="'service_output_tokens':sum(r['metrics']['output_tokens'] for r in got) if all(r['metrics']['output_tokens'] is not None for r in got) else None,\n                'peak_active_requests':max(sum(r['start_monotonic']<=p<r['end_monotonic'] for r in got) for p in [r['start_monotonic'] for r in got])"
        data=data.replace(current.encode(),b"'service_output_tokens':sum(r['metrics']['output_tokens'] or 0 for r in got)")
    match=hashlib.sha256(data).hexdigest()==entry['sha256']
    reconstructed.append({'path':entry['path'],'matches_original_manifest':match})
    if match:
        dest=snapshot/'基础批次'/entry['path'];dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
plan={'public_only':True,'intranet':'user excluded this run','model':'flash','effort':'low','credential_mode':'single test key per target',
    'credentials_source':'04-测试项/saas-llm-test/archive/v1/llm-bench-kit/config.json (values not copied)',
    'performance_requests_max':1000,'capacity_measurement_requests_max':3000,'task_total_requests_max':4000,
    'max_concurrent_requests':10,'user_levels':[1,5,10],'think_time_s':5,
    'closed_windows':{'min_seconds':120,'min_turns':30,'max_seconds':240},
    'open_arrivals':{'rates_turns_per_s':[.25,.5,1],'seconds_each':120,'max_in_flight':10,'queue_limit':10},
    'stability':{'users':1,'min_seconds':600,'min_turns':100,'max_seconds':900},
    'slo':None,'formal_CAP04':'not executable: no confirmed SLO or candidate boundary; do not fake it',
    'baseline_and_recovery_turns':10,'recovery_tolerance':None,'long_body_min_chars':1200,
    'comparison':'protocol/model/thinking mapping differs; client path measurements only',
    'approval_reference':'user: 整合整体测试用例、补测缺少；内网不用管。负载限制延续已测1/5/10范围。'}
(task/'运行计划.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf-8')
(task/'代码版本-补测批次.json').write_text(json.dumps({'files':records,'foundation_reconstruction':reconstructed,
    'python':platform.python_version(),'platform':platform.platform(),'parent_commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip()},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'files':len(records),'foundation_reconstruction':reconstructed},ensure_ascii=False))
