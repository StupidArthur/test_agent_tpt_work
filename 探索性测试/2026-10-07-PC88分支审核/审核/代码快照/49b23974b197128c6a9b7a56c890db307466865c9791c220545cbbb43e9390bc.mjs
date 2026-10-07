import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const root=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]),sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const lines=p=>fs.readFileSync(path.join(root,p),'utf8').trim().split(/\r?\n/).filter(Boolean).map(s=>JSON.parse(s));
const calls=lines('运行日志/业务调用.jsonl'),index=lines('证据索引.jsonl'),issues=[],states={},functions={};
const normalized=new Map(),snapshotSeen=new Set();
for(const c of calls){
 functions[c.function_name]=(functions[c.function_name]||0)+1;
 for(const [p,h] of [[c.args_path,c.args_sha256],[c.return_path,c.return_sha256]]){
  if(!fs.existsSync(path.join(root,p)))issues.push({missing:p});
  else if(sha(path.join(root,p))!==h)issues.push({hash:p});
 }
 for(const m of c.modules||[]){
  if(!m.snapshot||snapshotSeen.has(m.snapshot))continue;
  snapshotSeen.add(m.snapshot);const q=path.join(root,m.snapshot);
  if(!fs.existsSync(q)){issues.push({snapshot:m.snapshot,missing:true});continue;}
  const actual=sha(q);if(actual===m.sha256)continue;
  const crlf=Buffer.from(fs.readFileSync(q,'utf8').replace(/\r?\n/g,'\r\n'));
  const reconstructed=crypto.createHash('sha256').update(crlf).digest('hex');
  if(reconstructed===m.sha256)normalized.set(m.snapshot,{path:m.snapshot,expected:m.sha256,actual,matchingVariant:'LF -> CRLF'});
  else issues.push({snapshot:m.snapshot,expected:m.sha256,actual});
 }
}
for(const i of index){const p=path.join(root,i.return);if(!fs.existsSync(p)||sha(p)!==i.return_sha256)issues.push({index:i.return});}
const records=fs.readdirSync(path.join(root,'结果')).map(f=>JSON.parse(fs.readFileSync(path.join(root,'结果',f),'utf8')));
const known=new Set(calls.map(c=>c.call_id));for(const r of records){states[r.status]=(states[r.status]||0)+1;for(const ref of r.refs||[])if(ref.startsWith('CALL-')&&!known.has(ref))issues.push({case:r.id,unknownCall:ref});}
const catalog=JSON.parse(fs.readFileSync(path.join(root,'code/business/catalog.json'),'utf8'));
const summary={source:'origin/test/pc88-memory-20261007 @ 770dacd',resultCount:records.length,states,calls:calls.length,index:index.length,indexWithoutFunction:index.filter(i=>!i.function).length,registered:catalog.functions.length,functions,snapshots:snapshotSeen.size,normalizedSnapshots:[...normalized.values()],issues};
fs.writeFileSync(out,JSON.stringify(summary,null,2));console.log(JSON.stringify({...summary,normalizedSnapshots:normalized.size},null,2));
