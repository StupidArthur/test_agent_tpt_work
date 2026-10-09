const {chromium}=require(process.env.TEMP+'/tpt-cdp/node_modules/playwright-core');
const path=require('path'),fs=require('fs');
(async()=>{
 const [zip,label]=process.argv.slice(2);if(!zip||!label)throw Error('usage: import-skill-fixture.cjs ZIP LABEL');
 const dir=path.join('证据',label);fs.mkdirSync(dir,{recursive:true});
 const b=await chromium.connectOverCDP('http://127.0.0.1:9234');const p=b.contexts()[0].pages()[0];
 if(!p.frames().some(x=>x.url().includes('supcon-skills/ui'))){await p.getByRole('button',{name:'技能',exact:true}).first().click();await p.waitForTimeout(1500);}
 const f=p.frames().find(x=>x.url().includes('supcon-skills/ui'));if(!f)throw Error('Skills iframe missing');
 const listButton=f.getByRole('button',{name:'导入技能',exact:true});if(!(await listButton.isVisible().catch(()=>false))){await f.getByRole('button',{name:'技能',exact:true}).click();await p.waitForTimeout(300);}
 await p.screenshot({path:path.join(dir,'before.png')});await f.getByRole('button',{name:'导入技能',exact:true}).click();await p.waitForTimeout(200);
 await f.locator('input[type=file][accept*=".zip"]').setInputFiles(path.resolve(zip));await p.waitForTimeout(300);
 const dialog=f.getByRole('dialog');console.log('PREVIEW',await dialog.innerText());await p.screenshot({path:path.join(dir,'preview.png')});
 await dialog.getByRole('button',{name:'导入',exact:true}).click();await p.waitForTimeout(800);
 console.log('RESULT', (await f.locator('body').innerText()).slice(0,1200));await p.screenshot({path:path.join(dir,'after.png')});
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
