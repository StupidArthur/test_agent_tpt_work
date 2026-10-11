// One-off registration of the 2026-10-06 UI import exploration.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const j = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const write = (p, x) => fs.writeFileSync(path.join(root, p), JSON.stringify(x, null, 2) + '\n', 'utf8');
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');
const cases = j('用例/cases.json');
const recordsDir = path.join(root, '执行记录');
const evIndex = path.join(root, '证据/索引.jsonl');
const obsPath = path.join(root, '观察记录.jsonl');
const now = '2026-10-05T18:08:00.000Z';
const definitions = {
  'SKILL-068': {
    attempts: [{ suffix:'A02', status:'已执行-存在差异', obs:'通过 UI 选择单个 SKILL.md（name 存在而 description 缺失）并点击导入；操作结束后“我的技能”总数由32增至33，新增 round-night-invalid-only-20261006 卡片，且该卡片 role=switch aria-checked=true、disabled=true。缺 description 的包实际进入技能库，自动启用状态可见但开关不能操作。仅本轮样本。', cps:[['不写入我的技能','样本实际入库并显示新卡，未达到失败不入库预期。','差异',['failed-import.png','library-after-failure.png']],['无可用半成品','UI未显示校验失败；完成后出现用户创建卡片。','差异',['failed-import.png']]], files:['preconfirm.png','failed-import.png','library-after-failure.png'] }]
  },
  'SKILL-069': {
    attempts: [{ suffix:'A01', status:'已执行-结论不确定', obs:'在导入弹窗选择有效 ZIP 后、点击导入前，界面仅显示“ZIP / night-root-package-20261006.zip / 1个文件·692B”和文件要求说明；未出现候选技能名称或逐项候选清单。此时仍在导入弹窗，尚未写正式目录。随后该 ZIP 经另一尝试导入用于 SKILL-070/075。', cps:[['形成候选清单','导入确认前界面只列文件名、文件数和大小，没有解析后的候选技能条目。','未验证',['valid-zip-preconfirm.png']],['不立即写正式目录','观察时仍停留导入弹窗，正式技能列表未变化；未点击导入。','符合',['valid-zip-preconfirm.png']]], files:['valid-zip-preconfirm.png'] }]
  },
  'SKILL-070': {
    attempts: [{ suffix:'A01', status:'已执行-符合预期', obs:'真实 UI 导入 night-root-package-20261006.zip 成功，卡片技术名 round-night-root-20261006。详情显示一个 Skill 目录共3个文件（assets、nested-skill、SKILL.md），未拆出 nested-skill/SKILL.md 成为第二张 Skill 卡。标准/low 新任务显式调用返回唯一标记 ROUND_NIGHT_ROOT_20261006_OK。操作后仅将本轮样本切回未启用。', cps:[['整体识别一个Skill','我的技能列表仅出现 round-night-root-20261006 一张卡；详情列出3个包内文件。','符合',['detail.png','import-result.png']],['不拆内部子Skill','nested-skill作为同一Skill目录内文件夹显示；列表中无 round-night-nested-20261006 单独卡片。','符合',['detail.png','import-result.png']]], files:['import-result.png','detail.png','use-result.png','disabled-final.png'] }]
  },
  'SKILL-071': {
    attempts: [{ suffix:'A01', status:'已执行-存在差异', obs:'用 UI 选择无根 SKILL.md 的本轮集合目录：包含一级 valid-one/SKILL.md、一级 invalid-no-description/SKILL.md、二级 nested/deep-skill/SKILL.md、__MACOSX 与 .DS_Store，共5文件·486B。点击导入后整批报错“目录下未找到任何 skill 条目（需含 SKILL.md 的子目录或 .md 文件）”；我的技能总数维持33。页面没有候选清单；有效一级样本没有被识别，未写入技能库。', cps:[['仅识别一级符合项','有效一级 valid-one/SKILL.md 未被识别，整批返回未找到任何 skill 条目。','差异',['preconfirm.png','import-error.png']],['不递归导入深层','本尝试未导入任何条目；无法证明成功过滤二级项。','未验证',['import-error.png']]], files:['preconfirm.png','import-error.png'] }]
  },
  'SKILL-072': {
    attempts: [{ suffix:'A01', status:'已执行-存在差异', obs:'ZIP根包含有效SKILL.md、__MACOSX/._SKILL.md、.DS_Store。经 UI 导入成功，详情明确将 __MACOSX、.DS_Store、SKILL.md 均列在同一 Skill 目录内，合计3个文件。因此系统垃圾文件未被忽略；仅作用于 round-night-trash-20261006。该样本随后成功切为未启用。', cps:[['忽略垃圾条目','详情树包含 __MACOSX 与 .DS_Store，未忽略。','差异',['detail.png','postimport.png']],['正式目录不写入','已将本轮有效包导入，且垃圾文件随包写入本轮Skill目录；检查点不符合。','差异',['detail.png']]], files:['preconfirm.png','postimport.png','detail.png','disabled-final.png'] }]
  },
  'SKILL-073': {
    attempts: [{ suffix:'A01', status:'已执行-结论不确定', obs:'上传的本轮集合目录含技术名 round-created-skill-20261006 的同名冲突候选；导入确认前 UI 只显示目录名与6个文件·580B，不显示冲突项目、跳过状态、覆盖/改名选项或逐项候选。为避免确认后可能覆盖现有本轮 Skill，未点击导入；默认跳过规则未验证。', cps:[['标为同名冲突并默认跳过','确认前界面没有同名冲突或默认跳过信息。','未验证',['duplicate-preconfirm.png']],['不自动覆盖改名','未确认提交，未观察覆盖/改名结果。','未验证',['duplicate-preconfirm.png']]], files:['duplicate-preconfirm.png'] }]
  },
  'SKILL-074': {
    attempts: [{ suffix:'A01', status:'已执行-存在差异', obs:'通过无冲突本轮集合夹具提交一级有效项、一级无描述项、二级有效项及垃圾项。导入整体失败，UI称目录下未找到任何 skill 条目；我的技能保持33。没有成功项，也没有逐项/汇总报告，未展示部分成功隔离。', cps:[['有效项成功','没有有效一级项成功入库；整批失败。','差异',['preconfirm.png','import-error.png']],['其余跳过失败','页面未显示逐项跳过/失败结果。','差异',['import-error.png']],['显示逐项及汇总','仅有单条整体错误，没有逐项及汇总。','差异',['import-error.png']]], files:['preconfirm.png','import-error.png'] }]
  },
  'SKILL-075': {
    attempts: [
      { suffix:'A01', status:'已执行-存在差异', obs:'导入 round-night-root-20261006 ZIP，卡片来源用户创建，导入后总数29→30、已启用28→29，role=switch aria-checked=true。UI没有展示内部skill_id字段，不能直接确认内部ID唯一。成功后通过标准/low新任务调用返回唯一标记，最终已在UI切回未启用。', cps:[['独立新skill_id','新技术名卡片新增，但UI未显示内部skill_id，独立ID未直接回读。','未验证',['import-result.png','detail.png']],['source为user','详情明确显示来源“用户创建”。','符合',['detail.png']],['默认未启用','导入后开关aria-checked=true，启用总数+1；之后手动切回未启用。','差异',['import-result.png','disabled-final.png']]], files:['import-result.png','detail.png','use-result.png','disabled-final.png'] },
      { suffix:'A02', status:'已执行-存在差异', obs:'第二个独立合法目录包 valid-one/SKILL.md 导入成功，技术名 round-night-collection-valid-20261006；总数31→32、启用29→30。来源用户创建。独立标准/low新任务实际调用返回 ROUND_NIGHT_COLLECTION_20261006_OK。随后UI尝试停用，但该次控制动作未完成/状态回读仍为true；之后对该本轮样本通过另一轮可见开关操作确认切换为false。', cps:[['独立新skill_id','新技术名卡片新增，界面仍未显示内部skill_id。','未验证',['postimport.png','status.png']],['source为user','导入卡片来源用户创建。','符合',['status.png']],['默认未启用','导入后已启用总数+1，样本卡片aria-checked=true。','差异',['status.png','disabled-final.png']]], files:['preconfirm-folder.png','postimport.png','status.png','use-result.png','disabled-final.png'] }
    ]
  }
};
const pathMap = {
  'SKILL-068': {'failed-import.png':'证据/SKILL-068/SKILL-068-A01/failed-import.png','library-after-failure.png':'证据/SKILL-068/SKILL-068-A01/library-after-failure.png','preconfirm.png':'证据/SKILL-068/SKILL-068-A01/preconfirm.png'},
  'SKILL-069': {'valid-zip-preconfirm.png':'证据/SKILL-069/SKILL-069-A01/valid-zip-preconfirm.png'},
  'SKILL-070': {'import-result.png':'证据/SKILL-075/SKILL-075-A01-import-result.png','detail.png':'证据/SKILL-075/SKILL-075-A01/detail.png','use-result.png':'证据/SKILL-075/SKILL-075-A01/use-result.png','disabled-final.png':'证据/SKILL-075/SKILL-075-A01/disabled-final.png'},
  'SKILL-071': {'preconfirm.png':'证据/SKILL-074/SKILL-074-A01/preconfirm.png','import-error.png':'证据/SKILL-071/SKILL-071-A01/import-error.png'},
  'SKILL-072': {'preconfirm.png':'证据/SKILL-072/SKILL-072-A01/preconfirm.png','postimport.png':'证据/SKILL-072/SKILL-072-A01/postimport.png','detail.png':'证据/SKILL-072/SKILL-072-A01/detail.png','disabled-final.png':'证据/SKILL-072/SKILL-072-A01/cleanup-current-state.png'},
  'SKILL-073': {'duplicate-preconfirm.png':'证据/SKILL-073/SKILL-073-A01/duplicate-preconfirm.png'},
  'SKILL-074': {'preconfirm.png':'证据/SKILL-074/SKILL-074-A01/preconfirm.png','import-error.png':'证据/SKILL-071/SKILL-071-A01/import-error.png'},
  'SKILL-075': {'import-result.png':'证据/SKILL-075/SKILL-075-A01-import-result.png','detail.png':'证据/SKILL-075/SKILL-075-A01/detail.png','use-result.png':'证据/SKILL-075/SKILL-075-A01/use-result.png','disabled-final.png':'证据/SKILL-075/SKILL-075-A01/disabled-final.png','preconfirm-folder.png':'证据/SKILL-075/SKILL-075-A02/preconfirm-folder.png','postimport.png':'证据/SKILL-075/SKILL-075-A02/postimport.png','status.png':'证据/SKILL-075/SKILL-075-A02/status.png'}
};
const caseTitle = id => cases.find(c=>c.id===id).title;
const allEvidence = [];
for (const [id, def] of Object.entries(definitions)) {
  const file = path.join(recordsDir, id + '.json');
  const rec = JSON.parse(fs.readFileSync(file, 'utf8'));
  const plannedIds = def.attempts.map(d=>`${id}-${d.suffix}`);
  rec.attempts = (rec.attempts||[]).filter(a=>!plannedIds.includes(a.attempt_id));
  rec.product_observations = (rec.product_observations||[]).filter(o=>!(o.attempt_ids||[]).some(a=>plannedIds.includes(a)));
  rec.audit_history = (rec.audit_history||[]).filter(h=>!plannedIds.some(a=>(h.event||'').includes(a)));
  rec.difference_ids = (rec.difference_ids||[]).filter(d=>!['DIFF-031','DIFF-032','DIFF-033','DIFF-034','DIFF-035'].includes(d));
  for (const d of def.attempts) {
    const attemptId = `${id}-${d.suffix}`;
    const sourceMap = pathMap[id];
    const destDir = `证据/${id}/${attemptId}`;
    fs.mkdirSync(path.join(root, destDir), {recursive:true});
    const evidence = d.files.map(name => {
      const src = sourceMap[name];
      const dest = `${destDir}/${name}`;
      if (src !== dest) fs.copyFileSync(path.join(root, src), path.join(root, dest));
      const row = {path:dest,case_id:id,attempt_id:attemptId,observation_id:null,captured_at:now,type:name.endsWith('.json')?'trace':'screenshot',proves:`${attemptId}: ${d.obs}`,redacted:true,sha256:sha(dest)};
      allEvidence.push(row); return dest;
    });
    const c = cases.find(x=>x.id===id);
    const attempt = {
      attempt_id:attemptId,started_at:now,ended_at:now,environment_id:'ENV-001',
      surface:'TPT Work UI via verified CDP 127.0.0.1:9234 + Playwright; in-app file inputs; standard/low for actual Skill use',
      actual_preconditions:{account_alias:'Arthur',workspace:'tpt-workspace',project:'未新增项目',session_id:'本轮导入管理UI及显式调用新任务',model:'标准 / low（涉及实际调用的attempt）',permission:'工作区内修改；仅 round-owned fixtures',fixtures:['night-root-package-20261006.zip','night-trash-package-20261006.zip','night-collection-20261006','night-collection-safe-20261006','night-invalid-direct-20261006/SKILL.md']},
      input:`按${id}用例检查点使用本轮无害导入夹具；未确认同名目录集合，避免可能覆盖。`,
      actual_steps:['确认技能管理iframe、我的技能计数与本轮夹具归属。','经页面内文件选择器提交指定ZIP、SKILL.md或目录，不触发Windows原生文件窗口。','读取导入预览、结果、卡片/详情和计数；适用时以标准/low新任务实际调用本轮样本。','仅操作本轮样本的启停状态并保存界面证据。'],
      wait_condition:'等待 UI 预览或导入终态；读取可见卡片、来源、启停状态、详情目录和实际输出。',
      checkpoints:d.cps.map((x,i)=>({expected_index:i+1,expected:x[0],observed:x[1],verdict:x[2],evidence:x[3].map(n=>`${destDir}/${n}`)})),
      observed_result:d.obs,status:d.status,evidence,difference_ids:[],notes:'只涉及本轮 round-owned 测试包；旧尝试保留；产品结论待双方审核。'
    };
    if (id==='SKILL-068' && d.suffix==='A02') attempt.difference_ids=['DIFF-031'];
    if (id==='SKILL-071') attempt.difference_ids=['DIFF-032'];
    if (id==='SKILL-072') attempt.difference_ids=['DIFF-033'];
    if (id==='SKILL-074') attempt.difference_ids=['DIFF-034'];
    if (id==='SKILL-075') attempt.difference_ids=['DIFF-035'];
    attempt.checkpoints.forEach(cp=>cp.evidence.forEach(p=>{
      const row=allEvidence.find(e=>e.path===p); if(row) row.observation_id=null;
    }));
    rec.attempts.push(attempt); rec.latest_attempt_id=attemptId; rec.status=d.status;
    rec.blocker=null; rec.applicability_reason=null;
    rec.review_status='待双方审核';
    if(!rec.product_observations) rec.product_observations=[];
    rec.product_observations.push({feature_id:null,statement:d.obs,case_ids:[id],attempt_ids:[attemptId],environment_id:'ENV-001',verified_depth:`仅${id} ${attemptId}与其列明的round-owned UI样本`,scope_and_limits:'只涉及本轮测试夹具、技能管理UI和本轮任务；未操作用户已有Skill。产品结论待双方审核。',evidence});
    if(!rec.audit_history) rec.audit_history=[];
    rec.audit_history.push({at:now,event:`夜间UI实际操作补录${attemptId}；保留旧记录，待双方审核。`});
    if(!rec.difference_ids) rec.difference_ids=[];
    for(const di of attempt.difference_ids||[]) if(!rec.difference_ids.includes(di)) rec.difference_ids.push(di);
  }
  rec.status=def.attempts[def.attempts.length-1].status;
  rec.cleanup={changes:[{change:'仅新增本轮round-owned Skill导入样本；root与valid collection样本已在UI停用。trash样本曾成功停用并留证；缺description样本被系统导入且UI开关为disabled+aria-checked=true，不能经开关恢复，本轮保留以供复核。未触及已有用户Skill。',restored:false,verification:'夜间续跑最新回读：round-night-root与round-night-trash、round-night-collection-valid为aria-checked=false；round-night-invalid-only因无description显示aria-checked=true且disabled=true。',evidence:['证据/SKILL-072/SKILL-072-A01/cleanup-current-state.png','证据/SKILL-068/SKILL-068-A02/failed-import.png']}],remaining:['round-owned导入样本保留；invalid-only条目因导入成功且启停控件禁用，尚不能通过当前UI恢复为停用。']};
  write(`执行记录/${id}.json`,rec);
}
// Attach observation IDs to attempts and index rows after all record files are written.
let maxObs=185;
const obsRows=fs.readFileSync(obsPath,'utf8').split(/\r?\n/).filter(Boolean);
for(const s of obsRows){try{const o=JSON.parse(s);const m=o.observation_id?.match(/OBS-(\d+)/);if(m)maxObs=Math.max(maxObs,+m[1]);}catch{}}
const appended=[];
for(const [id,def] of Object.entries(definitions)){
  const rec=j(`执行记录/${id}.json`);
  for(const d of def.attempts){
    const aid=`${id}-${d.suffix}`, attempt=rec.attempts.find(a=>a.attempt_id===aid), obsId=`OBS-${++maxObs}`;
    attempt.checkpoints.forEach(cp=>cp.evidence.forEach(p=>{const ev=allEvidence.find(e=>e.path===p);if(ev)ev.observation_id=obsId;}));
    for(const ev of allEvidence.filter(e=>e.attempt_id===aid))ev.observation_id=obsId;
    rec.product_observations.filter(o=>(o.attempt_ids||[]).includes(aid)).forEach(o=>o.observation_id=obsId);
    const obsEvidence=allEvidence.filter(e=>e.attempt_id===aid);
    appended.push({observation_id:obsId,recorded_at:now,related_cases:[id],category:'round-owned Skill import UI behavior',scope:`${aid}; 仅 round-owned 导入样本与TPT技能管理UI`,observation:d.obs,candidate_status:'pending bilateral review; no formal product conclusion',evidence:obsEvidence});
  }
  write(`执行记录/${id}.json`,rec);
}
fs.appendFileSync(obsPath,appended.map(x=>JSON.stringify(x)).join('\n')+'\n','utf8');
fs.appendFileSync(evIndex,allEvidence.map(x=>JSON.stringify(x)).join('\n')+'\n','utf8');
console.log(JSON.stringify({registered:allEvidence.length,observations:appended.map(x=>x.observation_id),cases:Object.keys(definitions)}));
