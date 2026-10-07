"""Build auditable report from completed waves without sending requests."""
import collections,gzip,hashlib,json
from pathlib import Path
TASK=Path(__file__).resolve().parents[1]
waves=[json.loads(p.read_text(encoding='utf-8')) for p in sorted(TASK.glob('wave-*.json'),key=lambda p:int(p.stem.split('-')[1]))]
recovery_path=TASK/'recovery-1.json'
recovery=json.loads(recovery_path.read_text(encoding='utf-8')) if recovery_path.exists() else None
all_waves=waves+([recovery] if recovery else [])
usage=collections.Counter();failures=[];verification=[]
for w in all_waves:
    for r in w['rows']:
        for k,v in (r.get('usage') or {}).items():
            if isinstance(v,int):usage[k]+=v
        raw=gzip.decompress((TASK/r['response_path']).read_bytes())
        if hashlib.sha256(raw).hexdigest().upper()!=r['response_sha256']:verification.append(r['id'])
        if not r['complete']:failures.append(r)
(TASK/'failure-details.json').write_text(json.dumps(failures,ensure_ascii=False,indent=2),encoding='utf-8')
first=next((w for w in waves if w['complete']!=w['planned']),None)
last_good=next((w for w in reversed(waves) if w['complete']==w['planned']),None)
lines=['# TPT 网关并发报错验证报告（待审）','','## 结论','']
if first:
    lines.append(f"首次出现异常的批次为 **{first['planned']} 请求并发启动**，完整返回 {first['complete']}/{first['planned']}；上一完整成功档位为 {last_good['planned'] if last_good else '无'}。该结果是批次首次异常点，不是精确稳定并发上限。")
else:lines.append(f"已测到 {waves[-1]['planned']} 请求档位，本轮各档全部完整成功；尚未找到报错边界，不称最大容量已测出。")
lines+=['','目标为公网 TPT 网关 `/tpt-work-router/v1/chat/completions`，模型 flash，think_level=low，单请求输出上限 1024。测试短提示持续生成数学条目，只验证接口状态与流终态，不评价答案质量或典型用户容量。','', '|请求档位|HTTP 状态分布|完整成功|已发送未结束峰值|200 未读完峰值|耗时秒|','|---|---|---:|---:|---:|---:|']
for w in all_waves:
    lines.append(f"|{w['label']}|{json.dumps(w['statuses'],ensure_ascii=False)}|{w['complete']}/{w['planned']}|{w['headers_sent_peak']}|{w['http200_unfinished_peak']}|{w['duration']:.3f}|")
lines+=['','## 异常与恢复','']
if failures:
    groups=collections.Counter((str(r.get('status','未取得状态')),r.get('error_type',''),json.dumps(r.get('stream_errors',[]),ensure_ascii=False)) for r in failures)
    for key,count in groups.items():lines.append(f'- {count} 次：HTTP={key[0]}，客户端异常={key[1] or "无"}，流内错误={key[2]}。')
    sample=next((r for r in failures if r.get('error_body')),failures[0])
    lines+=['','代表请求：`'+sample['id']+'`；原文：','', '```text',sample.get('error_body') or sample.get('error') or json.dumps(sample.get('stream_errors',[]),ensure_ascii=False),'```','', '完整逐请求异常见 `failure-details.json`，不能把客户端超时/连接失败归为网关明确拒绝；HTTP 200 未完成也不计成功。']
else:lines.append('本轮未观察到 HTTP、流内或客户端异常。')
if recovery:lines.append(f"\n停止升档后单请求恢复检查：{recovery['complete']}/1 完整成功。")
lines+=['','## 范围与限制','', '各轮正常读取、无自动重试，各轮排空再升档；首次异常后停止升档，仅一次恢复检查。headers_sent_peak 包含网络传输与服务端等待，200 未读完峰值包含缓冲读取，两者都不是服务端内部计数。没有网关内部计数与隔离账号保证，不据此声称精准最大并发或上游根因。', '',f"总请求 {sum(w['planned'] for w in all_waves)}；完整成功 {sum(w['complete'] for w in all_waves)}。已取得 usage 累计：`{json.dumps(dict(usage),ensure_ascii=False)}`，不等于未完成请求的完整账单。",'', '## 可复盘性','', '逐请求动作/时间/响应头/错误/usage 与响应解压后 SHA-256：`wave-*.json`、`recovery-1.json`；原始及部分响应：`responses/*.sse.gz`；来源代码：`code/test_limit.py`；环境与请求边界：`environment.json`、`README.md`。',f'\n全部响应解压哈希复核：issues={verification}。文件压缩字节哈希与报告/代码哈希见 `evidence-index.json`。本轮无 UI 操作、无设置改动，测试连接已关闭。']
(TASK/'报告.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
index=[]
for p in TASK.rglob('*'):
    if p.is_file() and p.name!='evidence-index.json':index.append({'path':p.relative_to(TASK).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest().upper(),'case':p.stem if p.name.startswith(('wave-','recovery-')) else 'GW-CONCURRENCY'})
(TASK/'evidence-index.json').write_text(json.dumps(index,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'requests':sum(w['planned'] for w in all_waves),'first_failure':first['planned'] if first else None,'last_good':last_good['planned'] if last_good else None,'hash_issues':verification},ensure_ascii=True))
