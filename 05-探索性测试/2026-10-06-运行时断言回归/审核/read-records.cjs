const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'), groups=process.argv.slice(2);
const events=new Map();
for(const n of fs.readdirSync(path.join(root,'运行日志')).filter(n=>n.endsWith('.jsonl')))
for(const l of fs.readFileSync(path.join(root,'运行日志',n),'utf8').trim().split(/\r?\n/)) {if(!l)continue;const e=JSON.parse(l);events.set(e.event_id,e);}
const cases=JSON.parse(fs.readFileSync(path.join(root,'用例/cases.json'),'utf8'));
const clip=(v,n=400)=>JSON.stringify(v)?.slice(0,n);
for(const c of cases.filter(c=>groups.includes(c.group))){
 const r=JSON.parse(fs.readFileSync(path.join(root,'结果',c.id+'.json'),'utf8'));
 console.log(c.id+' '+c.title+' '+r.status);
 for(const a of r.assertions){console.log(a.id+' actual='+clip(a.actual));for(const ref of a.read_refs){const e=events.get(ref);console.log('  '+ref+' '+clip({source:e.source,raw:e.raw,derivation:e.derivation},750));}}
}
