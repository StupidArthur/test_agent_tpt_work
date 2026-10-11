"""Bounded direct API concurrency test; no retries, no credential output."""
import asyncio, collections, hashlib, json, time
from pathlib import Path
import aiohttp

TASK=Path(__file__).resolve().parents[1]
ROOT=TASK.parents[1]
cfg=json.loads((ROOT/'04-测试项/saas-llm-test/archive/v1/llm-bench-kit/config.json').read_text(encoding='utf-8'))
target=next(t for t in cfg['targets'] if t['name']=='deepseek-flash-low')
URL=target['base_url'].rstrip('/')+'/chat/completions'
HEADERS={'Authorization':'Bearer '+target['api_key']}

async def wave(n):
    rows=[]; active=0; peak=0; accepted=0; accepted_peak=0
    start=time.perf_counter()
    connector=aiohttp.TCPConnector(limit=n,ssl=True,ttl_dns_cache=600)
    timeout=aiohttp.ClientTimeout(total=180,connect=60,sock_read=120)
    async with aiohttp.ClientSession(connector=connector,timeout=timeout,trust_env=False) as session:
        async def one(i):
            nonlocal active,peak,accepted,accepted_peak
            row={'id':f'C{n}-{i:04d}','start':time.perf_counter()-start}
            active+=1; peak=max(peak,active); is_accepted=False
            body={'model':'deepseek-flash','messages':[{'role':'user','content':f'Write a continuous numbered list of short facts about mathematics. Continue until the output token limit. Test {n}-{i}.'}], 'thinking':{'type':'disabled'},'max_tokens':1024,'stream':True,'stream_options':{'include_usage':True}}
            raw=bytearray()
            try:
                async with session.post(URL,headers=HEADERS,json=body) as response:
                    row.update(status=response.status,headers_at=time.perf_counter()-start)
                    if response.status==200:
                        accepted+=1; is_accepted=True; accepted_peak=max(accepted_peak,accepted)
                    async for chunk in response.content.iter_any():
                        raw.extend(chunk)
                    row['response_sha256']=hashlib.sha256(raw).hexdigest().upper()
                    text=raw.decode('utf-8',errors='replace')
                    row['done']='[DONE]' in text
                    row['usage']=None
                    for line in text.splitlines():
                        if line.startswith('data: '):
                            try:
                                obj=json.loads(line[6:])
                                if obj.get('usage'):row['usage']=obj['usage']
                            except ValueError:pass
                    if response.status!=200:row['error_body']=text[:8192]
                    (TASK/'responses'/f"{row['id']}.sse").write_bytes(raw)
            except Exception as exc:
                row.update(error_type=type(exc).__name__,error=str(exc))
            finally:
                if is_accepted:accepted-=1
                active-=1
                row['end']=time.perf_counter()-start;rows.append(row)
        await asyncio.gather(*(one(i) for i in range(n)))
    result={'planned':n,'client_pending_peak':peak,'http200_unfinished_peak':accepted_peak,'duration':time.perf_counter()-start,'statuses':dict(collections.Counter(str(r.get('status','client_error')) for r in rows)),'completed_sse':sum(r.get('done',False) for r in rows),'rows':sorted(rows,key=lambda r:r['id'])}
    (TASK/f'wave-{n}.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in result.items() if k!='rows'}),flush=True)
    return result

async def main():
    (TASK/'responses').mkdir(parents=True,exist_ok=True)
    results=[]
    for n in (10,100,500,2501):
        r=await wave(n);results.append(r)
        if 'client_error' in r['statuses'] or not r['statuses'].get('200'):
            break
    index=[]
    for p in TASK.rglob('*'):
        if p.is_file() and p.name!='evidence-index.json':
            index.append({'path':str(p.relative_to(TASK)), 'sha256':hashlib.sha256(p.read_bytes()).hexdigest().upper()})
    (TASK/'evidence-index.json').write_text(json.dumps(index,indent=2),encoding='utf-8')

if __name__=='__main__':asyncio.run(main())
