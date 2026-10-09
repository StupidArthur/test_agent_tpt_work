const {chromium}=require('C:/Users/Administrator/AppData/Local/Temp/tpt-cdp/node_modules/playwright-core');
(async()=>{
 const b=await chromium.connectOverCDP('http://127.0.0.1:9234');
 const p=b.contexts()[0].pages()[0];
 const box=p.getByRole('textbox',{name:'描述你想要构建的内容, / 调用指令, @ 文件或对话'});
 await box.fill('/expert-manager 只修改我指定的本轮Expert round-agent-bundled-call-20261006 的 metadata.json displayDescription.zh，在末尾增加文字“本轮编辑回读标记 EDIT_CHECK_20261006”。其他字段与 agent.md、内嵌Skill一律保持原样。应用后给出明确变更摘要和可返回专家详情页的路径。');
 await p.getByRole('button',{name:'发送消息'}).last().click();
 await p.waitForTimeout(30000);
 console.log((await p.locator('body').innerText()).slice(-1600));
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
