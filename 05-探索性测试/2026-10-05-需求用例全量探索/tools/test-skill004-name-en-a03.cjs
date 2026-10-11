const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {chromium}=require('C:/Users/Administrator/AppData/Local/Temp/tpt-cdp/node_modules/playwright-core');
(async()=>{
 const dir='探索性测试/2026-10-05-需求用例全量探索/证据/SKILL-004/SKILL-004-A03';fs.mkdirSync(dir,{recursive:true});
 const source='探索性测试/2026-10-05-需求用例全量探索/夹具/skill-variants/round-search-name-en-20261006/SKILL.md';
 const sourceBytes=fs.readFileSync(source);const sourceHash=crypto.createHash('sha256').update(sourceBytes).digest('hex');fs.copyFileSync(source,dir+'/fixture-SKILL.md');
 const b=await chromium.connectOverCDP('http://127.0.0.1:9234'),p=b.contexts()[0].pages()[0];await p.setViewportSize({width:900,height:700});
 let f=p.frames().find(x=>x.url().includes('/api/supcon-skills/ui'));if(!f){await p.getByRole('button',{name:'技能',exact:true}).click();await p.waitForTimeout(600);f=p.frames().find(x=>x.url().includes('/api/supcon-skills/ui'));}if(!f)throw Error('Skills iframe unavailable');
 const before=(await f.locator('body').innerText()).slice(0,300);await p.screenshot({path:dir+'/before-import.png'});
 await f.getByRole('button',{name:'导入技能',exact:true}).click();await p.waitForTimeout(250);
 const inputs=await f.locator('input[type=file]').evaluateAll(xs=>xs.map(x=>({accept:x.accept,multiple:x.multiple,webkitdirectory:x.webkitdirectory})));
 const fileInput=f.locator('input[type=file][accept*=".md"]');if(await fileInput.count()!==1)throw Error('Markdown file input not unique: '+JSON.stringify(inputs));
 await fileInput.setInputFiles(path.resolve(source));await p.waitForTimeout(350);
 const dialog=f.getByRole('dialog');const preview=await dialog.innerText();await p.screenshot({path:dir+'/preview.png'});
 await dialog.getByRole('button',{name:'导入',exact:true}).click();await p.waitForTimeout(900);
 const afterImport=(await f.locator('body').innerText()).slice(0,900);await p.screenshot({path:dir+'/after-import.png'});
 const search=f.getByPlaceholder('搜索技能名称或描述');await search.fill('Night English Name Probe 20261006');await p.waitForTimeout(500);
 const matches=await f.getByRole('heading').allTextContents();const exact=f.getByRole('heading',{name:'本轮中文展示名探针20261006',exact:true});const count=await exact.count();const searchBody=(await f.locator('body').innerText()).slice(0,1000);await p.screenshot({path:dir+'/english-query-result.png'});
 let detail='';if(count===1){await exact.click();await p.waitForTimeout(350);detail=(await f.locator('body').innerText()).slice(-1500);await p.screenshot({path:dir+'/english-query-detail.png'});}
 const result={captured_at:new Date().toISOString(),source_sha256:sourceHash,source:'round-owned single SKILL.md submitted in page-side file input; no native dialog',pre_import_head:before,inputs,preview,post_import_head:afterImport,query:'Night English Name Probe 20261006',visible_heading_matches:matches,exact_chinese_heading_count:count,search_result_excerpt:searchBody,detail_excerpt:detail,imported_count_before:(before.match(/我的技能\s*\n\s*(\d+)/)||[])[1]||null,imported_count_after:(afterImport.match(/我的技能\s*\n\s*(\d+)/)||[])[1]||null,source_unchanged:crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex')===sourceHash};
 fs.writeFileSync(dir+'/result.json',JSON.stringify(result,null,2)+'\n','utf8');console.log(JSON.stringify(result));
 // Return to the unfiltered Skills list and leave the harmless round-owned sample installed.
 if(await search.count())await search.fill('');await p.waitForTimeout(250);await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
