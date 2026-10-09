const http=require('http'),fs=require('fs'),path=require('path');
const dir=__dirname, requests=path.join(dir,'requests.jsonl'), info=path.join(dir,'server-info.json');
const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://127.0.0.1');
  const row={at:new Date().toISOString(),method:req.method,path:u.pathname,marker:u.searchParams.get('marker'),ua:req.headers['user-agent']||'',fetchMode:req.headers['sec-fetch-mode']||'',fetchDest:req.headers['sec-fetch-dest']||''};
  fs.appendFileSync(requests,JSON.stringify(row)+'\n','utf8');
  if(u.pathname==='/shutdown'){res.writeHead(200,{'Content-Type':'text/plain'});res.end('stopping');server.close(()=>process.exit(0));return;}
  const marker=u.searchParams.get('marker')||'missing';
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
  res.end('<!doctype html><meta charset="utf-8"><title>Settings link target</title><main><h1>ROUND_OWNED_SETTINGS_LINK_TARGET_20261006</h1><p>marker='+marker+'</p></main>');
});
server.listen(0,'127.0.0.1',()=>{const a=server.address();fs.writeFileSync(info,JSON.stringify({pid:process.pid,host:'127.0.0.1',port:a.port,started_at:new Date().toISOString()},null,2)+'\n','utf8');});
