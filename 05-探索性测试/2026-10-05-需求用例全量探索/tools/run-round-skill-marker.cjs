const {chromium}=require(process.env.TEMP+'/tpt-cdp/node_modules/playwright-core');
(async()=>{
 const b=await chromium.connectOverCDP('http://127.0.0.1:9234');const p=b.contexts()[0].pages()[0];
 await p.getByRole('button',{name:'新建任务',exact:true}).click();await p.waitForTimeout(350);
 const e=p.locator('[contenteditable="true"][aria-label^="描述你想要构建"]:visible').first();
 await e.fill('/round-rich-skill-20261006 Please invoke the installed Skill and follow its current unique-marker instruction exactly. Do not quote the marker from this request. No tools or external access.');
 await p.screenshot({path:'证据/SKILL-045/SKILL-045-A01/before-send.png'});
 await p.getByRole('button',{name:'发送消息'}).click();let out='';const start=Date.now();
 while(Date.now()-start<90000){await p.waitForTimeout(1000);out=await p.locator('body').innerText();if(out.includes('用时 ')&& !out.includes('探索中'))break;}
 await p.screenshot({path:'证据/SKILL-045/SKILL-045-A01/result.png'});console.log(out.slice(-1800));
 await p.getByText('轨迹',{exact:true}).click();await p.waitForTimeout(350);const trace=await p.locator('body').innerText();
 const idx=trace.lastIndexOf('<skill_content name="round-rich-skill-20261006">'); console.log('TRACE',idx>=0?trace.slice(idx,idx+700):'bundle not found');
 await p.screenshot({path:'证据/SKILL-045/SKILL-045-A01/trace.png'});await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
