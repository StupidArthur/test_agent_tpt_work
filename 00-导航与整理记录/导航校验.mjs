// 只检查活动阅读入口，不扫描或执行历史夹具/探索任务。
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const files=[
 'README.md','AGENTS.md','00-导航与整理记录/README.md','00-导航与整理记录/2026-10-07-入口整理.md',
 '01-产品资料/README.md','01-产品资料/原设计文档/README.md','01-产品资料/安装包技术资料/README.md',
 '03-测试批次/README.md','tools/README.md','tools/tpt-work/README.md','tools/ui-operations/README.md','探索性测试/早期脚本与证据/README.md',
 ...walk(path.join(repo,'02-测试方法与技术参考')).filter(p=>p.endsWith('.md')).map(p=>path.relative(repo,p)),
 ...walk(path.join(repo,'skills')).filter(p=>p.endsWith('.md')).map(p=>path.relative(repo,p)),
 ...walk(path.join(repo,'tools/ui-operations/docs')).filter(p=>p.endsWith('.md')).map(p=>path.relative(repo,p))
];
const issues=[],links=[];for(const file of files){const p=path.resolve(repo,file);if(!fs.existsSync(p)){issues.push({file,error:'Document missing'});continue;}
 for(const m of fs.readFileSync(p,'utf8').matchAll(/\[[^\]\n]*\]\(([^)]+)\)/g)){
  const ref=m[1].trim().replace(/^<|>$/g,'');if(/^[a-z][a-z0-9+.-]*:/i.test(ref)||ref.startsWith('#'))continue;
  let decoded;try{decoded=decodeURIComponent(ref.split('#')[0]);}catch{issues.push({file,link:ref,error:'Invalid URL encoding'});continue;}
  const dest=path.resolve(path.dirname(p),decoded);const exists=fs.existsSync(dest);links.push({from:file.replaceAll('\\','/'),link:ref,target:path.relative(repo,dest).replaceAll('\\','/'),exists});if(!exists)issues.push({file,link:ref,error:'Link target missing'});
  if(exists&&ref.includes('#')&&dest.endsWith('.md')){
   const fragment=decodeURIComponent(ref.slice(ref.indexOf('#')+1));const slugs=[];let fenced=false;for(const line of fs.readFileSync(dest,'utf8').split(/\r?\n/)){if(/^\s*(```|~~~)/.test(line)){fenced=!fenced;continue;}if(fenced)continue;const h=line.match(/^#{1,6}\s+(.+?)\s*#*$/);if(h)slugs.push(h[1].toLowerCase().replace(/[^\p{L}\p{N}\p{M}_\-\s]/gu,'').replace(/\s/g,'-'));}
   if(fragment&&!slugs.includes(fragment))issues.push({file,link:ref,error:'Heading anchor missing'});
  }
 }
}
const fixtures=['03-测试批次/早期探索_原根目录/原始备份/backup-记忆目录-20260929/AGENTS.md','03-测试批次/交付快照_记忆与进化/原交付目录/evidence/fixtures/AGENTS.md'];
const result={captured_at:new Date().toISOString(),scope:'活动入口及直接方法说明；不含探索任务正文、原设计正文、历史报告和原始包文件',documents:files.length,links:links.length,issues,protected_fixture_sha256:fixtures.map(p=>({path:p,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(repo,p))).digest('hex')})),checked_links:links};
fs.writeFileSync(path.join(repo,'00-导航与整理记录/入口校验.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({documents:result.documents,links:result.links,issues},null,2));if(issues.length)process.exitCode=1;
