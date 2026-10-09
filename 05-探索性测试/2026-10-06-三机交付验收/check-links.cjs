const fs=require('fs'),path=require('path');
const out=[];
for(const machine of ['PC-G','本机']){
 const pack=require('./'+machine+'-审查包.json'),events=new Map();
 for(const f of fs.readdirSync(path.join(pack.root,'运行日志')).filter(x=>x.endsWith('.jsonl'))){
  for(const line of fs.readFileSync(path.join(pack.root,'运行日志',f),'utf8').split(/\r?\n/).filter(Boolean)){
   const e=JSON.parse(line);if(e.event_id)events.set(e.event_id,e);
  }
 }
 const rows=pack.records.map(({record:r})=>({case_id:r.case_id,status:r.status,assertions:r.assertions.map(a=>({assertion_id:a.id,actual:a.actual,reads:(a.read_refs||[]).map(id=>({ref:id,event:events.get(id)||null}))}))}));
 fs.writeFileSync(path.join(__dirname,machine+'-断言回溯.json'),JSON.stringify(rows,null,2));
 out.push({machine,results:rows.length,assertions:rows.reduce((s,r)=>s+r.assertions.length,0),missing_refs:rows.flatMap(r=>r.assertions.flatMap(a=>a.reads.filter(x=>!x.event).map(x=>({case:r.case_id,assertion:a.assertion_id,ref:x.ref}))))});
}
fs.writeFileSync(path.join(__dirname,'断言引用检查.json'),JSON.stringify(out,null,2));console.log(JSON.stringify(out));
