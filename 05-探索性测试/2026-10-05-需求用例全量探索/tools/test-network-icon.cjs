const http=require('http'),fs=require('fs'),path=require('path');const{chromium}=require(process.env.TEMP+'/tpt-cdp/node_modules/playwright-core');
(async()=>{
 let hits=[];const png=fs.readFileSync(path.resolve('夹具/skill-rich-20261006/neighbor-icon.png'));
 const server=http.createServer((req,res)=>{hits.push({url:req.url,method:req.method});res.writeHead(200,{'content-type':'image/png','cache-control':'no-store'});res.end(png)});
 await new Promise((ok,fail)=>server.once('error',fail).listen(18499,'127.0.0.1',ok));
 const out='证据/SKILL-037/SKILL-037-A01';fs.mkdirSync(out,{recursive:true});
 const b=await chromium.connectOverCDP('http://127.0.0.1:9234');const p=b.contexts()[0].pages()[0];
 if(!p.frames().some(x=>x.url().includes('supcon-skills/ui'))){await p.getByRole('button',{name:'技能',exact:true}).click();await p.waitForTimeout(1100);}
 let f=p.frames().find(x=>x.url().includes('supcon-skills/ui'));if(await f.getByText('详情',{exact:true}).count()){let q=f.getByRole('button',{name:'技能',exact:true});await q.focus();await q.press('Enter');await p.waitForTimeout(500);}
 await f.getByRole('button',{name:'导入技能',exact:true}).click();await p.waitForTimeout(150);await f.locator('input[type=file][accept*=".zip"]').setInputFiles(path.resolve('夹具/skill-rich-20261006/zips/round-skill-network-20261006.zip'));await p.waitForTimeout(150);
 await f.getByRole('dialog').getByRole('button',{name:'导入',exact:true}).click();await p.waitForTimeout(900);
 await f.getByRole('textbox',{name:'搜索技能'}).fill('round-skill-network-20261006');await p.waitForTimeout(350);
 const card=f.getByText('本轮技能样本 20261006',{exact:true}).first();await p.screenshot({path:path.join(out,'network-card.png')});
 const cardData=await card.evaluate(x=>{let c=x;for(let i=0;i<6&&c;i++,c=c.parentElement){if(c.querySelector('img'))return{html:c.outerHTML.slice(0,1800),images:[...c.querySelectorAll('img')].map(i=>i.src.slice(0,250))}}return null});
 await p.waitForTimeout(1800);const result={requests:hits,cardData,body:(await f.locator('body').innerText()).slice(0,800)};fs.writeFileSync(path.join(out,'network-observation.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
 await b.close();await new Promise(ok=>server.close(ok));
})().catch(e=>{console.error(e);process.exit(1)});
