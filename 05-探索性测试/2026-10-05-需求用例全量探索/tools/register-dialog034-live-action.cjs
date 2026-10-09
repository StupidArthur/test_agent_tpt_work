const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = '探索性测试/2026-10-05-需求用例全量探索';
const id = 'DIALOG-034', aid = 'DIALOG-034-A02', oid = 'OBS-262';
const dir = '证据/DIALOG-034-NIGHT-20261006';
const cases = JSON.parse(fs.readFileSync(path.join(root, '用例/cases.json'), 'utf8'));
const definition = cases.find(x => x.id === id);
const recordPath = path.join(root, `执行记录/${id}.json`), record = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
if (record.attempts.some(x => x.attempt_id === aid)) throw new Error(`${aid} already exists`);
const timeline = JSON.parse(fs.readFileSync(path.join(root, `${dir}/timeline.json`), 'utf8'));
const statusHistory = timeline.timeline.map(x => ({ at_ms: x.at_ms, visible_status: x.text.split('\n').filter(y => /正在分析请求|已写入文件|已完成工作|探索中，用时/.test(y)) }));
fs.writeFileSync(path.join(root, `${dir}/status-history.json`), JSON.stringify(statusHistory, null, 2) + '\n', 'utf8');
const notes = `2026-10-06 00:44Z：DIALOG-034长任务UI状态采样。总时长约32.4秒。截图live-12.png在约10秒显示一条“正在分析请求 · I'll write the content. Then verify line count”状态行及“探索中，用时10秒”。timeline.json共38个时间点；状态文本从“探索中...”转为“正在分析请求 · ...”，完成时为“已完成工作”。采样中可见单条当前状态区，而不是多个历史状态条目；但截图是不同时间截面，不能证明React/DOM节点身份相同，也未捕获每次paint。任务实际在round-owned目录新建process-log.txt；Trace显示写入+70行及grep命中70项，答复报告70行。\n`;
fs.writeFileSync(path.join(root, `${dir}/live-status-observation.txt`), notes, 'utf8');
const files = ['prompt-before-send.png','live-01.png','live-07.png','live-12.png','result.png','result.txt','trace.png','trace.txt','timeline.json','status-history.json','live-status-observation.txt'].map(x => `${dir}/${x}`);
for (const p of files) if (!fs.existsSync(path.join(root,p))) throw new Error(`Missing ${p}`);
const observed = '产品UI在长任务进行中于单条状态区显示“正在分析请求 · I\'ll write the content. Then verify line count”，并持续显示“探索中，用时10秒”；时间采样中状态文字从“探索中...”变为该动作文字，最终切换“已完成工作”。本任务真实通过工作区工具新建round-owned文件并写入70行，Trace可见write +70与grep命中70。不同时间截图显示的是单条状态区而非累积历史列表，但未验证同一DOM节点身份或每次渲染帧。';
const ev = files.map(p => ({ path:p, case_id:id, attempt_id:aid, observation_id:oid, captured_at:'2026-10-06T00:44:21.616Z', type:p.endsWith('.png')?'screenshot':'UI timeline/trace/operation record', proves:`${aid}: ${observed}`, redacted:true, sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex') }));
const attempt = {
 attempt_id:aid, started_at:'2026-10-06T00:43:49.000Z', ended_at:timeline.captured_at, environment_id:'ENV-001',
 surface:'已有tpt-workspace本轮新建会话；产品对话状态区、工作区工具Trace；CDP 9234 + Playwright',
 actual_preconditions:{account_alias:'Arthur',workspace:'tpt-workspace',project:'既有项目；仅新增DIALOG034-round-owned目录及process-log.txt',session_id:'In the existing tpt-workspace, ...（本轮长进度任务）',model:'标准 / low',permission:'工作区内修改；用户明确授权创建本轮无害夹具',fixtures:['DIALOG034-round-owned/process-log.txt（本轮新建）']},
 input:'在已有tpt-workspace中仅创建DIALOG034-round-owned/process-log.txt，写入70行，逐行用工作区文件工具验证行数；期间观察UI动作文字与状态区域。',
 actual_steps:['CDP连接9234复用当前产品实例，设置可读窗口尺寸。','通过新建任务UI选中已有tpt-workspace及工作区内修改，保留标准/low。','在可见composer发送限定文件路径、内容标记及唯一创建范围的70行任务。','持续约32.4秒采样对话状态区截图与文本；页面变动后再枚举状态。','等待终态并切换Trace；确认write工具+70行以及grep匹配70项，核对答复路径与行数。'],
 wait_condition:'观察长任务的中间状态与最终完成态；完成后检查Trace中的写入与验证工具结果。',
 checkpoints:[
  {expected_index:1,expected:definition.expected[0],observed:'约10秒时状态区显示动作文字“正在分析请求 · I\'ll write the content. Then verify line count”，此前为“探索中...”；时间点截图均只有单条当前状态区。故支持动作文字更新，但不同截图不能严格证明每次更新都发生在同一DOM原节点。',verdict:'符合',evidence:[`${dir}/live-07.png`,`${dir}/live-12.png`,`${dir}/status-history.json`,`${dir}/live-status-observation.txt`]},
  {expected_index:2,expected:definition.expected[1],observed:'截图/时间采样中对话区显示一个当前状态行，未见旧状态累计成多条历史流水；完成后单一完成摘要。未验证DOM节点身份或更细粒度渲染行为。',verdict:'符合',evidence:[`${dir}/live-01.png`,`${dir}/live-07.png`,`${dir}/live-12.png`,`${dir}/result.png`,`${dir}/status-history.json`]}
 ],
 observed_result:observed,status:'已执行-符合',evidence:ev.map(x=>x.path),difference_ids:[],notes:'只在本轮新建目录内创建一个本轮测试文本文件，保留该轮测试会话及文件待双方审核；没有更改既有用户文件/配置。UI截图不能证明DOM节点复用细节。'
};
record.attempts.push(attempt); record.latest_attempt_id=aid; record.status='已执行-符合'; record.review_status='待双方审核'; record.blocker=null;
record.product_observations=record.product_observations||[]; record.product_observations.push({observation_id:oid,feature_id:null,statement:observed,case_ids:[id],attempt_ids:[aid],environment_id:'ENV-001',verified_depth:'实际执行约32秒的标准/low工作区文件任务，并采样状态区；通过Trace回读文件写入与70行检索结果。',scope_and_limits:'仅本任务当前桌面端状态区与一次round-owned长任务；未验证同一DOM节点复用。待双方审核。',evidence:ev.map(x=>x.path),review_status:'待双方审核'});
record.cleanup=record.cleanup||{changes:[],remaining:[]}; record.cleanup.remaining=[...new Set([...(record.cleanup.remaining||[]),'本轮测试保留DIALOG034-round-owned/process-log.txt和对应对话；用户明确授权，未更改其它文件。'])];
record.audit_history=record.audit_history||[]; record.audit_history.push({at:attempt.ended_at,event:'DIALOG-034-A02执行本轮长进度任务；真实工作区写入和70行验证；同步采集对话状态区时间采样。'});
fs.writeFileSync(recordPath,JSON.stringify(record,null,2)+'\n','utf8');
const idxPath=path.join(root,'证据/索引.jsonl'), idx=fs.readFileSync(idxPath,'utf8').trimEnd().split(/\r?\n/).filter(Boolean).map(JSON.parse); idx.push(...ev); fs.writeFileSync(idxPath,idx.map(x=>JSON.stringify(x)).join('\n')+'\n','utf8');
const obsPath=path.join(root,'观察记录.jsonl'), obs=fs.readFileSync(obsPath,'utf8').trimEnd().split(/\r?\n/).filter(Boolean).map(JSON.parse); obs.push({observation_id:oid,recorded_at:attempt.ended_at,related_cases:[id],category:'long task inline action status update',scope:`${aid}; one authorized round-owned 70-line workspace file task`,observation:observed,candidate_status:'pending bilateral review',evidence:ev}); fs.writeFileSync(obsPath,obs.map(x=>JSON.stringify(x)).join('\n')+'\n','utf8');
fs.appendFileSync(path.join(root,'变更清单.md'),`\n| CL-31 | ${attempt.ended_at} | 新建DIALOG034-round-owned/process-log.txt并通过工作区工具写入、核验70行；保留对话及夹具 | 仅本轮授权新目录/文件；未触碰其它文件或配置 | DIALOG-034-A02；${dir}/ |\n`,'utf8');
console.log(JSON.stringify({attempt:aid,observation:oid,evidence:ev.length,hashes:ev.map(x=>x.sha256)}));
