"""Create assigned review tasks; no product interaction or network requests."""
from pathlib import Path
import json, hashlib

root = Path(__file__).resolve().parents[3]
source = root / '05-探索性测试/2026-10-06-函数体系全面回归/用例/cases.json'
cases = json.loads(source.read_text(encoding='utf-8'))
catalog = json.loads((root/'04-测试工具/ui-operations/business/catalog.json').read_text(encoding='utf-8'))
pairs = {
 'PCG': [
 ('草稿读取', 'smoke.conversation.readComposerState', 'conversation.readComposer'),
 ('草稿输入与发送', 'smoke.conversation.typeDraft + smoke.conversation.send', 'conversation.sendMessage'),
 ('完成状态', 'smoke.conversation.isCompleted', 'conversation.readCompletion'),
 ('等待与读取回答', 'smoke.conversation.waitForIdle + smoke.conversation.readAssistantMessages', 'conversation.readTaskState'),
 ('关闭弹窗', 'smoke.navigation.closeDialogs', 'conversation.closeDialogs'),
 ('已有项目选择', 'smoke.conversation.selectProject', 'conversation.newTask + conversation.readProjectOptions'),
 ('设置开关', 'settings.readSwitch + settings.setSwitch', 'settings.readRowToggle + settings.setRowToggle'),
 ('索引设置开关', 'settings.readSwitchIndex + settings.setSwitchIndex', 'settings.readSwitch + settings.setSwitch'),
 ('文件读取', 'fixtures.readFile', 'memory.readFiles'),
 ('插件卡片', 'conversation.readPluginCard', 'settings.listPluginCards'),
 ],
 'PC88': [
 ('技能导航', 'smoke.navigation.openSkills', 'smoke.skills.openSkills'),
 ('技能frame', 'smoke.navigation.skillsFrame', 'smoke.skills.skillsFrame'),
 ('技能搜索', 'smoke.skills.search', 'skills.searchSkills + skills.searchSkill'),
 ('技能列表', 'smoke.skills.listCards', 'skills.readListIdentity + skills.readSkillNames'),
 ('技能开关读取', 'smoke.skills.readSwitch', 'skills.readSkillCard'),
 ('技能开关设置', 'smoke.skills.setSwitch', 'skills.setSkillEnabled'),
 ('技能详情', 'smoke.skills.openAndReadDetail', 'skills.readSkillDetail + skills.openCardDetail'),
 ('技能导入', 'smoke.skills.importSkill', 'skills.importSingleFile'),
 ('技能使用入口', 'skills.quickUse + skills.useSkillDirect', 'skills.useSkill + skills.useSkillRequest'),
 ('专家使用入口', 'experts.useExpert', 'experts.useExpertRequest'),
 ('专家提交反馈', 'experts.submitAndReadFeedback', 'experts.submitImport + experts.readValidationFeedback'),
 ('附件卡片字段', 'attachments.readCardText + attachments.readCardTitle', 'attachments.readDraftState'),
 ]}

def write(p, data):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(data if isinstance(data,str) else json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')

check_code = '''from pathlib import Path
import json,sys
task=Path(__file__).resolve().parents[1]
queue=json.loads((task/'用例/队列.json').read_text(encoding='utf-8'))
issues=[]; remaining=[]; complete=0
for c in queue:
 p=task/'结果'/f"{c['id']}.json"
 if not p.exists(): remaining.append(c['id']);continue
 try: r=json.loads(p.read_text(encoding='utf-8'))
 except Exception as e: issues.append({'case':c['id'],'error':str(e)});continue
 for key in ['case_id','status','attempted','assertions','call_refs','restore','elapsed_seconds']:
  if key not in r: issues.append({'case':c['id'],'missing':key})
 if r.get('case_id')!=c['id']:issues.append({'case':c['id'],'error':'identity mismatch'})
 if not r.get('attempted'):issues.append({'case':c['id'],'error':'not actually attempted'})
 if not r.get('call_refs'):issues.append({'case':c['id'],'error':'no current call refs'})
 if not r.get('assertions'):issues.append({'case':c['id'],'error':'no assertions'})
 expected_ids={a['id'] for a in c.get('assertions',[]) if isinstance(a,dict)}
 actual_ids={a.get('id') for a in r.get('assertions',[])}
 if expected_ids and expected_ids-actual_ids:issues.append({'case':c['id'],'error':'missing original assertion IDs','missing':sorted(expected_ids-actual_ids)})
 for a in r.get('assertions',[]):
  if not all(k in a for k in ['id','expected','actual','event_refs','reason']):issues.append({'case':c['id'],'error':'assertion fields missing'})
  if a.get('actual') is None and not a.get('reason'):issues.append({'case':c['id'],'error':'null without reason'})
 complete+=1
out={'total':len(queue),'recorded':complete,'remaining':remaining,'issues':issues,'note':'结构检查不等于业务验收；原始调用和哈希另行审核'}
print(json.dumps(out,ensure_ascii=False,indent=2))
sys.exit(1 if issues else 0)
'''

for machine in ['PCG','PC88']:
    task = root / f'05-探索性测试/2026-10-07-{machine}-UI工具去重夜间验证'
    primary = {'G1','G6','G8','G12','G13'} if machine=='PCG' else {'G2','G3','G4','G5','G7','G9','G10','G11','G14'}
    ordered = sorted(cases,key=lambda c:(c['group'] not in primary,int(c['group'][1:]),c['id']))
    review=[]
    for i,(title,a,b) in enumerate(pairs[machine],1):
        names=set((a+' + '+b).split(' + '))
        for n in names:
            assert any(f['name']==n for f in catalog['functions']),n
        review.append({'id':f'DEDUP-{i:02d}','title':title,'A':a,'B':b,
          'steps':['按工具契约核对对象、参数、额外导航/新建/等待/恢复与返回字段；先写比较假设',
                   '保存初值并建立唯一本轮对象；顺序执行A、独立读取；恢复到相同可比较初值后执行B并独立读取',
                   '若不同则记录差异、判断是否业务含义不同，不强求合并；若可合并，在本任务登记最小候选函数',
                   '验证候选的正常动作、一个有意义的边界、恢复及受影响原case；旧调用不得消失'],
          'assertions':['操作对象身份一致或明确列出不同身份','可比业务字段相同，动态ID/时间不直接全JSON相等；保留原值及显式规范化规则',
                        '不存在未声明的额外动作或恢复副作用','候选保持原case所需取值；原产品失败可复现，不要求全部PASS'],
          'restore':'按各函数契约恢复初值，绑定本轮session/内部名；会话创建类比较不同的新session而非假设可回滚旧会话'})
    modules = {'conversation','settings','memory','fixtures','application'} if machine=='PCG' else {'skills','experts','attachments'}
    assigned=[f for f in catalog['functions'] if f['name'].split('.')[0] in modules or (f['name'].startswith('smoke.') and (('conversation.' in f['name'] or 'navigation.' in f['name']) if machine=='PCG' else 'skills.' in f['name']))]
    write(task/'用例/基线.json',ordered)
    write(task/'用例/去重比较.json',review)
    write(task/'用例/队列.json',ordered+review)
    write(task/'用例/负责函数.json',{'scope':'逐个给出处置与证据，实际调用可共享基线场景；不为函数数重复操作','functions':assigned})
    write(task/'用例/来源.json',{'source':source.relative_to(root).as_posix(),'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'count':140,'rule':'原用例不改；本轮引用仅作为判据，不复用旧actual/session/参数值'})
    write(task/'04-测试工具/check.py',check_code)
    write(task/'新增函数清单.json',[])
    write(task/'code/business/catalog.json',{'functions':[]})
    write(task/'任务状态.json',{'machine':machine,'status':'待执行','baseline':140,'comparisons':len(review),'started_at':None,'deadline_at':None,'remaining':[c['id'] for c in ordered+review]})
    write(task/'AGENTS.md',f'''# {machine} 夜间执行约束

本任务为用户明确授权的连续夜间测试。先读README及执行说明；所有批次属于同一次完整分配，不是完成一批等待续派。

1. 开始时记录实际时间，硬窗口为6小时，最后20分钟用于恢复、校验、报告和提交。窗口到期保存精确剩余项，标“时间窗口到期，中断未完成”，不能称全部完成。
2. 没到窗口且队列未耗尽，不要结束回合、不要问是否继续。checkpoint只能在继续执行的过程中汇报；“合适检查点”“上下文紧张”“本会话预算”不是自行停止理由。上下文压缩后按剩余队列继续，不重开已完成项。
3. 每批10～20条，共享样本和证据。优先去重比较与主查模块，再完整交叉回归。所有剩余队列有明确编号；不得只挑好跑的部分。平台真的终止时记录限制来源、当前步骤、剩余编号和恢复状态。
4. 测试目标是查明真实差异及函数可替代性，不是提高通过率。禁止改原case、篡改actual、修产品、修改校验器消掉失败。产品失败与工具差异分开记录。
5. 全部产品准备、操作、取值、外部修改和恢复经主库或任务登记函数。函数不足先保存查找过程，允许任务内补充并验证；所有代码、调用、参数、返回、快照SHA留存。禁止自行修改或合并主库。
6. 一个应用只允许一个UI操作流；运行中的tool session/cell必须等完成。错误只允许一次有根据的定位修正；恢复后继续其他项，不无限排障。
7. 只能操作本机；标准/low、已有项目。不得添加项目、触发原生确认删除、删除记忆或历史资产。允许本轮样本导入、可恢复设置调整及任务目录候选代码；无需等睡眠中的用户逐项批准。
8. 崩溃/CDP断开先保存并按已有接入文档有限恢复；恢复成功继续。不可恢复才任务级停止。没有真实网关key或实例时记录环境限制，不编造执行。
9. 通过默认不截图。每条结果有本轮动作引用及独立实际值；call returned/check通过不等于业务通过。清理只限本轮资产且符合主库恢复契约。
10. 全队列完成或6小时窗口终止后恢复、交付分支并停止。不要为了跑满时长重复140条或空等。
''')
    write(task/'README.md',f'''# {machine}：UI工具去重夜间验证

## 这次做什么

主查 {'对话、设置、记忆、夹具及应用接入' if machine=='PCG' else '技能、专家、附件及相关smoke兼容入口'}。先检验相近函数是否真正可替代，在任务内制作最小去重候选，再用原case检验动作和断言能力。原产品差异不要求修复。另一个PC是独立实例，不共享运行上下文。

本轮固定队列：**140条完整回归 + {len(review)}项去重比较**；负责函数清单另逐项登记处置，调用证据允许共享。建议连续窗口6小时，不能保证平台在无人值守时自动续轮；平台中断按AGENTS留检查点。

## 渐进阅读

1. 本任务 [AGENTS.md](AGENTS.md) → [执行说明](执行说明.md)。
2. [探索性测试技能](../../03-测试技能/exploratory-testing/SKILL.md) → [工具入口](../../04-测试工具/ui-operations/README.md)，首次接入按快速开始。
3. 只读当前批次的 [基线case](用例/基线.json) 或 [去重比较](用例/去重比较.json)，用 --plan/--find/--describe 查本条操作。不要先读全部历史和180个源码。
4. 异常时读补测规则；开始比较某组函数时才读这组实现。相关历史问题摘要见 [交付审核](../2026-10-07-PCG与PC88交付回收/审核报告.md)，不是本轮预设结论。

## 执行队列

先完成接入、唯一夹具与恢复初值，再做去重比较的只读/低风险组，与主查模块基线共享场景。每批10～20项；主查模块完成后跑其余基线，完整队列见 [队列](用例/队列.json)。依赖case可先做准备；前置失败仍实际尝试并记录下游未观测。

交付全部写本目录：结果/、运行日志/、审核/、code/、函数处置.json、新增函数清单.json、报告.md。禁止覆盖旧探索任务。用 `python -X utf8 04-测试工具/check.py` 在本任务目录检查记录，结构通过不替代业务验收。

分支：`review/{machine.lower()}-ui-dedup-night`，提交和推送本任务文件，**不推main，不动另一台PC任务与主工具库**。报告直接回答可合并哪些、应保留哪些、发现入口哪里有问题、哪些证据仍缺；未完成如实列出。
''')
    write(task/'执行说明.md','''# 执行与去重验证

## 开始（最多20分钟用于基础准备）

记录仓库commit、机器、产品包SHA、CDP端口、账号名、已有项目、本轮run后缀、实际起始和截止时间。复用闲置实例前检查占用；不得抢锁。本机初始状态必须自己读取，不复制另一PC数据。通过 fixtures.prepareFixtures/prepareProjectFiles 建立独立样本；保存设置及要改文件的备份。链接测试启动本轮服务，收尾用返回state停止。

## 去重怎么判断

去重比较表中的A/B是待验证候选，不保证等价。先分清：纯重复、可参数化、业务不同、返回不足、定位失效、仅发现入口不足。比如“创建新任务再使用技能”不能替代“当前任务快捷引用”；设置插件不能替代左侧市场插件；记忆分层读与任意文件读对象不同。发送组合与sendMessage的终态等待不同，要分别比动作和完成观察。

每组记录当前A/B契约、传参、导航/新建/自动恢复等副作用、原始返回及可比字段。可以在完成一个正常场景后立即登记，别把所有资料留到最后。边界样本从本组原case选择：无匹配名、唯一名、停用技能、坏包、保存失败等；不得删除历史用户对象或人为破坏环境。

只有确有重复且有实测证据才编写任务候选。候选可组合调用现有函数，也可最小化重写，禁止把底层源码复制出几十份。旧接口保持参数和返回兼容；不能靠丢字段缩小契约。主库不修改。新函数登记任务catalog，通过call.mjs --task执行，留代码快照与哈希。候选失败保留原attempt；不能把产品原有失败当去重失败，也不能让候选绕过原失败。

## 原140条基线

以用例/基线.json的前置、步骤、对象绑定和断言为准。map里的历史路径、session和call_id不可重放；--plan只是选函数提示。候选验证复用相应case：保留original与candidate两个attempt，不要求重复所有140条。与候选无关case只执行一次。

特别注意：ZIP按本轮内部名集合取增量，不用上传名/总数量冒充候选；坏包拒绝与反馈精度分开；模型回答不证明资源加载；会话搜索数量不证明session身份；没有读到控件时写null而不是false。用例歧义保留原判断并列待审核，不自行改预期。

## 最小结果格式

每条结果/<编号>.json至少：case_id、status（通过/失败/不确定/阻塞）、attempted、assertions、call_refs、restore、elapsed_seconds。assertions逐条包含 id、expected、actual、event_refs、reason；null必须解释失败依赖。原140条断言ID必须全部保留，不得合并丢失；比较项用自身编号加A1～A4标记动作/对象/返回/恢复四类观测。调用引用必须是本轮真实ID，不用占位符或省略号。

函数处置.json逐个列负责函数：现实现、候选替代、结论（保留/重复/参数化/发现改进/失效/未验证）、对应case与调用、返回差异、建议兼容方式。存在同名不证明等价。需要新增时，新增函数清单记录查找词、候选、不适用原因、补充能力及验证。没有新增保留[]。

## 持续窗口与排障

最多6小时。每批更新任务状态与进度，统计新覆盖、等待、排障、剩余编号，随后立即继续。进入最后20分钟停止启动新业务，恢复全部变更、核验文件SHA和设置值、校验、交付。可恢复错误不能结束整轮；只做一次有依据的定位修正，转下一项。平台真正中断留下下一动作，可续跑，不声称完成。

固定队列已全做完后，只追加有明确证据缺口的候选边界验证，记新编号和原因；没有缺口就提前交付。不要重复巡检或空耗6小时。尚未实现、外部依赖缺失均照实记录，不等待用户睡醒。

## 交付

报告分开列：原case统计、工具等价结论、候选实现验证、发现入口问题、未验证及恢复。证据有路径/SHA/归属，通过不截图；异常截图仅在有解释价值时留。核验所有产品操作都有主库或任务函数调用。提交独立分支，保留本轮样本待审；新候选只供主AI验收，不自动落主库或产品知识。
''')
    print(machine, len(ordered)+len(review), len(assigned))
