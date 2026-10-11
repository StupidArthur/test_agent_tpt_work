"""Separate transport timing from exact-answer quality; reuse all recorded attempts."""
import hashlib,json,sys
from pathlib import Path
TASK=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(TASK.parents[1]/'04-测试项/saas-llm-test/code'))
from llm_probe.stats import summarise
d=json.loads((TASK/'短请求/results.json').read_text(encoding='utf-8'))
rows=d['samples']
valid=[r for r in rows if all(r['checks'][k] for k in ['http200','no_transport_error','valid_json','terminal']) and r['normalized'].get('text')]
stats={k:summarise([r['metrics'][k] for r in valid]).to_dict() for k in ['e2e','first_text']}
result={'attempted':len(rows),'transport_completed':len(valid),'exact_OK':sum(r['checks']['exact_text'] for r in rows),'answer_texts':[r['normalized']['text'] for r in rows],'metrics_seconds':stats,'note':'Timing includes OK. answers; original exact_text failures retained. No new requests.'}
(TASK/'短请求/timing-summary.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
lines=['# 单并发短请求响应时间（完整样本统计）','', 'flash / think_level=low，公网 TPT 网关 Chat Completions；只要求回复 OK，输出上限 128 token。10 次顺序执行，无预热排除、无重试，每次独立连接，耗时包含连接建立。','',f"HTTP 200 且完整响应 {len(valid)}/10。正文 6 次为 OK、4 次为 OK.，原严格文字断言失败保留；响应时间统计包含这 10 个完整响应，避免只挑文字完全匹配的较快样本。",'', '|指标|平均|P50|P95|最小|最大|','|---|---:|---:|---:|---:|---:|']
for k,label in [('first_text','首正文'),('e2e','完整响应')]:lines.append('|'+label+'|'+'|'.join(f'{stats[k][key]:.3f} 秒' for key in ['mean','p50','p95','min','max'])+'|')
lines+=['','首正文与完整耗时在本轮记录精度下相同，SSE 正文集中到达；不能据此解释为模型内部生成首 token 的时间。P95 是 10 样本最近秩值，等于最大值。输入 13 token，报告输出 14～48 token，包含哪些推理/计量内容本轮没有验证。','', '原始记录：results.json；证据索引：证据索引.jsonl；首版报告只统计严格 OK 匹配样本，完整响应性能以本报告为准。']
(TASK/'短请求/响应时间报告.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
index=[]
for p in TASK.rglob('*'):
    if p.is_file() and p.name!='evidence-index.json':index.append({'path':p.relative_to(TASK).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest().upper(),'case':'GW-SHORT-C1' if '短请求' in p.parts or p.name.startswith('short_') else 'GW-CONCURRENCY'})
(TASK/'evidence-index.json').write_text(json.dumps(index,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=True))
