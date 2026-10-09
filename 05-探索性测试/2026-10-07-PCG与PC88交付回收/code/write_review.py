from pathlib import Path
import json,hashlib,re,collections
T=Path(__file__).resolve().parents[1];R=T.parents[1];E=T.parent
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
audit=read(T/'审核/全量结果与工具审计.json')
pcg=E/'2026-10-06-业务函数复用回归';pc88=E/'2026-10-07-PC88-记忆工具库复跑'
cases={x['id']:x for x in read(pcg/'用例/cases.json')}
main={x['name']:x for x in read(R/'tools/ui-operations/business/catalog.json')['functions']}

# Recover separate copies; original imported snapshots are not changed.
fix=T/'审核/换行复核';fix.mkdir(exist_ok=True)
bridge=[]
for x in audit['PCG']['hash_checks']:
 if x['status']=='mismatch' and x['line_ending_equivalent']=='CRLF':
  raw=(pcg/x['path']).read_bytes().replace(b'\r\n',b'\n').replace(b'\n',b'\r\n')
  assert hashlib.sha256(raw).hexdigest()==x['expected']
  p=fix/(x['expected']+'.txt')
  if not p.exists():p.write_bytes(raw)
  bridge.append({'source':x['path'],'imported_sha256':x['actual'],'original_registered_sha256':x['expected'],'reconstructed':p.relative_to(T).as_posix()})
raw=(pcg/'用例/cases.json').read_bytes().replace(b'\r\n',b'\n').replace(b'\n',b'\r\n')
expected=read(pcg/'环境记录.json')['queue_sha256'];assert hashlib.sha256(raw).hexdigest()==expected
p=fix/(expected+'.json');p.write_bytes(raw)
bridge.append({'source':'用例/cases.json','imported_sha256':sha(pcg/'用例/cases.json'),'original_registered_sha256':expected,'reconstructed':p.relative_to(T).as_posix()})
(fix/'映射.json').write_text(json.dumps(bridge,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')

focus={
'G3-01':('产品/设计差异候选','实际默认启用；按原停用预期失败。审核当前默认状态设计，不改原判据求通过。'),
'G3-03':('产品/设计差异候选','原日志区分手动新建与快捷使用，入口自身复用旧session。记录行为差异，确认是否承诺新建。'),
'G5-08':('产品反馈差异候选','通用拒绝提示+数量及源文件不变支持拒绝；具体JSON错误提示断言不满足，不能说坏包被导入。'),
'G6-06':('产品差异候选/需针对复测','恢复默认权限后新任务仍仅可查看，有两次强制新建记录；对照本机旧复测未复现，按相同初值与新session补测。'),
'G6-07':('展示/用例预期待审核','PTC 模式与PTC模式的空格差异确实失败，但不证明场景切换功能失败；确认展示契约。'),
'G7-02':('产品/设计差异候选','30附件实际可添加；未见30/30提示，不能说30附件上传失败。'),
'G7-03':('产品差异候选','20→35且无超额反馈，支持未执行原30上限/整批拒绝预期。'),
'G7-11':('入口差异候选','明确可读附件区无批量清空，数量仍3；逐个移除恢复不代替清空功能通过。'),
'G9-07':('产品差异候选/证据范围收窄','首导入已接受；第二次同名跳过造成数量不变，不能拿第二次证明字段拒绝。'),
'G9-08':('产品差异候选','无拒绝反馈且对象增量，支持缺description包被接受。'),
'G9-12':('产品差异候选','合法PNG的卡片实际用默认SVG；不能将任意已加载img算包内资源成功。'),
'G10-08':('反馈差异候选/有效内容未完全证明','缺错误反馈是原失败；旧固定回复成立但缺成功资源绑定，不能单凭回复证明宿主保留最后有效技能。'),
'G11-10':('权限前置限制','模型明确拒绝工作区外写盘，描述字段未改；未证明授权后的专家编辑失败。需编辑会话权限前置与恢复。'),
'G11-12':('反馈差异候选','坏配置未自动改写与恢复可读有证据；错误反馈缺失是独立差异，不等于坏文件被修复或合法。'),
'G12-04':('保存差异候选/反馈取证缺口','checked未变支持保存未生效；错误读取false与PC88明确保存错误矛盾，需核对toast出现时间与范围。'),
'G12-05':('保存差异候选/反馈取证缺口','同上，沉淀开关效果不能由未保存的开关值验证。'),
'G13-01':('产品/设计差异候选','@菜单只出现对话，文件/资料入口未见。'),
'G13-04':('操作前置未完成/需补测','未点击选择文件/文件夹按钮前无input不能证明导入不可用；其他专家导入用例已成功，应按真实选择器触发链复测。'),
'G14-04':('产品差异候选','安装目录有DS_Store/__MACOSX，支持垃圾落盘，保留路径清单。'),
'G14-06':('样本污染/未验证隔离','valid/invalid已由未记录探测安装，再提交同名全跳过；这次不能验混合首次导入隔离。新唯一身份复测，不改异常字段。'),
'G10-03':('工具读取限制','旧精确文本树节点读取命中0；当前主库已有树控件修订，需本轮已绑定对象展开/收起实际值。'),
'G8-02':('入口/对象定位待复测','本轮完成会话行未定位，不能直接判提醒功能失败，也不能用旧会话冒充。'),
'G8-03':('入口/对象定位待复测','复用G8-02的本轮会话前置，分别核对未读计数。'),
'G12-09':('原生触发边界','CDP合成Ctrl+K未产生面板，未证明原生快捷键失效。'),
'G12-17':('恢复证据不全','主题活动态未取得，已读13项等初值，仅接受这些字段的恢复，不接受全项恢复。'),
'G13-06':('工具入口定位限制','更多菜单未读到帮助项，不能判点击帮助无响应；现有入口与外部窗口需分别观测。'),
'G13-12':('选用表面不匹配','旧conversation.readPluginCard查左侧插件页，相关展开控件实际在设置/内置插件；使用settings.listPluginCards/setPluginExpanded。'),
'G13-13':('身份读取限制','搜索结果未提供session id；现在可读真实搜索计数，但需唯一标题及目标session关联，不能将计数当身份。'),
'G14-01':('通过需补证','弹窗ZIP+1个文件仅证明选中上传文件，原断言是扫描候选；列表总数不等于身份集合。'),
'G14-02':('通过需补证','A1用总卡片39→40代替对应技术名增量；nested未命中有观察，需前后内部身份及安装路径核对。'),
'G14-03':('通过需补证','用搜索结果卡片标题代替候选技术name，未证明deep/two全局不存在；范围和身份都需修正。'),
'G14-05':('通过需补证','事后跳过提示代替候选默认选项；哈希核对发生在11:46，最终跳过反馈11:50，未绑定最后这次提交。'),
'G11-07':('通过需补证','read工具读到了附带SKILL正文，固定回复正确；读取缺明确session/调用绑定，不能独立签收指定专家资源加载范围。'),
}
rows=[]
for row in audit['PCG']['results']:
 cid=row['case'];category,note=focus.get(cid,('原判定暂保留/无新增复测理由','全量记录及断言对账通过（换行差异另列）；没有据此扩张成产品全部正常。'))
 rows.append({'machine':'PCG','case':cid,'original':row['reported'],'review':category,'note':note,'source':(pcg/'结果'/f'{cid}.json').relative_to(R).as_posix(),'sha256':sha(pcg/'结果'/f'{cid}.json'),'required_followup':cid in focus and ('补证' in category or '补测' in category or '限制' in category or cid in ['G6-06','G12-04','G12-05','G14-06'])})
memory={
'MEM-01':('基础记录可接受','初值、文件/空目录、备份有证据；本轮任务身份与主库版本明确。'),
'MEM-02':('通过需收窄/审计差异待审','添加编辑/索引与编辑审计成立；面板添加无audit已在自身S5标差异，不能在管理汇总中仅称无差异通过。设计每次变更留痕需核对。'),
'MEM-03':('调用与写入观察可接受','真实memory_note与文件/importance/audit可关联，actor=tool不当自动路径。'),
'MEM-04':('感知观察可接受/条件备份未验证','外部USER/AGENTS内容被读取；无备份承诺时记录观察，不能扩张为自动备份验证。'),
'MEM-05':('口径对账可接受','条目/字符/字节分别比较；工具元数据来源保留。'),
'MEM-06':('未验证保留/观测来源待补','模型复述不证明完整分层注入；UI工具没有宿主上下文快照，是否存在可用session来源待核对，不认定产品未注入。'),
'MEM-07':('前置阻塞保留','预算写入未成功、实际注入不可读，顺序/截断未观测。'),
'MEM-08':('召回观察可接受','索引/未索引/不存在对照与来源行号可复核；不扩大成全部注入成功。'),
'MEM-09':('通过需收窄为触发观察','本轮session与AUTO标记支持开启状态触发日志；MEM-16保存失败，开/关对照未完成，完整case尚未通过。'),
'MEM-10':('时间窗观察待引用补齐','已有首次成功/窗内/窗外记录，比前轮仅读不变更强；源码引用仍占位，补全精确调用后验同等触发条件，不能声明精确冷却边界。'),
'MEM-11':('未验证保留/缺样本','噪音/重复/敏感没有独立有效窗口；已有偏好样本不代替完整过滤矩阵。'),
'MEM-12':('未验证保留/触发条件待确认','未满足或未找到触发条件不判反思坏；仅旧lastAt无法证明本轮触发。'),
'MEM-13':('未验证保留/依赖反思','人工跨日夹具不是实际历史产物；反思与晋升需关联。'),
'MEM-14':('未验证保留/准备未完成','未达到已读阈值，先排明确隔离阈值样本与有效触发；不能据此判蒸馏功能不存在。'),
'MEM-15':('行为差异待范围确认','面板4510字符超过日预算4000未限属真实观察；尚未核准计数/约束范围，注入边界未读，不签为预算失效缺陷。'),
'MEM-16':('保存差异候选','明确no volatile fields与重开原值支持保存失败；实际开关效果仍未验证。'),
'MEM-17':('条件边界保留','原生确认未处理，其他入口未发现；不判产品删除失败，不用文件清理函数替代产品删除测试。'),
'MEM-18':('恢复记录可复核/计数需修正','文件恢复与真实审计残留有记录，task.deleteNewFile5调用真实存在；会话写6个但列出至少9个ID，需按实际调用核对，删除函数不能原样入库。'),
}
index=[json.loads(s) for s in (pc88/'证据索引.jsonl').read_text(encoding='utf-8').splitlines() if s.strip()]
for row in audit['PC88']['results']:
 cid=row['case'];category,note=memory[cid]
 refs=[x['call_id'] for x in index if re.search(re.escape(cid)+r'(?!\d)',x.get('case_subcheck',''))]
 rows.append({'machine':'PC88','case':cid,'original':row['reported'],'review':category,'note':note,'source':(pc88/'结果'/f'{cid}.json').relative_to(R).as_posix(),'sha256':sha(pc88/'结果'/f'{cid}.json'),'indexed_calls':list(dict.fromkeys(refs)),'reference_issue_count':len(row['issues']),'required_followup':cid not in ['MEM-01','MEM-03','MEM-04','MEM-05','MEM-08']})
(T/'审核/逐项处置.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
md=['# 逐项审核处置','', '原结果保留。本表是管理者审核意见，实际UI复测和新证据另记；没有重新执行远程全部case。所有来源SHA见逐项处置.json。','','|机器|case|原状态|审核处置|理由/下一步|','|---|---|---|---|---|']
for row in rows:md.append('|'+ '|'.join(str(row[k]).replace('|','/') for k in ['machine','case','original','review','note'])+'|')
(T/'逐项处置.md').write_text('\n'.join(md)+'\n',encoding='utf-8',newline='\n')

def bodies(p):
 s=p.read_text(encoding='utf-8-sig');matches=list(re.finditer(r'export\s+async\s+function\s+(\w+)\s*\(',s));return {m.group(1):s[m.start():matches[i+1].start() if i+1<len(matches) else len(s)] for i,m in enumerate(matches)}
mapping=[]
for f in audit['PCG']['function_mappings']:
 entry=main[f['main_function']];oldcat=read(pcg/'code/business/catalog.json');es=oldcat if isinstance(oldcat,list) else oldcat['functions'];old=next(x for x in es if x['name']==f['task_function']);ob=bodies(pcg/old['file']).get(old['export'],'');nb=bodies(R/'tools/ui-operations'/entry['file']).get(entry['export'],'');norm=lambda s:re.sub(r'\s+','',s)
 f.update(comparison='same_text_ignoring_whitespace' if norm(ob)==norm(nb) and ob else 'same_capability_name_implementation_differs',decision='不重复入库；差异实现按缺陷和当前主库契约逐项取舍')
 mapping.append(f)
(T/'审核/函数去向.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'reviewed_results':len(rows),'pcg_same_text_functions':sum(x['comparison']=='same_text_ignoring_whitespace' for x in mapping),'pcg_same_name':len(mapping),'pc88_indexed_calls_per_case':{r['case']:len(r.get('indexed_calls',[])) for r in rows if r['machine']=='PC88'},'newline_reconstruction_mapping':len(bridge)},ensure_ascii=False))
