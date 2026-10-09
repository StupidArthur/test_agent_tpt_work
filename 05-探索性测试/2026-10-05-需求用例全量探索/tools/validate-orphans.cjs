const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const dir=path.join(root,'\u6267\u884c\u8bb0\u5f55');
const obsPath=path.join(root,'\u89c2\u5bdf\u8bb0\u5f55.jsonl');
const idxPath=path.join(root,'\u8bc1\u636e','\u7d22\u5f15.jsonl');
const pairs=new Set();
for(const name of fs.readdirSync(dir).filter(x=>x.endsWith('.json'))){const r=JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));for(const a of r.attempts||[])pairs.add(r.case_id+'\0'+a.attempt_id);}
const observations=new Map();for(const line of fs.readFileSync(obsPath,'utf8').split(/\r?\n/).filter(Boolean)){const o=JSON.parse(line);if(observations.has(o.observation_id))throw Error('duplicate observation id '+o.observation_id);observations.set(o.observation_id,o);}
const index=fs.readFileSync(idxPath,'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const bad=[];for(let i=0;i<index.length;i++){const e=index[i];if(pairs.has(e.case_id+'\0'+e.attempt_id))continue;const o=observations.get(e.observation_id);if(!o||o.legacy_attempt_id!==e.attempt_id||!o.related_cases?.includes(e.case_id))bad.push(i+1);}
console.log(JSON.stringify({index_rows:index.length,registered_attempt_pairs:pairs.size,unregistered_rows:index.filter(e=>!pairs.has(e.case_id+'\0'+e.attempt_id)).length,observation_records:observations.size,unmatched_orphan_rows:bad.length,examples:bad.slice(0,10)}));process.exitCode=bad.length?1:0;
