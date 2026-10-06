const fs=require('fs');const {chromium}=require('C:/Users/Administrator/AppData/Local/Temp/tpt-cdp/node_modules/playwright-core');
(async()=>{
 const dir='探索性测试/2026-10-05-需求用例全量探索/证据/SKILL-012/SKILL-012-A04';fs.mkdirSync(dir,{recursive:true});
 const b=await chromium.connectOverCDP('http://127.0.0.1:9234'),p=b.contexts()[0].pages()[0];await p.setViewportSize({width:900,height:700});
 const title='本轮引导创建技能',tech='round-guided-create-20261006',marker='ROUND_GUIDED_CREATE_20261006_OK';
 let f=p.frames().find(x=>x.url().includes('/api/supcon-skills/ui'));if(!f){await p.getByRole('button',{name:'技能',exact:true}).click();await p.waitForTimeout(500);f=p.frames().find(x=>x.url().includes('/api/supcon-skills/ui'));}if(!f)throw Error('Skills iframe unavailable');
 const search=f.getByPlaceholder('搜索技能名称或描述');await search.fill(tech);await p.waitForTimeout(250);const matches=await f.getByRole('heading').allTextContents();const h=f.getByRole('heading',{name:title,exact:true});if(await h.count()!==1)throw Error('Newly created sample is not unique in the UI list: '+JSON.stringify(matches));
 await h.click();await p.waitForTimeout(200);const detail=(await f.locator('body').innerText()).slice(-1300);await p.screenshot({path:dir+'/created-skill-detail.png'});
 const use=f.getByRole('button',{name:'使用',exact:true});if(await use.count()!==1)throw Error('Skill detail 使用 action missing');await use.click();await p.waitForTimeout(350);
 const prefilled=await p.locator('[contenteditable=true]:visible').last().innerText();if(!prefilled.includes(tech))throw Error('composer did not preselect created Skill: '+prefilled);
 const mode=p.getByRole('button',{name:/访问模式/});await mode.click();await p.getByRole('menuitem',{name:'仅可查看',exact:true}).click();await p.waitForTimeout(120);
 await p.screenshot({path:dir+'/composer-selected-skill.png'});const prompt='Please explicitly invoke the selected Skill round-guided-create-20261006 for ROUND_GUIDED_CREATE_20261006. Reply only with its exact package result.';
 await p.locator('[contenteditable=true]:visible').last().fill(prompt);await p.screenshot({path:dir+'/prompt-before-send.png'});const settings=(await p.locator('body').innerText()).slice(-280);if(!settings.includes('标准')||!settings.includes('low')||!settings.includes('仅可查看'))throw Error('Expected standard/low, read-only composer: '+settings);
 await p.getByRole('button',{name:/发送/}).last().click();let text='',elapsed=0,output=false;const start=Date.now();while(Date.now()-start<90000){await p.waitForTimeout(500);elapsed=Date.now()-start;text=await p.locator('body').innerText();if(await p.getByText(marker,{exact:true}).count()){output=true;break}}
 if(!output)throw Error('Unique Skill marker not observed after 90s');await p.getByRole('tab',{name:'对话',exact:true}).click();await p.waitForTimeout(150);await p.screenshot({path:dir+'/conversation-result.png'});
 await p.getByRole('tab',{name:'轨迹',exact:true}).click();await p.waitForTimeout(250);const trace=await p.locator('body').innerText();await p.screenshot({path:dir+'/trace.png'});fs.writeFileSync(dir+'/trace.txt',trace.slice(-6500),'utf8');
 const result={captured_at:new Date().toISOString(),title,technical_name:tech,detail_excerpt:detail,composer_prefill:prefilled,input:prompt,permission:'仅可查看',model:'标准 / low',output_marker_seen:output,elapsed_ms:elapsed,trace_includes_tool_call:trace.includes('skill{"name": "'+tech+'"}')||trace.includes('skill{name:"'+tech+'"}'),trace_includes_content:trace.includes('<skill_content name="'+tech+'">'),trace_contains_name:trace.includes(tech),trace_excerpt:trace.slice(-2000)};
 fs.writeFileSync(dir+'/result.json',JSON.stringify(result,null,2)+'\n','utf8');console.log(JSON.stringify(result));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
