const {chromium}=require(process.env.TEMP+'/tpt-cdp/node_modules/playwright-core');
(async()=>{
 const b=await chromium.connectOverCDP('http://127.0.0.1:9234'); const p=b.contexts()[0].pages()[0];
 const e=p.locator('[contenteditable="true"][aria-label^="描述你想要构建"]:visible'); console.log('editors',await e.count());
 await e.first().click(); await e.first().fill('/round-rich-skill-20261006 Please explicitly invoke this Skill. Reply exactly ROUND_RICH_SKILL_20261006_OK. No tools or external access.');
 await p.screenshot({path:'证据/SKILL-044/SKILL-044-A01/composer-draft.png'});
 await p.getByRole('button',{name:'发送消息'}).click(); console.log('sent');
 const started=Date.now(); let txt=''; while(Date.now()-started<90000){await p.waitForTimeout(1000);txt=await p.locator('body').innerText();if(txt.includes('ROUND_RICH_SKILL_20261006_OK')&&!txt.includes('正在思考')&&!txt.includes('停止')) break;}
 await p.screenshot({path:'证据/SKILL-044/SKILL-044-A01/skill-invocation-result.png'}); console.log('TAIL',txt.slice(-2500)); await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
