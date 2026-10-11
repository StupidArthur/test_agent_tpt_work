const fs=require('fs'),path=require('path'),crypto=require('crypto');
const base='夹具/agent-variants',src=path.join(base,'round-agent-bundled-call-20261006'),dst=path.join(base,'round-agent-overwrite-variant-20261006');
const metaPath=path.join(dst,'metadata.json'),m=JSON.parse(fs.readFileSync(metaPath,'utf8')),original=m.displayDescription.zh;
m.displayDescription.zh+=' [ROUND_OVERWRITE_20261006]';fs.writeFileSync(metaPath,JSON.stringify(m,null,2)+'\n','utf8');
console.log(JSON.stringify({dst,name:m.name,original,modified:m.displayDescription.zh,agentMdSha:crypto.createHash('sha256').update(fs.readFileSync(path.join(dst,'agent.md'))).digest('hex'),skillSha:crypto.createHash('sha256').update(fs.readFileSync(path.join(dst,'skills/round-bundled-call-20261006/SKILL.md'))).digest('hex')}));
