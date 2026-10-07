"""Offline verification and short-burst latency report; no API calls."""
import collections,gzip,hashlib,json,sys
from pathlib import Path
TASK=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(TASK.parents[1]/'04-测试项/saas-llm-test/code'))
from llm_probe.stats import summarise
waves=[json.loads(p.read_text(encoding='utf-8')) for p in sorted(TASK.glob('wave-*.json'),key=lambda p:int(p.stem.split('-')[1]))]
rec=TASK/'recovery-1.json'
all_waves=waves+([json.loads(rec.read_text(encoding='utf-8'))] if rec.exists() else [])
data=[];issues=[];failures=[]
for w in all_waves:
    good=[r for r in w['rows'] if r['complete']]
    answers=collections.Counter();usages=collections.Counter()
    for r in w['rows']:
        raw=gzip.decompress((TASK/r['response_path']).read_bytes())
        if hashlib.sha256(raw).hexdigest().upper()!=r['response_sha256']:issues.append(r['id'])
        content=[]
        for line in raw.decode('utf-8',errors='replace').splitlines():
            if line.startswith('data: '):
                try:
                    obj=json.loads(line[6:])
                    for c in obj.get('choices',[]):content.append((c.get('delta') or {}).get('content') or '')
                except ValueError:pass
        if r['complete']:answers[''.join(content).strip()]+=1
        else:failures.append(r)
        for k,v in (r.get('usage') or {}).items():
            if isinstance(v,int):usages[k]+=v
    row={k:v for k,v in w.items() if k not in ('rows','events')}
    row.update(e2e=summarise([r['end']-r['start'] for r in good]).to_dict(),first_bytes=summarise([r['first_bytes_at']-r['start'] for r in good if 'first_bytes_at' in r]).to_dict(),sent_to_end=summarise([r['end']-r['sent_at'] for r in good]).to_dict(),answers=dict(answers),usage=dict(usages))
    data.append(row)
(TASK/'latency-summary.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
(TASK/'failure-details.json').write_text(json.dumps(failures,ensure_ascii=False,indent=2),encoding='utf-8')
lines=['# TPT 网关短请求并发结果（待审）','', 'flash / think_level=low，固定短提示要求只回复 OK，输出上限 128；逐档并发启动，每档排空，无重试。全部同提示可能享受缓存，这不是长上下文/典型 Agent 测试。','', '|档位|完整返回|请求均值秒|P50 秒|P95 秒|最大秒|批次总秒|已发未结束峰值|200 未读完峰值|','|---|---:|---:|---:|---:|---:|---:|---:|---:|']
for r in data:
    s=r['e2e']; values=[f'{s[k]:.3f}' if s[k] is not None else '未观测' for k in ['mean','p50','p95','max']]
    lines.append(f"|{r['label']}|{r['complete']}/{r['planned']}|"+'|'.join(values)+f"|{r['duration']:.3f}|{r['headers_sent_peak']}|{r['http200_unfinished_peak']}|")
lines+=['','## 判定与异常','']
first=next((r for r in data if r['label'].startswith('wave-') and r['complete']!=r['planned']),None)
if first:
    lines.append(f"首次异常批次 {first['planned']}，HTTP 状态 {first['statuses']}，客户端异常 {first['client_errors']}。完整异常与原文见 failure-details.json。停止升档，不能以这一档声明精确服务端上限。")
    bodies=collections.Counter((str(r.get('status')),r.get('error_body','')) for r in failures if r.get('status') is not None)
    for (status,body),count in bodies.items():lines+=['',f'{count} 个 HTTP {status} 响应原文：','```text',body,'```']
    lines+=['', '500 的响应体是 nginx/1.14.1 通用错误页，无法仅凭它确定是连接资源、转发还是上游故障；503 明确报告 no available channels，也未给出具体上游限流计数。187 个连接失败保留在客户端异常类别，不算额外 500/503。本轮未观察到 429。']
else:lines.append(f"本轮测至计划 {waves[-1]['planned']} 请求档位，未观察到异常；尚未找到报错上限。实际重叠峰值见表，不能将计划档位直接称为服务端并发。")
lines+=['','## 响应时间口径','', '请求延迟从每次请求启动至读取完毕，包含本机连接/调度等待；首次响应体字节及已发请求头后的时间另保留于 latency-summary.json。响应头计时只证明本机已发未结束，不证明网关/上游内部执行数量。200 未读完峰值较低时可能涉及缓冲/串行接收，未用内部日志确认原因。','', '完整成功只证明 HTTP/流终态：正文变体与空输出逐档登记在 answers 字段，不冒充严格 OK 指令全部通过。无 token 下限假设，实际 usage 保留。', '',f"逐响应解压 SHA-256 校验 issues={issues}；共 {sum(r['planned'] for r in data)} 次请求。原始/部分响应见 responses/*.sse.gz、逐请求状态和时间见 wave-*.json。客户端会话关闭；超时连接关闭不代表已确认服务端内部任务终止。"]
(TASK/'报告.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
index=[]
for p in TASK.rglob('*'):
    if p.is_file() and p.name!='evidence-index.json':index.append({'path':p.relative_to(TASK).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest().upper(),'case':p.stem if p.name.startswith(('wave-','recovery-')) else 'GW-SHORT-BURST'})
(TASK/'evidence-index.json').write_text(json.dumps(index,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps([{k:r[k] for k in ['label','complete','planned','e2e','statuses','client_errors','answers']} for r in data],ensure_ascii=True))
