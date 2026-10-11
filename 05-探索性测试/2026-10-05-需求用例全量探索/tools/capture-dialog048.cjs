const fs=require('fs');
const {chromium}=require('C:/Users/Administrator/AppData/Local/Temp/tpt-cdp/node_modules/playwright-core');
(async()=>{
  const base='探索性测试/2026-10-05-需求用例全量探索/证据/DIALOG-048/DIALOG-048-A01';
  fs.mkdirSync(base,{recursive:true});
  const browser=await chromium.connectOverCDP('http://127.0.0.1:9234');
  const page=browser.contexts()[0].pages()[0];
  const table=page.locator('table').last();
  const data=await table.evaluate(el=>{
    let column=el; while(column && !String(column.className).includes('EvIC1a_column')) column=column.parentElement;
    return {url:location.href,title:document.title,model:document.querySelector('button[aria-label^="选择模型"]')?.getAttribute('aria-label'),table_text:el.innerText,rows:[...el.rows].map(r=>[...r.cells].map(c=>c.innerText)),dimensions:{row_count:el.rows.length,column_count:el.rows[0]?.cells.length},table_scroll:{client_width:el.parentElement.clientWidth,scroll_width:el.parentElement.scrollWidth},message_buttons:[...column.querySelectorAll('button')].map(b=>({aria_label:b.getAttribute('aria-label'),text:b.innerText,visible:!!(b.offsetWidth||b.offsetHeight)})),turn_process:[...column.querySelectorAll('[data-turn-process]')].map(e=>Object.fromEntries(['data-turn-process','data-turn-process-messages','data-turn-process-tool-calls','data-turn-process-subagents'].map(k=>[k,e.getAttribute(k)])))};
  });
  await table.evaluate(el=>el.scrollIntoView({block:'center'}));
  await table.screenshot({path:base+'/table.png'});
  const flow=table.locator('xpath=ancestor::div[contains(@class,"EvIC1a_flowItem")]');
  await flow.screenshot({path:base+'/message.png'});
  fs.writeFileSync(base+'/observed.json',JSON.stringify(data,null,2),'utf8');
  fs.writeFileSync(base+'/input.txt','Please respond only with a Markdown table and no extra prose. Do not create files or call tools. Include test marker DIALOG048_TABLE_20261006. Use three fictional rows: sensor A=12, sensor B=15, sensor C=18.\n','utf8');
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
