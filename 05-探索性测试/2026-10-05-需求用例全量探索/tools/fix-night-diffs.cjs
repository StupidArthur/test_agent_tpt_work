const fs=require('fs');
for(const id of ['SKILL-068','SKILL-071','SKILL-072','SKILL-074','SKILL-075']){
 const p=`执行记录/${id}.json`;let raw=fs.readFileSync(p,'utf8');if(raw.endsWith('\\n'))raw=raw.slice(0,-2);
 const r=JSON.parse(raw);r.differences=[...new Set(r.difference_ids||[])];fs.writeFileSync(p,JSON.stringify(r,null,2),'utf8');
}
