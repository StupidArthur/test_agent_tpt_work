const http=require('http');
const fs=require('fs');
const file='D:/code/tpt-workspace/DIALOG060-round-owned/index.html';
const server=http.createServer((req,res)=>{
 if(req.method!=='GET'||(req.url!=='/'&&req.url!=='/index.html')){res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not Found');return;}
 try{const body=fs.readFileSync(file);res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(body);}
 catch(e){res.writeHead(404,{'Content-Type':'text/plain'});res.end('Round-owned HTML sample not available');}
});
server.listen(0,'127.0.0.1',()=>{console.log('DIALOG060_HOST=http://127.0.0.1:'+server.address().port+'/');});
process.on('SIGINT',()=>server.close(()=>process.exit(0)));
