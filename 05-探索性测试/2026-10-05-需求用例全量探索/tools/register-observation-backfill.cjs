const fs=require('fs');
const base='探索性测试/2026-10-05-需求用例全量探索';
const obsPath=base+'/观察记录.jsonl';
const known=new Set(fs.readFileSync(obsPath,'utf8').split(/\r?\n/).filter(Boolean).map(s=>{try{return JSON.parse(s).observation_id}catch{return ''}}));
for(const [caseId,id] of [['AGENT-003','OBS-249'],['AGENT-011','OBS-250'],['SKILL-017','OBS-251']]){
 if(known.has(id))continue;
 const rec=JSON.parse(fs.readFileSync(base+'/执行记录/'+caseId+'.json','utf8'));
 const p=rec.product_observations.at(-1);
 const row={observation_id:id,...p};
 fs.appendFileSync(obsPath,JSON.stringify(row)+'\n','utf8');known.add(id);
}
console.log('backfilled',JSON.stringify([...known].filter(x=>/^OBS-(249|250|251|253)$/.test(x))));
