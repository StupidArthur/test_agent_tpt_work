"""Manager's coverage/report, built only after raw evidence audit completes."""
import hashlib,json,collections
from pathlib import Path
task=Path(__file__).resolve().parents[1];repo=task.parents[1]
load=lambda name:json.loads((task/name).read_text(encoding='utf-8'))
audit=load('验收校验.json')
if audit['issues']:raise SystemExit('Evidence audit failed')
old='../2026-10-07-LLM网关服务评估'
complete=['API-'+f'{i:02d}' for i in range(1,11)]+['TPT-01','TPT-03','TPT-04','TPT-06','TPT-07','TPT-08','TPT-09']+['PERF-'+f'{i:02d}' for i in range(1,9)]+['CAP-01']
partial=['API-11','API-12','TPT-02','TPT-05','CAP-02','CAP-03','CAP-05','CAP-06']
unverified=['TPT-10','CAP-04']
coverage=[]
for group,n in [('API',12),('TPT',10),('PERF',8),('CAP',6)]:
    for i in range(1,n+1):
        ident=f'{group}-{i:02d}'
        status='完整采样/检查' if ident in complete else '部分检查' if ident in partial else '未验证'
        notes={
          'API-11':'自然pro503状态/错误体已观测；缺响应头、隔离429和同模型故障解除后恢复，不制造公网服务故障。',
          'API-12':'既有客户端取消已覆盖；慢读/半断开仍缺隔离条件。',
          'TPT-02':'目录已取；当前TPT适配器身份与字段消费规则未取得。',
          'TPT-05':'flash-backup-ds旧图片证据保留；pro新可用性及条件图片见本轮结果。',
          'TPT-07':'真实文本/工具完整输出含reasoning项目回传均已成功；简化数组拒绝单列DIFF-04，不概括为历史均不可用。',
          'CAP-02':'已测固定历史文本用户1/5/10；SLO未确认，不判达标容量。',
          'CAP-03':'已测本地加法工具用户1/5/10；SLO未确认，不代表外部慢工具。',
          'CAP-04':'没有确认SLO和达标候选；未跑两个独立边界持续窗口。',
          'CAP-05':'三个安全低速率验证新调度；尚未定位服务排队/吞吐边界。',
          'CAP-06':'压前9/10（1次预算截断）、压后10/10；无全成功基线，恢复容差和最终容量均未确认。'}
        coverage.append({'case':ident,'coverage':status,'note':notes.get(ident,'既有可信基础证据复用或本轮完成；完整检查不等于全部通过/SLO达标。')})
lines=['# 整合后的36项覆盖','', '保留原36个编号及全部检查点，历史性能场景作为子项。内网仅本轮用户排除；没有删设计范围。完整采样/检查与业务通过分开。所有TPT项仍缺当前宿主适配器身份，以下是直接API观察，不是当前软件完整适配验收。','',
       '| 编号 | 覆盖 | 说明 |','|---|---|---|']
lines.extend(f"| {r['case']} | {r['coverage']} | {r['note']} |" for r in coverage)
lines+=['',f'完整采样/检查{len(complete)}，部分{len(partial)}，未验证{len(unverified)}；不是通过率。',
         '',f'既有检查点的证据映射见 [{old}覆盖表]({old}/补测/todo_1/36项覆盖表.md)。本轮逐项原始证据以证据索引instances关联，结果组见测量表。']
(task/'整体覆盖.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
(task/'整体覆盖.json').write_text(json.dumps(coverage,ensure_ascii=False,indent=2),encoding='utf-8')
stable=load('结果/stability-window.json')
if not stable['sample_met']:raise SystemExit('Stability sample incomplete; adjust coverage before final report')
failure=load('结果/采样判据未满足.json')
pro=load('结果/pro-availability.json')['samples'][0]
tool=load('结果/tool-timing.json')
budget_control=load('结果/arrival-budget-control.json')['samples'][0]
negative=load('结果/negative-controls.json')
negative_ok=all(r.get('expected_rejection',r.get('expected_health',False)) for r in negative)
closed=[load('结果/用户曲线/'+f'{w}-{u}.json') for w in ['text','tool'] for u in [1,5,10]]
if not all(x['sample_met'] for x in closed):raise SystemExit('Closed windows incomplete; adjust report')
recovery=load('结果/用户曲线/recovery.json');baseline=load('结果/用户曲线/baseline.json')
refs=lambda group:[r['evidence'] for r in load('结果/'+group+'.json')['samples']]
diffs=[
 {'id':'DIFF-01','status':'计量语义待确认','observation':'保留可见推理与reasoning_tokens=0观察；不推导隐藏推理的计费组成。','evidence':refs('efforts-low')+refs('efforts-high')},
 {'id':'DIFF-02','status':'宿主影响未验证','observation':'目录多个is_default=true历史观察保留；无唯一性契约和当前宿主选择证据。','evidence_file':'目标准备.json'},
 {'id':'DIFF-03','status':'上游前置未满足','observation':'pro再次503，no available channels；flash-backup-ds旧图片成功证据保留。','evidence':refs('pro-availability')},
 {'id':'DIFF-04','status':'形态差异已复核，合法性待核定','observation':'字符串与包含reasoning的真实完整文本/工具output项目回传200；简化assistant output_text数组400。未隔离出决定性字段。','evidence':refs('history-wire')+refs('history-real-items')+refs('tool-real-output')},
 {'id':'DIFF-05','status':'旧代理异常仍缺独立证据','observation':'本轮直接客户端路径结果不代替旧代理502的归因证据。','historical_source':old+'/测试结果审核报告.md'},
 {'id':'DIFF-06','status':'预算截断观察，不直接判bug','observation':'低预算incomplete可伴空正文；不当完整成功，不断言预算组成。','evidence':refs('terminal-wire')},
 {'id':'DIFF-07','status':'事件与内层状态差异已取得完整末帧','observation':'16/32/512各2个流式截断，共6个末帧均为response.completed，但内层status=incomplete；非流式同为incomplete。按内层状态解析，本轮不再误判。协议定级仍待契约。','evidence':refs('terminal-wire')},
 {'id':'DIFF-08','status':'跨模型结构契约仍待确认','observation':'保留历史跨模型推理/usage/opaque ID差异；本轮性能采样不证明跨模型所有结构完全一致。','historical_source':old+'/测试结果审核报告.md'}]
(task/'候选问题复核.json').write_text(json.dumps(diffs,ensure_ascii=False,indent=2),encoding='utf-8')
context=load('结果/context-cache-fields.json')
cached=next(x for x in context if x['group']=='context-2500-repeat')
g=load('结果/gateway-responses-long-stream.json')['summary']['all_attempt_metrics']
chat=load('结果/gateway-chat-long-stream.json')['summary']['all_attempt_metrics']
report=['# 公网整合补测报告','',
 '已完成本轮可执行队列及记录；内网按用户要求未测。复用旧可信基础证据，新增缺失场景，不将旧样本混入新统计。', '',
 '## 结论','',
 '公网主力模型具备已测文本、上下文和工具能力。本轮补齐了完整长输出、长上下文、输出规模、思考档、多公网路径、持续窗口和用户曲线测量。仍不能给出最大支持用户数：业务SLO、边界持续复核、配额及真实业务负载尚不足。', '',
 f"本轮已登记HTTP请求{audit['actual_http_requests']}次（含暖机、探针、负向和工具第二次请求），证据{audit['index_records']}项逐个校验通过。用户暂停时终止的在途请求无完整证据，额外计为未完成请求，未加入成功统计；不保证服务端已停算。", '',
 '## 关键观察','',
 f"- Responses完整长流10/10；E2E平均{g['e2e']['mean']:.3f}秒，服务返回output token/E2E平均{g['output_tokens_per_e2e']['mean']:.1f} token/s。该口径包含服务计量组成，不是纯正文解码速率。",
 f"- Chat长流正文增量跨度{chat['text_span']['min']:.3f}～{chat['text_span']['max']:.3f}秒；不支持把整个接口概括为假流式。旧报告的短流集中到达观察保留，测试方法、时间和负载不同。",
 f"- 约57.5K输入的重复样本，服务报告缓存计量为正{cached['service_reported_cache_positive_samples']}/10；完整字段见context-cache-fields.json，不能把所有重复样本都叫缓存命中。",
 f"- 工具时点场景{tool['succeeded']}/{tool['attempted']}整轮成功；两次请求及最终正文42均保留。",
 '- 直连短回答原30样本中2次length截断，原结果保留；扩大预算的有限对照另组统计，不补成原通过。',
 '- 历史800预算并发48请求为预算截断，不能叫网关并发故障；8192预算完整并发对照独立记录，不能混合成功率。',
 f"- 单用户持续{stable['elapsed']:.1f}秒，{stable['attempted']}轮；逐分钟指标已生成，不由平均值声称长期无问题。",
 f"- 鉴权/非法字段拒绝与紧随健康对照：全部预定判据满足={negative_ok}。",
 f"- pro当前可用性探针HTTP {pro['http']}，终态{pro['normalized']['terminal']}；图片子项只在前置可用时执行。",
 f"- 压前实际9/10成功，第5次为256预算截断、正文空；压后10/10成功。压前基线并非全成功，不能用其p95比较声称已恢复，恢复容差也未知。详见 [容量轮次未满足](结果/容量轮次未满足.json)。", '',
 f"- 开放到达0.25/0.5/1轮每秒分别30/30、59/60、120/120，均无拒绝且对账成立。0.5档唯一失败为HTTP200、incomplete/max_output_tokens、输出256、正文空且推理非空；同输入预算1024的单次对照成功={budget_control['ok']}，未改写原59/60。不将此定位成服务排队/并发容量故障。", '',
 '## 结果与差异复核','',
 f'未满足采样判据的正式请求{len(failure)}个，见 [逐项记录](结果/采样判据未满足.json)。这是截断、内容负载不足、形态拒绝等的合计，不是bug数量。预期401/400负向请求另列。',
 'DIFF-04字符串和真实完整输出项目（文本/工具均含reasoning）回传成功，简化assistant output_text数组被拒绝，原始请求/响应已保存；不能概括为所有结构化历史都失败，也未隔离出究竟哪个字段导致差异。协议合法性及当前宿主实际发送形态仍待明确。DIFF-07已补16/32/512预算的流式/非流式末帧，6个低预算流式样本均为response.completed事件承载内层incomplete，按内层status识别终态，不能按事件名判完整完成。旧推断和原始观察不删除；8个历史编号分别见 [候选复核](候选问题复核.json)。', '',
 '## 覆盖和限制','',
 f'[整体覆盖](整体覆盖.md)：36项保留，完整采样/检查{len(complete)}、部分{len(partial)}、未验证{len(unverified)}。完全未验证为流内故障TPT-10及正式边界CAP-04；API-11只有自然503子项。性能采样完成不等于SLO达标。',
 '当前TPT适配器身份未取得；单测试key、固定历史、本地加法不能代表生产多账户、增长历史和慢工具；两条公网路径的协议、请求模型、思考wire映射及输出量未完全一致，差值不归因纯网关开销。开放到达是三个安全低速率的新调度实测，未找到吞吐失败边界。', '',
 '## 可复盘交付','',
 '[测量表](测量表.md)、结果/、证据索引.jsonl、运行日志/客户端资源.jsonl、运行计划.json、代码版本与审核/代码快照/、[暂停续跑记录](中断记录.md)。原始证据带SHA-256及归属编号。',
 '正式复用新增性能Sampler/aggregate与到达时点字段；任务控制器和场景函数保留在本任务，后续复用前按目标/负载绑定。所有产品差异待双方审核，未自动写入产品知识。']
(task/'报告.md').write_text('\n'.join(report)+'\n',encoding='utf-8')
files=[task/'验收校验.json',task/'测量表.md',task/'整体覆盖.md',task/'运行计划.json',task/'代码版本-补测批次.json',task/'代码版本-收尾批次.json',task/'候选问题复核.json',
       repo/'04-测试项/saas-llm-test/report-3way.md',repo/'探索性测试/2026-10-07-LLM网关服务评估/测试结果审核报告.md']
source=[{'path':f.relative_to(repo).as_posix(),'sha256':hashlib.sha256(f.read_bytes()).hexdigest().upper(),'cases':['API','TPT','PERF','CAP']} for f in files]
(task/'报告依据索引.json').write_text(json.dumps(source,ensure_ascii=False,indent=2),encoding='utf-8')
print('Report generated; explicit limitations retained')
