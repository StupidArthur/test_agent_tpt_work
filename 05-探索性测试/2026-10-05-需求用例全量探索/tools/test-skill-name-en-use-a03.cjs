const fs=require('fs');const {chromium}=require('C:/Users/Administrator/AppData/Local/Temp/tpt-cdp/node_modules/playwright-core');
(async()=>{
 const dir='探索性测试/2026-10-05-需求用例全量探索/证据/SKILL-012/SKILL-012-A03';fs.mkdirSync(dir,{recursive:true});
 const b=await chromium.connectOverCDP('http://127.0.0.1:9234'),p=b.contexts()[0].pages()[0];await p.setViewportSize({width:900,height:700});
 const f=p.frames().find(x=>x.url().includes('/api/supcon-skills/ui'));if(!f)throw Error('Skills iframe unavailable');
 const title='本轮中文展示名探针20261006',marker='ROUND_NAME_EN_SEARCH_20261006_OK';
 const detailTitle=f.getByRole('heading',{name:title,exact:true});if(await detailTitle.count()<1)throw Error('Expected the exact round-owned sample title');
 const sourceDetail=(await f.locator('body').innerText()).slice(-1500);await p.screenshot({path:dir+'/skill-detail-before-use.png'});
 const use=f.getByRole('button',{name:'使用',exact:true});if(await use.count()!==1)throw Error('Skill detail Use action missing');await use.click();await p.waitForTimeout(450);
 const chipText=(await p.locator('body').innerText()).slice(-1200);await p.screenshot({path:dir+'/composer-selected-skill.png'});
 const chips=await p.locator('body').getByText(/本轮中文展示名探针20261006|round-search-name-en-20261006/).allTextContents();
 const editors=p.locator('[contenteditable=true]:visible');if(await editors.count()===0)throw Error('Unified task composer did not appear');
 const prompt='Please explicitly invoke the selected round-owned Skill “round-search-name-en-20261006” and return only ROUND_NAME_EN_SEARCH_20261006_OK.';
 await editors.last().fill(prompt);await p.screenshot({path:dir+'/prompt-before-send.png'});
 const modelText=(await p.locator('body').innerText()).slice(-600);if(!modelText.includes('low'))throw Error('Low reasoning level not visible in composer: '+modelText);
 await p.getByRole('button',{name:/发送/}).last().click();
 let outputSeen=false,elapsed=0;const start=Date.now();while(Date.now()-start<90000){await p.waitForTimeout(500);elapsed=Date.now()-start;if(await p.getByText(marker,{exact:true}).count()){outputSeen=true;break}}
 await p.getByRole('tab',{name:'轨迹',exact:true}).click();await p.waitForTimeout(300);const trace=await p.locator('body').innerText();await p.screenshot({path:dir+'/trace.png'});
 const hit=trace.includes('name="round-search-name-en-20261006"')||trace.includes('round-search-name-en-20261006')&&trace.includes('skill_content');
 fs.writeFileSync(dir+'/trace.txt',trace.slice(-6500),'utf8');
 const result={captured_at:new Date().toISOString(),skill_name:title,english_name:'Night English Name Probe 20261006',machine_name:'round-search-name-en-20261006',input:prompt,composer_visible_skills:chips,model:'standard / low',output_marker_seen:outputSeen,elapsed_ms:elapsed,trace_target_skill_content_seen:hit,trace_includes_skill_name:trace.includes('round-search-name-en-20261006'),trace_excerpt:trace.slice(-1800),source_detail_excerpt:sourceDetail,task_page_text:chipText.slice(-700)};
 fs.writeFileSync(dir+'/result.json',JSON.stringify(result,null,2)+'\n','utf8');console.log(JSON.stringify(result));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
