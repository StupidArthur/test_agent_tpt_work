const fs=require('fs');const crypto=require('crypto');const cp=require('path');
const target='C:/Users/Administrator/.tpt-work/dsh/skills/round-rich-skill-20261006/SKILL.md';
const op=process.argv[2]; const marker='ROUND_RICH_SKILL_20261006_OK';
if(op==='edit'){
 const before=fs.readFileSync(target); const text=before.toString('utf8');
 if(!text.includes(marker)) throw Error('expected marker absent; refusing edit');
 const changed=text.replaceAll(marker,'ROUND_RICH_SKILL_UPDATED_20261006_OK').replaceAll('ROUND_SKILL_RICH_20261006','ROUND_SKILL_RICH_UPDATED_20261006');
 const after=Buffer.from(changed,'utf8');
 fs.writeFileSync(target,after); console.log(JSON.stringify({operation:'edit-round-owned-sample',bytes:after.length,sha256:crypto.createHash('sha256').update(after).digest('hex'),changed:!before.equals(after)}));
}else if(op==='invalid'){
 const before=fs.readFileSync(target); const text=before.toString('utf8');
 if(!text.includes('description: "Harmless round-owned test Skill package."')) throw Error('expected description absent; refusing invalid edit');
 const after=Buffer.from(text.replace('description: "Harmless round-owned test Skill package."\n',''),'utf8');
 fs.writeFileSync(target,after); console.log(JSON.stringify({operation:'invalid-round-owned-sample',bytes:after.length,sha256:crypto.createHash('sha256').update(after).digest('hex'),descriptionRemoved:!after.toString('utf8').includes('description:')}));
}else if(op==='restore'){
 const backup=fs.readFileSync(cp.resolve('证据/SKILL-045/SKILL-045-A01/SKILL.md.original')); fs.writeFileSync(target,backup);
 const current=fs.readFileSync(target); console.log(JSON.stringify({operation:'restore-round-owned-sample',bytes:current.length,sha256:crypto.createHash('sha256').update(current).digest('hex'),matchesBackup:current.equals(backup)}));
}else {const b=fs.readFileSync(target);console.log(JSON.stringify({operation:'read',bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')}));}
