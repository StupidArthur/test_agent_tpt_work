// Check current navigation, not the bodies of archived documents or test fixtures.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const files=['README.md','AGENTS.md',...fs.readdirSync(path.join(repo,'00-产品特性与操作导航')).filter(x=>x.endsWith('.md')).map(x=>'00-产品特性与操作导航/'+x),'01-产品资料/README.md','02-测试项/README.md','03-测试技能/README.md','04-测试工具/README.md','05-探索性测试/README.md','06-正式测试报告/README.md'];
const issues=[],links=[],optionalLocalFiles=new Set(['.lan-opencodes.json','.lan-codex.json']);
for(const file of files){
 const source=path.join(repo,file);if(!fs.existsSync(source)){issues.push({file,error:'Entry missing'});continue;}
 for(const m of fs.readFileSync(source,'utf8').matchAll(/\[[^\]\n]*\]\(([^)]+)\)/g)){
  const ref=m[1].trim().replace(/^<|>$/g,'');if(/^[a-z][a-z0-9+.-]*:/i.test(ref)||ref.startsWith('#'))continue;
  let decoded;try{decoded=decodeURIComponent(ref.split('#')[0]);}catch{issues.push({file,link:ref,error:'Invalid URL encoding'});continue;}
  const destination=path.resolve(path.dirname(source),decoded),target=path.relative(repo,destination).replaceAll('\\','/');
  const exists=fs.existsSync(destination),optional=optionalLocalFiles.has(target);links.push({from:file,link:ref,target,exists,optional});
  if(!exists&&!optional)issues.push({file,link:ref,error:'Link target missing'});
 }
}
const fixturePaths=['05-探索性测试/历史归档/早期测试批次/早期探索_原根目录/原始备份/backup-记忆目录-20260929/AGENTS.md','05-探索性测试/历史归档/早期测试批次/交付快照_记忆与进化/原交付目录/evidence/fixtures/AGENTS.md'];
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(repo,p))).digest('hex');
const protectedFixtures=[];for(const p of fixturePaths){if(fs.existsSync(path.join(repo,p)))protectedFixtures.push({path:p,sha256:hash(p)});else issues.push({file:p,error:'Protected fixture missing'});}
const expectedFixtures=[{"path":"05-探索性测试/历史归档/早期测试批次/早期探索_原根目录/原始备份/backup-记忆目录-20260929/AGENTS.md","sha256":"a5ef619337fa00d602b365f3ce3618eefbed41baece90e517e7e74d563ad54a3"},{"path":"05-探索性测试/历史归档/早期测试批次/交付快照_记忆与进化/原交付目录/evidence/fixtures/AGENTS.md","sha256":"a5ef619337fa00d602b365f3ce3618eefbed41baece90e517e7e74d563ad54a3"}];
for(const fixture of expectedFixtures)if(!fs.existsSync(path.join(repo,fixture.path))||hash(fixture.path)!==fixture.sha256)issues.push({file:fixture.path,error:"Protected fixture hash mismatch"});
const result={captured_at:new Date().toISOString(),scope:'Root and domain navigation; file targets only, not heading anchors; no UI execution',documents:files.length,links:links.length,issues,protected_fixture_sha256:protectedFixtures,checked_links:links};
const output=path.join(repo,'.review/00-navigation-check.json');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({documents:files.length,links:links.length,issues},null,2));if(issues.length)process.exitCode=1;
