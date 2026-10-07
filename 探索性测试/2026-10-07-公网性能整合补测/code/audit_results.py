"""Offline evidence audit and transparent measurement tables; no new requests."""
import collections,hashlib,json
from pathlib import Path
task=Path(__file__).resolve().parents[1]
pro=json.loads((task/'结果'/'pro-availability.json').read_text(encoding='utf-8'))['samples'][0]
shared=task/'证据'/'shared'/'api11-pro503.json'
if pro['http']==503 and not shared.exists():
    import sys
    sys.path.insert(0,str(task.parents[1]/'04-测试项/saas-llm-test/code'))
    from llm_probe.evidence import EvidenceStore
    EvidenceStore(str(task/'证据')).write_json('shared/api11-pro503.json',
        {'source':pro['evidence'],'http':503,'error_body':pro['body_text'],
         'scope':'natural 5xx status/body observed only; headers,429,injected fault and same-model recovery unverified'},
        instances=['API-11','TPT-05'],kind='shared_observation')
index=[json.loads(x) for x in (task/'证据索引.jsonl').read_text(encoding='utf-8').splitlines() if x.strip()]
issues=[];counts=collections.Counter();raw=[]
indexed_paths={r['rel_path'] for r in index}
unindexed=[f.relative_to(task/'证据').as_posix() for f in (task/'证据').rglob('*') if f.is_file() and f.relative_to(task/'证据').as_posix() not in indexed_paths]
if unindexed:issues.append({'unindexed_evidence':unindexed})
for rec in index:
    f=task/'证据'/rec['rel_path']
    if not f.exists():issues.append('missing '+rec['rel_path']);continue
    if hashlib.sha256(f.read_bytes()).hexdigest().upper()!=rec['sha256']:issues.append('hash '+rec['rel_path'])
    if not rec.get('instances'):issues.append('unbound '+rec['rel_path'])
    counts[rec['kind']]+=1
    if f.suffix.lower()!='.json':continue  # binary fixture hashes are still checked above
    try:o=json.loads(f.read_text(encoding='utf-8'))
    except ValueError:issues.append('JSON '+rec['rel_path']);continue
    if rec['kind']=='performance_wire':raw.append(o|{'evidence':rec})
groups=[]
tool_timings=[]
tool_path=task/'结果'/'tool-timing.json'
if tool_path.exists():
    for turn in json.loads(tool_path.read_text(encoding='utf-8'))['turns']:
        ticks={'first_event':None,'first_reasoning':None,'first_text':None,'first_tool':None}
        for ref in turn['evidence']:
            o=json.loads((task/'证据'/ref).read_text(encoding='utf-8'))
            for fr in o['frames']:
                ts=fr['t']-turn['start'];ev=fr['event']
                try:obj=json.loads(fr['data'])
                except ValueError:obj={}
                if ticks['first_event'] is None:ticks['first_event']=ts
                key=None
                if ev in ['response.reasoning_text.delta','response.reasoning_summary_text.delta'] and obj.get('delta'):key='first_reasoning'
                if ev=='response.output_text.delta' and obj.get('delta'):key='first_text'
                if ev=='response.function_call_arguments.delta' or (ev=='response.output_item.added' and obj.get('item',{}).get('type')=='function_call'):key='first_tool'
                if key and ticks[key] is None:ticks[key]=ts
        tool_timings.append({'start':turn['start'],'ok':turn['ok'],'e2e':turn['end']-turn['start'],**ticks,
            'evidence':turn['evidence']})
    (task/'结果'/'tool-timings-derived.json').write_text(json.dumps(tool_timings,ensure_ascii=False,indent=2),encoding='utf-8')
for f in sorted((task/'结果').glob('*.json')):
    o=json.loads(f.read_text(encoding='utf-8'))
    if isinstance(o,dict) and 'summary' in o:
        s=o['summary'];rows=o['samples']
        if s['attempted']!=len(rows) or s['succeeded']!=sum(x['ok'] for x in rows):issues.append('count '+f.name)
        groups.append((o['group'],s))
ids=[r['sample_id'] for r in raw]
if len(ids)!=len(set(ids)):issues.append('duplicate sample UUID')
for r in raw:
    if r['ok']!=all(v is True for v in r['checks'].values()):issues.append('checks '+r['sample_id'])
    # Independently assemble visible content and inspect raw termination, not just cached ok flags.
    if r['request'].get('stream') and r['raw_frames']:
        pieces=[];terminal=None;final=''
        for frame in r['raw_frames']:
            try:o=json.loads(frame['data'])
            except ValueError:continue
            if not isinstance(o,dict):continue
            if r['protocol']=='responses':
                if frame['event']=='response.output_text.delta':pieces.append(o.get('delta',''))
                if frame['event'] in ['response.completed','response.incomplete','response.failed']:
                    response=o.get('response',{})
                    terminal=response.get('status')
                    final=''.join(c.get('text','') for item in response.get('output',[]) if item.get('type')=='message' for c in item.get('content',[]) if c.get('type')=='output_text')
            else:
                for choice in o.get('choices',[]):
                    pieces.append((choice.get('delta') or {}).get('content') or '')
                    finish=choice.get('finish_reason')
                    if finish:terminal='incomplete' if finish=='length' else 'completed'
        visible=''.join(pieces) or final
        if visible!=r['normalized']['text']:issues.append('raw text assembly '+r['sample_id'])
        if terminal is not None and terminal!=r['normalized']['terminal']:issues.append('raw terminal '+r['sample_id'])
    elif r['body_text']:
        try:o=json.loads(r['body_text'])
        except ValueError:o={}
        if isinstance(o,dict) and r['http']==200:
            if r['protocol']=='responses':
                visible=''.join(c.get('text','') for item in o.get('output',[]) if item.get('type')=='message' for c in item.get('content',[]) if c.get('type')=='output_text')
            else:visible=((o.get('choices') or [{}])[0].get('message') or {}).get('content') or ''
            if visible!=r['normalized']['text']:issues.append('raw JSON text '+r['sample_id'])
    for key in ['first_event','first_reasoning','first_text','first_tool']:
        v=r['metrics'].get(key)
        if v is not None and (v<0 or v>r['metrics']['e2e']+.01):issues.append('clock '+r['sample_id'])
    cap=r['expected'].get('output_cap');out=r['metrics']['output_tokens']
    if cap is not None and out is not None and out>cap:issues.append('token cap exceeded '+r['sample_id'])
formal=[r for r in raw if not r['warmup']]
contexts=[]
for group in sorted(set(r['group'] for r in formal if r['group'].startswith('context-'))):
    subset=[r for r in formal if r['group']==group]
    values=[(r['normalized']['usage'] or {}).get('input_tokens_details',{}).get('cached_tokens') for r in subset]
    contexts.append({'group':group,'samples':len(subset),'cached_tokens_values':values,
        'service_reported_cache_positive_samples':sum(isinstance(v,int) and v>0 for v in values),
        'missing_cache_field':sum(v is None for v in values),'evidence':[r['evidence'] for r in subset]})
(task/'结果'/'context-cache-fields.json').write_text(json.dumps(contexts,ensure_ascii=False,indent=2),encoding='utf-8')
regular=[r for r in formal if not r['group'].startswith(('auth-missing','auth-invalid','invalid-'))]
http_counts=collections.Counter(str(r['http']) for r in formal)
stability=[r for r in formal if r['group']=='stability'];minutes=[]
if stability:
    from sys import path
    path.insert(0,str(task.parents[1]/'04-测试项/saas-llm-test/code'))
    from llm_probe.performance import aggregate
    first=min(r['start_monotonic'] for r in stability)
    for minute in sorted(set(int((r['start_monotonic']-first)//60) for r in stability)):
        subset=[r for r in stability if int((r['start_monotonic']-first)//60)==minute]
        a=aggregate(subset)
        minutes.append({'minute':minute+1,'attempted':len(subset),'successful':sum(r['ok'] for r in subset),
            'e2e_s':a['all_attempt_metrics']['e2e'],'first_text_s':a['all_attempt_metrics']['first_text'],
            'usage_present':sum(r['metrics']['output_tokens'] is not None for r in subset)})
    (task/'结果'/'stability-minutes.json').write_text(json.dumps(minutes,ensure_ascii=False,indent=2),encoding='utf-8')
audit={'index_records':len(index),'actual_http_requests':sum(counts[k] for k in ['target_discovery','performance_wire','capacity_wire']),
       'request_kinds':dict(counts),'formal_performance_samples':len(formal),'warmup_samples':len(raw)-len(formal),
       'formal_performance_http':dict(http_counts),'issues':issues,'expected_negative_requests_excluded_from_success_rate':True}
(task/'验收校验.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
fmt=lambda v:'—' if v is None else f'{v:.3f}'
lines=['# 补测测量表','', '自动汇总；“判据满足”表示该场景的采样判据，不代表SLO达标。截断边界组允许incomplete，完整回答另列。分位数为最近秩。','',
       '| 场景 | 正式样本 | 判据满足 | 完整终态 | 全尝试E2E均值 / p95秒 | 全尝试首正文p95秒 |',
       '|---|---:|---:|---:|---|---:|']
for name,s in groups:
    m=s['all_attempt_metrics'];e=m['e2e']
    lines.append(f"| {name} | {s['attempted']} | {s['succeeded']} | {s['complete']} | {fmt(e['mean'])} / {fmt(e['p95'])} | {fmt(m['first_text']['p95'])} |")
lines+=['','## 闭环用户曲线','','SLO未知，只有负载测量。固定历史，每轮独立；工具为本地加法，工具耗时很小，不代表真实外部慢工具。','',
        '| 负载 | 用户 | 持续秒 | 轮次成功/尝试 | 请求峰值 | 整轮p95秒 | 首正文p95秒 | 样本条件 |',
        '|---|---:|---:|---:|---:|---:|---:|---|']
root=task/'结果'/'用户曲线'
if root.exists():
    for f in sorted(root.glob('*.json')):
        o=json.loads(f.read_text(encoding='utf-8'))
        if 'workload' not in o:continue
        lines.append(f"| {o['workload']} | {o['users']} | {o['duration']:.1f} | {o['successful_turns']}/{o['attempted_turns']} | {o['request_peak']} | {fmt(o['turn_e2e_s']['p95'])} | {fmt(o['first_text_s']['p95'])} | {o['sample_met']} |")
lines+=['','## 持续窗口逐分钟','','| 分钟 | 判据满足/尝试 | E2E p95秒 | 首正文p95秒 | 有计量样本 |','|---|---:|---:|---:|---:|']
for m in minutes:lines.append(f"| {m['minute']} | {m['successful']}/{m['attempted']} | {fmt(m['e2e_s']['p95'])} | {fmt(m['first_text_s']['p95'])} | {m['usage_present']} |")
lines+=['','## 未满足采样判据的正式请求','','负向401/400是预期拒绝，单列于negative-controls，不当网关失败。其余请求保留检查项、正文及原始wire。','']
failures=[]
for r in regular:
    if r['ok']:continue
    failures.append({'sample_id':r['sample_id'],'group':r['group'],'cases':r['cases'],'checks':r['checks'],
        'http':r['http'],'terminal':r['normalized']['terminal'],'evidence':r['evidence']})
(task/'结果'/'采样判据未满足.json').write_text(json.dumps(failures,ensure_ascii=False,indent=2),encoding='utf-8')
capacity_failures=[]
for f in (task/'结果'/'用户曲线').glob('*.json'):
    obj=json.loads(f.read_text(encoding='utf-8'))
    for turn in obj.get('turns',[]):
        if turn['ok']:continue
        details=[]
        for ref in turn['evidence']:
            wire=json.loads((task/'证据'/ref).read_text(encoding='utf-8'))
            ns=wire['normalized']
            details.append({'path':ref,'normalized_terminal':ns['terminal'],'reason':ns['terminal_reason'],
                'text':ns['text'],'reasoning_chars':len(ns['reasoning']),'usage':ns['usage'],
                'http':wire['response']['http_status']})
        capacity_failures.append({'group':f.stem,'checks':turn['checks'],'evidence':details})
(task/'结果'/'容量轮次未满足.json').write_text(json.dumps(capacity_failures,ensure_ascii=False,indent=2),encoding='utf-8')
lines.append(f'共{len(failures)}个，见 [逐项记录](结果/采样判据未满足.json)。终态截断、长度负载不足、输入形态拒绝分别分析，不自动定级bug。')
lines+=['',f"原始HTTP请求{audit['actual_http_requests']}次；证据索引{len(index)}项；独立校验issues={issues}。"]
(task/'测量表.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print(json.dumps(audit,ensure_ascii=False))
if issues:raise SystemExit(1)
