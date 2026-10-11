const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.TEMP + '/tpt-cdp/node_modules/playwright-core');
(async()=>{
 const out=path.resolve('证据/SKILL-040/SKILL-040-A01'); fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.connectOverCDP('http://127.0.0.1:9234');
 const page=browser.contexts()[0].pages()[0];
 const frame=page.frames().find(f=>f.url().includes('supcon-skills'));
 const states=[];
 const snap=async label=>{states.push({label,body:(await frame.locator('body').innerText()).slice(-5000),dirs:await frame.locator('.tree-dir').evaluateAll(xs=>xs.map(x=>({name:x.innerText,expanded:x.getAttribute('aria-expanded'),className:x.className,html:x.outerHTML.slice(0,300)}))),files:await frame.locator('.tree-file').evaluateAll(xs=>xs.map(x=>x.innerText))}); await page.screenshot({path:path.join(out,`tree-${label}.png`)});};
 await snap('initial');
 for(const name of ['data','fixtures','references','handbook','advanced']){const d=frame.locator('.tree-dir').filter({hasText:new RegExp('^'+name+'$')});console.log('DIR',name,await d.count());if(await d.count()){const isOpen=await d.first().evaluate(x=>x.className.includes('_open_'));if(!isOpen){await d.first().click(); await page.waitForTimeout(350);} await snap('expanded-'+name);}}
 const names=await frame.locator('.tree-file').allTextContents(); console.log('FILES',names);
 for(const name of ['guide.md','records.json','sample.bin','notes.txt']){const f=frame.locator('.tree-file').filter({hasText:new RegExp(name.replace('.','\\.')+'$')});console.log('FILE',name,'count',await f.count()); if(await f.count()){await f.first().click();await page.waitForTimeout(300);await snap('file-'+name.replace('.','-'));}}
 fs.writeFileSync(path.join(out,'tree-exploration.json'),JSON.stringify(states,null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
