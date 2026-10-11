"""Bounded public TPT gateway burst ladder. No retries; drain before next wave."""
import asyncio,collections,gzip,hashlib,json,platform,time
from pathlib import Path
import aiohttp

TASK=Path(__file__).resolve().parents[1]
ROOT=TASK.parents[1]
cfg=json.loads((ROOT/'04-测试项/saas-llm-test/archive/v1/llm-bench-kit/config.json').read_text(encoding='utf-8'))
target=next(t for t in cfg['targets'] if t['name']=='flash-public-low')
URL=target['base_url'].rstrip('/')+'/chat/completions'
HEADERS={'Authorization':'Bearer '+target['api_key']}
LADDER=[100,200,400,800,1600,2501]

async def wave(n,label):
    rows=[]; events=[]; sent_active=0; sent_peak=0; accepted=0; accepted_peak=0
    start=time.perf_counter()
    trace=aiohttp.TraceConfig()
    async def sent(session,ctx,params):
        nonlocal sent_active,sent_peak
        row=ctx.trace_request_ctx
        row['sent_at']=time.perf_counter()-start
        sent_active+=1;sent_peak=max(sent_peak,sent_active)
        events.append({'t':row['sent_at'],'id':row['id'],'event':'headers_sent'})
    trace.on_request_headers_sent.append(sent)
    connector=aiohttp.TCPConnector(limit=n,ttl_dns_cache=600)
    timeout=aiohttp.ClientTimeout(total=180,connect=60,sock_read=90)
    async with aiohttp.ClientSession(connector=connector,timeout=timeout,trust_env=False,trace_configs=[trace]) as session:
        async def one(i):
            nonlocal sent_active,accepted,accepted_peak
            row={'id':f'{label}-{i:04d}','start':time.perf_counter()-start,'complete':False}
            body={'model':'flash','think_level':'low','messages':[{'role':'user','content':'Reply with exactly OK. Do not explain.'}],'max_tokens':128,'stream':True,'stream_options':{'include_usage':True}}
            raw=bytearray();is_accepted=False
            try:
                async with session.post(URL,headers=HEADERS,json=body,trace_request_ctx=row) as response:
                    row.update(status=response.status,headers_at=time.perf_counter()-start,response_headers=dict(response.headers))
                    if response.status==200:
                        accepted+=1;is_accepted=True;accepted_peak=max(accepted_peak,accepted)
                    async for chunk in response.content.iter_any():
                        if chunk and 'first_bytes_at' not in row:row['first_bytes_at']=time.perf_counter()-start
                        raw.extend(chunk)
                    row['read_complete']=True
            except Exception as exc:row.update(error_type=type(exc).__name__,error=str(exc))
            finally:
                if is_accepted:accepted-=1
                if 'sent_at' in row:sent_active-=1
                row['end']=time.perf_counter()-start
                events.append({'t':row['end'],'id':row['id'],'event':'end'})
                text=raw.decode('utf-8',errors='replace');row['done']='[DONE]' in text
                row['usage']=None;row['stream_errors']=[];row['finish_reasons']=[]
                for line in text.splitlines():
                    if line.startswith('data: '):
                        try:
                            obj=json.loads(line[6:])
                            if obj.get('usage'):row['usage']=obj['usage']
                            if obj.get('error'):row['stream_errors'].append(obj['error'])
                            for choice in obj.get('choices',[]):
                                if choice.get('finish_reason'):row['finish_reasons'].append(choice['finish_reason'])
                        except ValueError:pass
                if row.get('status')!=200:row['error_body']=text[:16384]
                row['complete']=row.get('status')==200 and row['done'] and not row['stream_errors'] and not row.get('error_type') and bool(row['finish_reasons'])
                row['response_sha256']=hashlib.sha256(raw).hexdigest().upper()
                row['response_path']=f"responses/{row['id']}.sse.gz"
                (TASK/row['response_path']).write_bytes(gzip.compress(raw,mtime=0))
                rows.append(row)
        await asyncio.gather(*(one(i) for i in range(n)))
    result={'label':label,'planned':n,'headers_sent_peak':sent_peak,'http200_unfinished_peak':accepted_peak,'duration':time.perf_counter()-start,'statuses':dict(collections.Counter(str(r.get('status','no_http_status')) for r in rows)),'complete':sum(r['complete'] for r in rows),'client_errors':dict(collections.Counter(r['error_type'] for r in rows if r.get('error_type'))),'rows':sorted(rows,key=lambda r:r['id']),'events':sorted(events,key=lambda e:e['t'])}
    (TASK/f'{label}.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in result.items() if k not in ('rows','events')}),flush=True)
    return result

async def main():
    (TASK/'responses').mkdir(parents=True,exist_ok=True)
    (TASK/'environment.json').write_text(json.dumps({'utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'python':platform.python_version(),'platform':platform.platform(),'aiohttp':aiohttp.__version__,'url':URL,'credential_reference':'flash-public-low','ladder':LADDER,'request_limit':sum(LADDER)+1,'max_tokens':128,'prompt':'Reply with exactly OK. Do not explain.','reasoning':'think_level=low','timeouts':{'total':180,'connect':60,'read':90}},indent=2),encoding='utf-8')
    results=[]
    for n in LADDER:
        r=await wave(n,f'wave-{n}');results.append(r)
        if r['complete']!=n:
            print('STOP: first wave with HTTP/stream/client failure; no further escalation.',flush=True)
            await asyncio.sleep(5)
            results.append(await wave(1,'recovery-1'))
            break
    (TASK/'summary.json').write_text(json.dumps([{k:v for k,v in r.items() if k not in ('rows','events')} for r in results],indent=2),encoding='utf-8')
    index=[]
    for p in TASK.rglob('*'):
        if p.is_file() and p.name!='evidence-index.json':index.append({'path':p.relative_to(TASK).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest().upper(),'case':p.stem if p.name.startswith(('wave-','recovery-')) else 'GW-CONCURRENCY'})
    (TASK/'evidence-index.json').write_text(json.dumps(index,ensure_ascii=False,indent=2),encoding='utf-8')

if __name__=='__main__':asyncio.run(main())
