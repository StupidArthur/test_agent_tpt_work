const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root='探索性测试/2026-10-05-需求用例全量探索';
const t0='2026-10-06T05:33:00+08:00',t1=new Date().toISOString();
const evroot=path.join(root,'证据');
const cases={
  'AGENT-005':{
    attempt_id:'AGENT-005-A01',status:'已执行-符合预期',
    pre:{account:'Arthur',expert_manager:'8 round-owned local experts before import',project:'existing tpt-workspace',model:'standard / low',permission:'workspace edits',fixture:'night-agent-complete-20261006'},
    input:'Imported the round-owned valid expert folder through the page file input; no native picker. No production expert or market item was modified.',
    steps:['Opened the Experts management iframe and verified the existing list before adding one uniquely named round-owned sample.','Clicked the distinct 导入专家 entry; the in-page dialog exposed both ZIP and webkitdirectory folder inputs plus a 提交 action.','Supplied the round-owned folder to input[type=file][webkitdirectory] using Playwright and submitted it.','Observed the UI toast 专家校验通过，已导入「我的专家」; the newly imported entry appeared in 我的专家 as local/run-ready.'],
    checkpoints:[{expected_index:1,expected:'与新建分离',observed:'Experts management exposes separate 导入专家 and 新建专家 buttons; the import dialog is distinct from the guided create conversation.',verdict:'符合',evidence:['证据/AGENT-005/AGENT-005-A01/import-dialog.png']},{expected_index:2,expected:'可识别包导入流程',observed:'The dialog accepted the selected folder, showed its name and two files, and the UI reported successful validation/import into 我的专家.',verdict:'符合',evidence:['证据/AGENT-005/AGENT-005-A01/import-result.txt']}],
    result:'A valid, round-owned expert folder was accepted via the in-page directory input; the UI confirmed import and the local expert list showed the new item. This replaces the historical native-picker blocker for the currently observed UI path; no broad claim about other platforms.',
    evidence:['import-dialog.png','import-dialog.txt','import-result.txt'], cleanup:{changes:['Added only round-owned expert night-agent-complete-20261006 via the authorized UI import.'],remaining:['The sample remains installed under the product data root for continued authorized round testing.']}
  },
  'AGENT-014':{
    attempt_id:'AGENT-014-A01',status:'已执行-符合预期',
    pre:{account:'Arthur',expert_manager:'8 round-owned local experts before import',project:'existing tpt-workspace',model:'standard / low',permission:'workspace edits',fixture:'night-agent-complete-20261006 with root metadata.json and agent.md'},
    input:'Imported the full valid round-owned package and read its displayed configuration; selected it in a new task and requested its unique marker.',
    steps:['Verified the fixture contains metadata.json and agent.md at the package root.','Imported the folder through the Expert management UI directory input and observed the success notice.','Read back the resulting local card, which showed the fixture display name/description, source 我创建的·本地运行, version 1.0.0.','Clicked 使用 on that exact card; the new-task composer contained the expert chip agent-night-agent-complete-20261006.','Submitted a unique marker request in Standard / low mode; the assistant returned NIGHT_AGENT_IMPORT_OK_20261006. The UI trace showed one assistant turn and no tool step.'],
    checkpoints:[{expected_index:1,expected:'加入我的Agent',observed:'After UI import, 我的专家 count increased 8→9 and the exact round-owned card showed source 我创建的·本地运行.',verdict:'符合',evidence:['证据/AGENT-014/AGENT-014-A01/import-card.png']},{expected_index:2,expected:'配置内容可读',observed:'The card rendered the fixture display description and tags. Using it inserted the exact internal expert chip; the assistant then returned its unique marker. Trace showed 1 turn / 1 step and no tool call.',verdict:'符合',evidence:['证据/AGENT-014/AGENT-014-A01/call-result.png','证据/AGENT-014/AGENT-014-A01/call-result.txt','证据/AGENT-014/AGENT-014-A01/trace-summary.txt']}],
    result:'The complete round-owned folder imported successfully and was visible as a local expert. Selecting the card inserted an expert reference in the new-task composer; the unique response marker matched the package instructions. The evidence supports this sample and path only.',
    evidence:['import-card.png','import-card.txt','call-result.png','call-result.txt','trace-summary.txt'], cleanup:{changes:['Added only round-owned expert night-agent-complete-20261006 via the authorized UI import.'],remaining:['The sample remains installed under the product data root for continued authorized round testing.']}
  }
};
for(const [cid,d] of Object.entries(cases)){
 const cfile=path.join(root,'执行记录',cid+'.json'), c=JSON.parse(fs.readFileSync(cfile,'utf8'));
 const aid=d.attempt_id, dir=path.join(evroot,cid,aid);fs.mkdirSync(dir,{recursive:true});
 const srcfiles=cid==='AGENT-005'?['import-dialog.png','import-dialog.txt']:['AGENT-014-import-card.png','AGENT-014-import-card.txt','AGENT-014-call-result.png','AGENT-014-call-result.txt','AGENT-014-trace-summary.txt'];
 const names=cid==='AGENT-005'?srcfiles:['import-card.png','import-card.txt','call-result.png','call-result.txt','trace-summary.txt'];
 const evidence=[];
 for(let i=0;i<srcfiles.length;i++){
  const src=path.join(evroot,srcfiles[i]),dst=path.join(dir,names[i]);
  if(fs.existsSync(src)){fs.copyFileSync(src,dst);evidence.push(path.relative(root,dst).replace(/\\/g,'/'));}
 }
 const doc=cid==='AGENT-005'?['import-result.txt']:[];
 if(doc.length){const p=path.join(dir,doc[0]);fs.writeFileSync(p,'Observed during the live UI attempt: the dialog identified folder night-agent-complete-20261006 with 2 files. After submitting, the visible UI notice was: 专家校验通过，已导入「我的专家」。 The list changed from 8 to 9 and displayed 本轮夜间导入验证专家 as a local expert. This text file records the observation; it is not a screenshot.\n','utf8');evidence.push(path.relative(root,p).replace(/\\/g,'/'));}
 const idx=evidence.map(p=>({path:p,case_id:cid,attempt_id:aid,captured_at:t1,type:p.endsWith('.png')?'scoped UI screenshot':'scoped UI text or contemporaneous observation',proves:cid==='AGENT-005'?'The isolated import entry and successful round-owned folder import.':'The imported card content, selected expert chip and unique assistant marker.',redacted:true,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')}));
 const attempt={attempt_id:aid,started_at:t0,ended_at:t1,environment_id:'ENV-001',surface:cid==='AGENT-005'?'Expert management iframe UI via Electron CDP + Playwright':'Expert management iframe and unified conversation UI via Electron CDP + Playwright',actual_preconditions:d.pre,input:d.input,actual_steps:d.steps,wait_condition:'Waited for the import terminal notice, then read the local expert card; for AGENT-014 also waited for the unique assistant marker.',checkpoints:d.checkpoints,observed_result:d.result,status:d.status,evidence,notes:'All findings remain pending bilateral review. The imported expert is a harmless round-owned sample, authorized for retention during this test round.',cleanup:d.cleanup};
 c.attempts.push(attempt);c.latest_attempt_id=aid;c.status=d.status;c.blocker=null;c.cleanup=d.cleanup;c.review_status='待双方审核';fs.writeFileSync(cfile,JSON.stringify(c,null,2)+'\n','utf8');
 fs.appendFileSync(path.join(evroot,'索引.jsonl'),idx.map(x=>JSON.stringify(x)).join('\n')+'\n','utf8');
 console.log(cid,aid,evidence.length,'evidence entries');
}
