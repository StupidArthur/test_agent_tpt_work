const {chromium}=require(process.env.TEMP+'/tpt-cdp/node_modules/playwright-core');
(async()=>{
 const b=await chromium.connectOverCDP('http://127.0.0.1:9234');const p=b.contexts()[0].pages()[0];
 await p.getByRole('button',{name:'技能',exact:true}).first().click();await p.waitForTimeout(700);
 const f=p.frames().find(x=>x.url().includes('supcon-skills/ui'));if(!f)throw Error('Skills iframe missing');
 await p.screenshot({path:'证据/SKILL-042/SKILL-042-A01/before-neighbor-import.png'});
 await f.getByRole('button',{name:'导入技能',exact:true}).click();await p.waitForTimeout(300);
 console.log('file inputs',await f.locator('input[type=file]').evaluateAll(xs=>xs.map(x=>({accept:x.accept,multiple:x.multiple,visible:!!(x.offsetWidth||x.offsetHeight||x.getClientRects().length)}))));
 await f.locator('input[type=file][accept*=".zip"]').setInputFiles('夹具/skill-rich-20261006/zips/round-skill-neighbor-20261006.zip');
 await p.waitForTimeout(800);await p.screenshot({path:'证据/SKILL-042/SKILL-042-A01/neighbor-import-result.png'});
 console.log((await f.locator('body').innerText()).slice(0,1600));
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
