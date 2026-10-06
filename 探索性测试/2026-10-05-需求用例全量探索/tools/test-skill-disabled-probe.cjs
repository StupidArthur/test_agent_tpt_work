const fs=require('fs');const {chromium}=require('C:/Users/Administrator/AppData/Local/Temp/tpt-cdp/node_modules/playwright-core');
(async()=>{
 const dir='探索性测试/2026-10-05-需求用例全量探索/证据/SKILL-DISABLED-PROBE-20261006';fs.mkdirSync(dir,{recursive:true});
 const b=await chromium.connectOverCDP('http://127.0.0.1:9234');const p=b.contexts()[0].pages()[0];await p.setViewportSize({width:900,height:700});
 const f=p.frames().find(x=>x.url().includes('/api/supcon-skills/ui'));if(!f)throw Error('Skills iframe missing');
 const h=f.getByRole('heading',{name:'round-import-probe-20261005',exact:true});if(await h.count()!==1)throw Error('target Skill heading not unique');
 const card=f.locator('[data-slot=card]').filter({has:h});
 const sw=card.getByRole('switch');
 const before=await h.evaluate(x=>{let a=x;while(a&&!a.dataset.slot?.includes('card'))a=a.parentElement;const s=a?.querySelector('[role=switch]');return {title:x.innerText,checked:s?.getAttribute('aria-checked'),state:s?.getAttribute('data-state')}});
 if(before.checked!=='true')throw Error('precondition: target Skill was not enabled: '+JSON.stringify(before));
 await sw.click();await p.waitForTimeout(1600);
 const disabled=await h.evaluate(x=>{let a=x;while(a&&!a.dataset.slot?.includes('card'))a=a.parentElement;const s=a?.querySelector('[role=switch]');return {checked:s?.getAttribute('aria-checked'),state:s?.getAttribute('data-state')}});
 await p.screenshot({path:dir+'/disabled-card.png'});if(disabled.checked!=='false')throw Error('disable did not persist '+JSON.stringify(disabled));
 await p.getByRole('button',{name:'新建任务',exact:true}).click();await p.waitForTimeout(450);
 let ed=p.locator('[contenteditable=true]:visible');console.log('editors',await ed.count(),'bodyTail',(await p.locator('body').innerText()).slice(-700));
 if(await ed.count()===0)throw Error('new task composer not visible');
 const editor=ed.last();const prompt='Please explicitly use the Skill named round-import-probe-20261005 for trigger ROUND_IMPORT_PROBE_20261005. If that Skill is unavailable, reply exactly SKILL_DISABLED_NOT_AVAILABLE. Do not infer or invent any tool result.';
 await editor.fill(prompt);await p.screenshot({path:dir+'/prompt-before-send.png'});
 const send=p.getByRole('button',{name:/发送/}).last();console.log('send buttons',await p.getByRole('button',{name:/发送/}).count());await send.click();
 let text='',done=false;const start=Date.now();while(Date.now()-start<90000){await p.waitForTimeout(900);text=await p.locator('body').innerText();if(text.includes('SKILL_DISABLED_NOT_AVAILABLE')||text.includes('ROUND_IMPORT_SKILL_OK')){done=true;break}}
 await p.screenshot({path:dir+'/answer.png'});
 const state={precondition:before,disabled,finished:done,elapsed_ms:Date.now()-start,answer_tail:text.slice(-1800),page_url:p.url(),task_title:(await p.locator('body').innerText()).slice(0,400)};
 fs.writeFileSync(dir+'/result.json',JSON.stringify(state,null,2));
 console.log('answer',JSON.stringify(state));
 // Restore promptly through Skills page and exact target switch.
 await p.getByRole('button',{name:'技能',exact:true}).click();await p.waitForTimeout(700);const rf=p.frames().find(x=>x.url().includes('/api/supcon-skills/ui'));const rh=rf.getByRole('heading',{name:'round-import-probe-20261005',exact:true});const rcard=rf.locator('[data-slot=card]').filter({has:rh});const rsw=rcard.getByRole('switch');const rstate=await rsw.getAttribute('aria-checked');
 if(rstate==='false'){await rsw.click();await p.waitForTimeout(1500)}
 const restored=await rh.evaluate(x=>{let a=x;while(a&&!a.dataset.slot?.includes('card'))a=a.parentElement;let s=a.querySelector('[role=switch]');return {checked:s.getAttribute('aria-checked'),state:s.getAttribute('data-state')}});
 fs.writeFileSync(dir+'/restore.json',JSON.stringify({rstate,restored},null,2));await p.screenshot({path:dir+'/restored-card.png'});console.log('restored',JSON.stringify({rstate,restored}));
 if(restored.checked!=='true')throw Error('Skill not restored');
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
