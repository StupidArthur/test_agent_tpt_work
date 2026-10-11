const fs=require('fs');
const {chromium}=require('C:/Users/Administrator/AppData/Local/Temp/tpt-cdp/node_modules/playwright-core');
const out='探索性测试/2026-10-05-需求用例全量探索/证据/SETTINGS-NIGHT-20261006';
async function openShortcutEditor(p){
 let ds=p.getByRole('dialog');
 if(await ds.count()===0){await p.getByRole('button',{name:/Arthur/}).click();await p.getByText('设置',{exact:true}).last().click();await p.waitForTimeout(200);ds=p.getByRole('dialog');}
 if(await ds.count()===1){await ds.first().getByRole('button',{name:'编辑快捷键',exact:true}).click();await p.waitForTimeout(200);ds=p.getByRole('dialog');}
 if(await ds.count()<2)throw new Error('shortcut editor did not open');
 return ds.last();
}
async function restore(p){
 await p.keyboard.press('Escape').catch(()=>{});
 let body=await p.locator('body').innerText();
 if(!body.includes('设置')){await p.getByRole('button',{name:/Arthur/}).click();await p.getByText('设置',{exact:true}).last().click();await p.waitForTimeout(200);body=await p.locator('body').innerText();}
 let d=await openShortcutEditor(p);let q=d.getByRole('button',{name:'修改搜索会话快捷键',exact:true});
 if(await q.count()){
  let row=await q.evaluate(x=>x.closest('li').innerText);
  if(row.includes('Alt')||row.includes('Shift')){await q.click();await p.waitForTimeout(80);await d.getByRole('button',{name:'恢复默认',exact:true}).click();await p.waitForTimeout(250);}
 }
 await d.getByRole('button',{name:'关闭快捷键',exact:true}).click().catch(()=>{});await p.waitForTimeout(100);
 const ds=p.getByRole('dialog');if(await ds.count())await ds.first().getByRole('button',{name:'关闭',exact:true}).click().catch(()=>{});
 await p.waitForTimeout(120);await p.getByRole('button',{name:/Arthur/}).click();await p.getByText('设置',{exact:true}).last().click();await p.waitForTimeout(200);
 d=await openShortcutEditor(p);q=d.getByRole('button',{name:'修改搜索会话快捷键',exact:true});const final=await q.evaluate(x=>x.closest('li').innerText);const all=await d.innerText();
 if(!final.includes('Ctrl')||final.includes('Alt')||final.includes('Shift')||all.includes('1 项已自定义'))throw new Error('shortcut not restored: '+final);
 const result={final_binding:final,custom_indicator:all.includes('1 项已自定义'),restored:true};fs.writeFileSync(out+'/shortcut-final-restore.json',JSON.stringify(result,null,2));await p.screenshot({path:out+'/shortcut-reopen-verify.png'});return result;
}
(async()=>{
 const b=await chromium.connectOverCDP('http://127.0.0.1:9234');const p=b.contexts()[0].pages()[0];await p.setViewportSize({width:900,height:700});
 let remap=null,effect=null,restoreResult=null;
 try{
  let d=await openShortcutEditor(p);const q=d.getByRole('button',{name:'修改搜索会话快捷键',exact:true});
  const original=await q.evaluate(x=>x.closest('li').innerText);if(!original.includes('Ctrl')||!original.includes('K'))throw new Error('unexpected original '+original);
  await q.click();await p.waitForTimeout(80);await p.keyboard.press('Control+Alt+Shift+K');await p.waitForTimeout(250);remap=await q.evaluate(x=>x.closest('li').innerText);
  if(!(remap.includes('Alt')&&remap.includes('Shift')&&remap.includes('K')))throw new Error('remap was not rendered: '+remap);
  await p.screenshot({path:out+'/shortcut-remapped.png'});await d.getByRole('button',{name:'关闭快捷键',exact:true}).click();await p.waitForTimeout(100);await p.getByRole('dialog').first().getByRole('button',{name:'关闭',exact:true}).click();await p.waitForTimeout(150);
  await p.keyboard.press('Control+Alt+Shift+K');await p.waitForTimeout(350);const text=await p.locator('body').innerText();effect={binding:remap,triggered_combo:'Control+Alt+Shift+K',search_ui_opened:text.includes('搜索会话名称')};
  await p.screenshot({path:out+'/shortcut-remapped-effect.png'});fs.writeFileSync(out+'/shortcut-effect.json',JSON.stringify(effect,null,2));
  if(effect.search_ui_opened)await p.keyboard.press('Escape');
 }catch(e){console.error('shortcut test stage:',e.message)}
 finally{restoreResult=await restore(p);await b.close();}
 console.log(JSON.stringify({remap,effect,restore:restoreResult}));
})().catch(e=>{console.error(e);process.exit(1)});
