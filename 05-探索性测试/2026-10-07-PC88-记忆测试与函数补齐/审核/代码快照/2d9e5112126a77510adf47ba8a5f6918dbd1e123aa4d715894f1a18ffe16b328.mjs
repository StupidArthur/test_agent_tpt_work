// 本轮执行结果汇编（PC88 记忆任务）——把已执行的观察写成逐项结果文件
import fs from 'node:fs';
import path from 'node:path';
const OUT = path.resolve(process.argv[2] || '.', '结果');
fs.mkdirSync(OUT, { recursive: true });
const run = 'PC88-20261007-memory01';
const R = {
  'MEM-01': { status: '通过', assertions: { 层次与目录: 'SOUL/AGENTS/USER/MEMORY 存在且为空(0B, sha e3b0c442…); index.json 87B(entries=0); audit.jsonl 1056B(4条 reflection); .reflection-state.json 79B; reflections/ 空目录', 权限与设置: '启用记忆=on, 启用沉淀=on; 高级参数 14 项已记录', 备份: '7 个文件已备份到任务 恢复备份/' }, refs: ['CALL-d0b83a13-6778-4ddc-b938-c50304a40236'], notes: '空文件记为空，不是不存在；reflections 空目录单独列出' },
  'MEM-02': { status: '通过', assertions: { 添加: '记忆库选类型=事实, 内容唯一标记 → 面板“已写入 #1”; MEMORY.md 写入 - [F] <标记>', 编辑: 'MEMORY.md 编辑弹窗改前=旧值 → 保存后旧值消失/新值出现; index.json 条目与关键词随编辑更新(id 变更)', 审计: '编辑产生 actor=host type=memory_write', 默认类型: '新增类型下拉默认首个选项=偏好(未显式选择时)' }, refs: ['CALL-af7181ff-426b-4f7e-9a80-0add68c35492', 'CALL-0b7c55a3-7ed2-4cc5-821d-d8fe61056f8d'], notes: '面板“添加”未产生 audit; 文件“编辑”产生 audit' },
  'MEM-03': { status: '通过', assertions: { 工具调用: '模型真实调用 memory_log 与 memory_note(memory_recall 另见 MEM-08)', 落盘: 'MEMORY.md 追加 - [F] MEM88-20261007-TOOL-乙；新建 2026-10-07.md 工作日志；新建 .entry-meta.json importance=1', 备份: '写前 MEMORY.md.bak=旧内容(87B)', 审计: 'actor=tool type=memory_write ×2(日志追加/长期记忆追加)' }, refs: ['CALL-3074440d-112a-4423-aad1-e3deb5e3dc10', 'CALL-5426a31b-7ef9-447f-8bc1-364cccca576e'], notes: 'tool 写入未更新 index.json（与面板添加不同）' },
  'MEM-04': { status: '部分通过', assertions: { 外部改写感知: '外部写入 USER.md 后，面板显示 USER.md 1 条 55 字符(由 0 更新)', 写前备份: 'host/tool 写入 MEMORY.md 时生成 MEMORY.md.bak=被覆盖前字节; 外部改写 USER.md 未生成备份', 审计: '外部改写未新增 audit' }, refs: ['fixtures.writeFile', 'CALL-78d60a38-ae48-4790-bef3-a1117f7d94f4'], notes: 'AGENTS 单文件备份不能推导全部文件有备份' },
  'MEM-05': { status: '通过', assertions: { 面板: '记忆条目 2 / 索引条目 1 / 事实 2', 索引: 'index.json entries=1(仅面板添加项) — 与面板“记忆条目”口径不同', 元数据: '.entry-meta.json 仅 tool 条目 importance=1', 审计: 'audit.jsonl 7 条，含 host/tool memory_write', 字符口径: 'MEMORY.md 文件 152B 而面板显示 112 字符，条目数与字符数非同一指标' }, refs: ['CALL-fcbfca42-3294-4594-887f-d8a984b104df'], notes: '空索引不自动判召回失效；来源不明字段不猜含义' },
  'MEM-06': { status: '未验证', assertions: { 分层注入: '本机无“宿主注入快照”读取函数；未构造 SOUL/AGENTS/USER/MEMORY 单层标记对照', 限制: '模型复述不作为独立注入证据；启用记忆开关不可经UI关闭(见 MEM-16)，无法做开关对照' }, refs: [], notes: '需宿主上下文快照或分层标记会话，本轮缺条件' },
  'MEM-07': { status: '未验证', assertions: { 条件段与截断: '未取得实际注入段落/预算截断读数；注入字符预算=2400 已读但未构造超限注入并读取结果' }, refs: [], notes: '未读取实现，不能断定按字节截断' },
  'MEM-08': { status: '通过', assertions: { 真实召回: 'memory_recall(query=标记) 命中 2 条', 来源: '日志 2026-10-07 · 2026-10-07.md:2；长期记忆 · MEMORY.md:4；相关度 60%', 工具轨迹: 'readToolTrace 显示 memory_log/memory_note/memory_recall 实际调用' }, refs: ['CALL-f5a186ac-fbb7-48bc-acab-f0f7eefd0c88', 'CALL-5426a31b-7ef9-447f-8bc1-364cccca576e'], notes: 'sendMessage 完成等待一次超时(120s)但已取回助手正文，登记为等待差异' },
  'MEM-09': { status: '部分通过', assertions: { 自动路径: '观察到自动把上一会话写入工作日志 2026-10-07.md(自动内容，非工具写入)', 开关: '启用沉淀默认 on；经UI关闭失败(保存失败并回弹)，无法做开关对照', 长期条目: '自动路径未生成长期条目，仅写工作日志' }, refs: ['files5.out.json', 'CALL-8c4e4efe-5396-4fbb-b5ce-d0a07782c0cf'], notes: '先核对机制是否仅写工作日志' },
  'MEM-10': { status: '部分通过', assertions: { 冷却: '沉淀冷却(分)=30；冷却窗内第二次会话未自动沉淀(未新增工作日志段落)', 限制: '未持有窗内/窗外两次对照的完整时间戳证据，判定为观察' }, refs: ['files6.out.json'], notes: '不擅自改系统时钟' },
  'MEM-11': { status: '未验证', assertions: { 价值过滤: '过滤纯过程性要点=on 已读；未构造普通噪音/重复/有效偏好分组经自动路径触发对照' }, refs: [], notes: '模型工具主动写入不能验证过滤' },
  'MEM-12': { status: '部分通过', assertions: { 状态初值: '.reflection-state.json lastHash=5ba93c9d…, lastAt=1791283700705', 反思记录: 'audit 4 条 reflection_nothing(3 rules + 1 llm/flash)', 新触发: '本轮未达触发条件，未产生新反思产物' }, refs: ['CALL-d0b83a13-6778-4ddc-b938-c50304a40236'], notes: '未满足条件不判失败；lastAt 推进不能证明有产出' },
  'MEM-13': { status: '未验证', assertions: { 晋升: '重复升格天数=2(需跨天同 id)，禁止改系统时钟制造跨天，未执行晋升触发', 重要规则: 'tool 写入 importance=1；反思驱动升格未发生' }, refs: [], notes: '工具直接写 importance 与反思驱动升格是两个实例' },
  'MEM-14': { status: '未验证', assertions: { 蒸馏: '条目数上限=200、字符数上限=20000，本轮未达阈值，未触发实际蒸馏/归档' }, refs: [], notes: '不用旁路文件写模拟产物' },
  'MEM-15': { status: '未验证', assertions: { 预算: '注入字符预算=2400、用户级日预算=4000 已读；未构造刚好低于/达到/超过样本并读超限处理' }, refs: [], notes: '配置值变化不等于预算生效' },
  'MEM-16': { status: '差异', assertions: { 页面: '概览/记忆库/日志 三页可读；日志页“2026-10-07 (今天) 该日志不存在”在生成前', 设置项: '启用记忆/启用沉淀 可读(true)', 修改失败: 'setRowToggle 切换 启用记忆/启用沉淀 均返回同页反馈“保存失败：Plugin entry "tpt-memory" has no volatile fields”，值保持 true（回弹）' }, refs: ['CALL-511ca84f-f0ec-4cd3-9dda-f4c48b57346d', 'CALL-bb689f63-ab7b-4236-ba1a-acabfc99ebbb'], notes: '候选保存差异；未达确认，待审' },
  'MEM-17': { status: '部分通过', assertions: { '删除': '记忆库行“删除”弹出 confirm：删除这条事实记忆？<内容>；接受后“已删除”，目标行消失，仅剩对照行', '取消': '默认取消(未接受)时数据不变', '导入导出清空': '本轮未发现导入/导出/清空入口' }, refs: ['CALL-bd92c490-1911-4548-9d3f-441f8a6fff16'], notes: '仅操作用户自建测试条目，未删用户资产' },
  'MEM-18': { status: '通过', assertions: { 恢复: 'SOUL/AGENTS/USER/MEMORY/index/.reflection-state 恢复后哈希与初值一致', 移除: '删除本轮新建 2026-10-07.md/.entry-meta.json/MEMORY.md.bak', 残留: 'audit.jsonl 由 1056B 增至 1844B（审计增量按设计保留）；会话 session-88603e1a/74966a8a 保留待审' }, refs: ['CALL-5cdab22e-579f-467a-9bb1-5e5762092130'], notes: '不抹掉真实审计历史；恢复独立回读' },
};
for (const [id, v] of Object.entries(R)) fs.writeFileSync(path.join(OUT, id + '.json'), JSON.stringify({ id, run, machine_id: 'PC88', ...v }, null, 2) + '\n', 'utf8');
console.log('written', Object.keys(R).length, 'results to', OUT);
