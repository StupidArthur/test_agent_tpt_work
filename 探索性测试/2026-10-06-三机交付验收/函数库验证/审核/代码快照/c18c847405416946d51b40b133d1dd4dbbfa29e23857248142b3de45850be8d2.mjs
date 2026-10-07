import fs from 'node:fs';
import { parseBoolean, readComposerRequest } from '../../automation/identity.mjs';
// 业务函数层：技能导入与查看。
import { connectSkills, SKILL_SEL, cardByTitle } from '../../automation/skills.mjs';
import { connect } from '../../automation/session.mjs';
import { SEL } from '../../automation/conversation.mjs';
import { waitTerminal } from '../../automation/conversation.mjs';

// 读取导入弹窗内的文件 input 数量。
export async function readImportDialog(ctx) {
  const conn = await connectSkills(ctx);
  try {
    const { frame, page } = conn;
    const rec = ctx.recorder;
    const act = await rec.action('打开导入技能弹窗', 'click', null, async () => {
      if (!(await frame.locator(SKILL_SEL.dialog).count())) {
        await frame.getByRole('button', { name: '导入技能' }).click();
      }
      await page.waitForTimeout(1200);
    });
    const inputs = await rec.read('技能导入弹窗文件input数量', 'import-dialog-file-inputs', { channel: 'dom', scope: '技能页/导入技能弹窗', locator: `${SKILL_SEL.dialog} input[type="file"]` }, async () => {
      const fileCount = await frame.locator(`${SKILL_SEL.dialog} input[type="file"]`).count();
      const acceptCount = await frame.locator(SKILL_SEL.fileInput).count();
      const dirCount = await frame.locator(SKILL_SEL.dirInput).count();
      const dialogText = (await frame.locator(SKILL_SEL.dialog).first().innerText()).replace(/\s+/g, ' ').trim();
      return { value: fileCount, raw: { fileCount, acceptCount, dirCount, dialogText }, derivation: '弹窗内 input[type=file] 总数' };
    });
    await frame.locator(SKILL_SEL.dialog).getByRole('button', { name: '取消' }).click();
    return { action_refs: [act.event_id], observations: { inputs } };
  } finally { await conn.close(); }
}

// 选择单个 SKILL.md 并提交导入；返回文件input数量、弹窗是否关闭、卡片是否存在。
export async function importSingleFile(ctx, args = {}) {
  const { filePath, displayName } = args;
  if (!filePath) throw new Error('filePath 必填');
  const conn = await connectSkills(ctx);
  try {
    const { frame, page } = conn;
    const rec = ctx.recorder;
    const actionRefs = [];
    const openAct = await rec.action('打开导入技能弹窗', 'click', null, async () => {
      if (!(await frame.locator(SKILL_SEL.dialog).count())) {
        await frame.getByRole('button', { name: '导入技能' }).click();
      }
      await page.waitForTimeout(1200);
    });
    actionRefs.push(openAct.event_id);
    const inputs = await rec.read('技能导入弹窗文件input数量', 'import-dialog-file-inputs', { channel: 'dom', scope: '技能页/导入技能弹窗', locator: `${SKILL_SEL.dialog} input[type="file"]` }, async () => {
      const fileCount = await frame.locator(`${SKILL_SEL.dialog} input[type="file"]`).count();
      const acceptCount = await frame.locator(SKILL_SEL.fileInput).count();
      const dirCount = await frame.locator(SKILL_SEL.dirInput).count();
      const dialogText = (await frame.locator(SKILL_SEL.dialog).first().innerText()).replace(/\s+/g, ' ').trim();
      return { value: fileCount, raw: { fileCount, acceptCount, dirCount, dialogText }, derivation: '弹窗内 input[type=file] 总数' };
    });
    const submitAct = await rec.action('提交技能导入', 'setInputFiles-and-import', { filePath }, async () => {
      await frame.locator(SKILL_SEL.fileInput).first().setInputFiles(filePath);
      await page.waitForTimeout(800);
      await frame.locator(SKILL_SEL.dialog).locator('button', { hasText: '导入' }).last().click();
    });
    actionRefs.push(submitAct.event_id);
    await frame.locator(SKILL_SEL.dialog).first().waitFor({ state: 'detached', timeout: 15000 });
    await page.waitForTimeout(1200);
    const result = await rec.read('本轮技能卡存在', 'skill-card-present', { channel: 'dom', scope: '技能页/我的技能卡片', locator: SKILL_SEL.card }, async () => {
      const card = await cardByTitle(frame, displayName, ctx.internalName);
      const count = await card.count();
      const visible = count ? await card.isVisible() : false;
      const raw = { count, visible };
      return { value: count > 0 && visible, raw, derivation: 'count>0 && visible' };
    });
    const dialogClosed = await frame.locator(SKILL_SEL.dialog).count() === 0;
    return { action_refs: actionRefs, observations: { inputs, card: result, dialogClosed } };
  } finally { await conn.close(); }
}

// 搜索技能并读取匹配卡片数量。
export async function searchSkills(ctx, args = {}) {
  const { term } = args;
  const conn = await connectSkills(ctx);
  try {
    const { frame, page } = conn;
    const rec = ctx.recorder;
    const act = await rec.action('搜索技能', 'fill', { term }, async () => {
      const input = frame.locator(SKILL_SEL.search).first();
      await input.click();
      await input.fill(term);
      await page.waitForTimeout(1200);
    });
    const count = await rec.read('搜索结果卡片数量', 'search-results', { channel: 'dom', scope: '技能页/我的技能搜索结果', locator: SKILL_SEL.card }, async () => {
      const n = await frame.locator(SKILL_SEL.card).count();
      const titles = await frame.locator(SKILL_SEL.cardTitle).allInnerTexts();
      return { value: n, raw: { count: n, titles } };
    });
    const titleContains = await rec.read('搜索命中标题是否含搜索词', 'search-title-contains', { channel: 'dom', scope: '技能页/我的技能搜索结果', locator: SKILL_SEL.cardTitle }, async () => {
      const titles = (await frame.locator(SKILL_SEL.cardTitle).allInnerTexts()).map((t) => t.trim());
      const any = titles.some((t) => t.includes(term));
      return { value: any, raw: { term, titles }, derivation: 'titles.some(t => t.includes(term))' };
    });
    return { action_refs: [act.event_id], observations: { count, titleContains } };
  } finally { await conn.close(); }
}

// 读取指定展示名技能卡片的标题/来源/版本/开关。
export async function readSkillCard(ctx, args = {}) {
  const { displayName } = args;
  const conn = await connectSkills(ctx);
  try {
    const { frame } = conn;
    const rec = ctx.recorder;
    const card = await cardByTitle(frame, displayName, ctx.internalName);
    const title = await rec.read('本轮技能标题', 'skill-card-title', { channel: 'dom', scope: '技能页/我的技能卡片', locator: SKILL_SEL.cardTitle }, async () => {
      const t = card.locator(SKILL_SEL.cardTitle).first();
      const value = (await t.innerText()).trim();
      return { value, raw: { title: value } };
    });
    const meta = await rec.read('本轮技能来源与版本', 'skill-card-meta', { channel: 'dom', scope: '技能页/我的技能卡片', locator: SKILL_SEL.card }, async () => {
      const text = (await card.innerText()).replace(/\s+/g, ' ').trim();
      const source = (/来源\s*([^\s]+)/.exec(text) || [])[1] || null;
      const version = (/v([0-9][0-9.]*)/.exec(text) || [])[1] || null;
      return { value: { source, version }, raw: { text, source, version } };
    });
    const description = await rec.read('本轮样本描述', 'skill-card-description', { channel: 'dom', scope: '技能页/我的技能卡片', locator: SKILL_SEL.card }, async () => {
      const text = (await card.innerText()).replace(/\s+/g, ' ').trim();
      const titleText = (await card.locator(SKILL_SEL.cardTitle).first().innerText()).trim();
      let desc = text.slice(text.indexOf(titleText) + titleText.length).trim();
      desc = desc.replace(/^来源.*$/, '').trim();
      desc = desc.replace(/\s*(来源|v[0-9].*|快捷使用).*$/, '').trim();
      return { value: desc || null, raw: { text, desc } };
    });
    const source = await rec.read('本轮技能来源', 'skill-card-source', { channel: 'dom', scope: '技能页/我的技能卡片', locator: SKILL_SEL.card }, async () => {
      const text = (await card.innerText()).replace(/\s+/g, ' ').trim();
      const v = (/来源\s*([^\s]+)/.exec(text) || [])[1] || null;
      return { value: v, raw: { text, source: v } };
    });
    const market = await rec.read('对象市场关联', 'skill-card-market', { channel: 'dom', scope: '技能页/我的技能卡片', locator: SKILL_SEL.card }, async () => {
      const text = (await card.innerText()).replace(/\s+/g, ' ').trim();
      const src = (/来源\s*([^\s]+)/.exec(text) || [])[1] || null;
      const value = src ? /(公共\s*Agent|市场|market)/i.test(src) : false;
      return { value, raw: { source: src, text }, derivation: '来源含市场/公共 Agent 标记' };
    });
    const localTag = await rec.read('卡片本地修改标签', 'skill-card-local-tag', { channel: 'dom', scope: '技能页/我的技能卡片', locator: SKILL_SEL.card }, async () => {
      const text = (await card.innerText()).replace(/\s+/g, ' ').trim();
      const value = /本地修改|本地已修改|已本地修改/.test(text);
      return { value, raw: { text }, derivation: '卡片标签含本地修改' };
    });    const version = await rec.read('本轮技能版本', 'skill-card-version', { channel: 'dom', scope: '技能页/我的技能卡片', locator: SKILL_SEL.card }, async () => {
      const text = (await card.innerText()).replace(/\s+/g, ' ').trim();
      const v = (/v([0-9][0-9.]*)/.exec(text) || [])[1] || null;
      return { value: v, raw: { text, version: v } };
    });
    const sw = await rec.read('本轮技能开关', 'skill-card-switch', { channel: 'dom', scope: '技能页/我的技能卡片', locator: SKILL_SEL.cardSwitch }, async () => {
      const el = card.locator(SKILL_SEL.cardSwitch).first();
      const aria = await el.getAttribute('aria-checked');
      const raw = { aria_checked: aria };
      return { value: parseBoolean(aria), raw, derivation: "aria_checked === 'true'" };
    });
    const switchId = sw.event_id;
    return { observations: { title, meta, source, version, description, switch: sw, market, localTag }, switch_read_ref: switchId };
  } finally { await conn.close(); }
}

// 设置指定技能的启停开关；返回改前/改后值。
export async function setSkillEnabled(ctx, args = {}) {
  const { displayName, value } = args;
  const conn = await connectSkills(ctx);
  try {
    const { frame, page } = conn;
    const rec = ctx.recorder;
    const card = await cardByTitle(frame, displayName, ctx.internalName);
    const before = await rec.read('本轮技能开关(改前)', 'skill-card-switch', { channel: 'dom', scope: '技能页/我的技能卡片', locator: SKILL_SEL.cardSwitch }, async () => {
      const aria = await card.locator(SKILL_SEL.cardSwitch).first().getAttribute('aria-checked');
      return { value: parseBoolean(aria), raw: { aria_checked: aria }, derivation: "aria_checked === 'true'" };
    });
    const act = await rec.action('切换本轮技能开关', 'click-or-skip', { target: value }, async () => {
      if (before.value !== value) {
        await card.locator(SKILL_SEL.cardSwitch).first().click();
        await page.waitForTimeout(1200);
      }
    });
    const after = await rec.read('本轮技能开关(改后)', 'skill-card-switch', { channel: 'dom', scope: '技能页/我的技能卡片', locator: SKILL_SEL.cardSwitch }, async () => {
      const aria = await card.locator(SKILL_SEL.cardSwitch).first().getAttribute('aria-checked');
      return { value: parseBoolean(aria), raw: { aria_checked: aria }, derivation: "aria_checked === 'true'" };
    });
    return { action_refs: [act.event_id], observations: { before, after } };
  } finally { await conn.close(); }
}

// 打开技能详情并读取 SKILL.md 正文（详情为整页视图，非 dialog）。
export async function readSkillDetail(ctx, args = {}) {
  const { displayName } = args;
  const conn = await connectSkills(ctx);
  try {
    const { frame, page } = conn;
    const rec = ctx.recorder;
    const card = await cardByTitle(frame, displayName, ctx.internalName);
    const act = await rec.action('打开技能详情', 'click-card', null, async () => {
      await card.locator('[data-slot="card-content"]').first().click();
      await page.waitForTimeout(1800);
    });
    const body = await rec.read('技能详情SKILL.md正文', 'skill-detail-body', { channel: 'dom', scope: '技能页/技能详情整页', locator: '[class*="dir-preview"]' }, async () => {
      const el = frame.locator('[class*="dir-preview"]').first();
      const text = await el.innerText();
      const breadcrumb = (await frame.locator('[class*="page-top"]').first().innerText()).replace(/\s+/g, ' ').trim();
      return { value: text, raw: { length: text.length, breadcrumb } };
    });
    const emptyFields = await rec.read('空可选字段占位', 'skill-empty-fields', { channel: 'dom', scope: '技能页/技能详情元数据区', locator: '[class*="page-body"]' }, async () => {
      const text = await frame.locator('[class*="page-body"]').first().innerText();
      const flat = text.replace(/\s+/g, ' ').trim();
      const hit = /(标签|版本|作者|推荐问题)\s*[:：]\s*(?![^\s])/.test(flat);
      return { value: hit, raw: { text: flat.slice(0, 300) }, derivation: '空字段行正则命中' };
    });
    return { action_refs: [act.event_id], observations: { detail: body, emptyFields } };
  } finally { await conn.close(); }
}

// 在技能页切换 全部/已启用/未启用 筛选，读取本轮样本匹配卡片数。
export async function filterSkills(ctx, args = {}) {
  const { filter, displayName } = args;
  const conn = await connectSkills(ctx);
  try {
    const { frame, page } = conn;
    const rec = ctx.recorder;
    const act = await rec.action('切换技能筛选', 'click', { filter }, async () => {
      await frame.getByRole('button', { name: filter, exact: true }).click();
      await page.waitForTimeout(1200);
    });
    const match = await rec.read('筛选后本轮样本匹配数', 'filter-round-match', { channel: 'dom', scope: `技能页/已${filter}过滤` , locator: SKILL_SEL.card }, async () => {
      const n = await frame.locator(SKILL_SEL.card).filter({ has: frame.locator(SKILL_SEL.cardTitle, { hasText: displayName }) }).count();
      const titles = await frame.locator(SKILL_SEL.cardTitle).allInnerTexts();
      return { value: n, raw: { count: n, titles: titles.map((t) => t.trim()) } };
    });
    return { action_refs: [act.event_id], observations: { match } };
  } finally { await conn.close(); }
}

// 读取技能页搜索框值、本轮样本存在状态与开关（用于筛选恢复核验）。
export async function readSkillsListState(ctx, args = {}) {
  const { displayName } = args;
  const conn = await connectSkills(ctx);
  try {
    const { frame } = conn;
    const rec = ctx.recorder;
    const searchValue = await rec.read('技能搜索框值', 'skills-search-value', { channel: 'dom', scope: '技能页/搜索框', locator: SKILL_SEL.search }, async () => {
      const v = await frame.locator(SKILL_SEL.search).first().inputValue();
      return { value: v, raw: { value: v } };
    });
    const exists = await rec.read('全部列表本轮对象存在', 'round-card-exists', { channel: 'dom', scope: '技能页/我的技能卡片', locator: SKILL_SEL.card }, async () => {
      const n = await frame.locator(SKILL_SEL.card).filter({ has: frame.locator(SKILL_SEL.cardTitle, { hasText: displayName }) }).count();
      const raw = { count: n };
      return { value: n > 0, raw, derivation: 'count > 0' };
    });
    const sw = await rec.read('本轮技能最终开关', 'skill-card-switch', { channel: 'dom', scope: '技能页/我的技能卡片', locator: SKILL_SEL.cardSwitch }, async () => {
      const card = await cardByTitle(frame, displayName, ctx.internalName);
      const aria = await card.locator(SKILL_SEL.cardSwitch).first().getAttribute('aria-checked');
      return { value: parseBoolean(aria), raw: { aria_checked: aria }, derivation: "aria_checked === 'true'" };
    });
    return { observations: { searchValue, exists, switch: sw } };
  } finally { await conn.close(); }
}

// 新建会话后经 快捷使用 引入本轮技能引用；返回改前/改后会话身份与引用内部名。
export async function useSkill(ctx, args = {}) {
  const { displayName } = args;
  const conn = await connect(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    const readSession = async () => page.locator('[data-conversation-session]').first().getAttribute('data-conversation-session');
    // 先挂载一个已有实质会话作为“此前活动会话”，保证随后 新建任务 产生真正的新会话。
    const rows = page.locator('[data-row-key^="session:"]');
    const target = rows.filter({ hasText: '请只输出一个代码块' }).first();
    const mount = (await target.count()) ? target : rows.first();
    if (await mount.count()) { await mount.click(); await page.waitForTimeout(1500); }
    const sessionBefore = await rec.read('调用会话身份(前)', 'session', { channel: 'dom', scope: '主界面会话容器', locator: '[data-conversation-session]' }, async () => {
      const v = await readSession();
      return { value: v, raw: { value: v } };
    });
    const newAct = await rec.action('调用前新建任务', 'click', null, async () => {
      await page.locator(SEL.newTask).first().click();
      await page.waitForTimeout(1500);
    });
    const useAct = await rec.action('快捷使用本轮技能', 'click', { displayName }, async () => {
      await page.locator('button[aria-label="技能"]').first().click();
      await page.waitForTimeout(1500);
      const frame = page.frames().find((f) => f.url().includes(SKILL_SEL.frameUrlPart));
      if (await frame.locator('[class*="dir-preview"]').count()) {
        await frame.locator('[class*="page-top"]').getByText('技能', { exact: true }).first().click();
        await page.waitForTimeout(800);
      }
      const card = await cardByTitle(frame, displayName, ctx.internalName);
      await card.scrollIntoViewIfNeeded();
      await card.hover();
      await card.getByText('快捷使用', { exact: true }).first().click();
      await page.waitForTimeout(2000);
    });
    const reference = await rec.read('新会话技能引用', 'composer-skill-reference', { channel: 'dom', scope: 'composer 输入区', locator: SEL.composer }, async () => {
      const text = await page.locator(SEL.composer).first().innerText();
      const cleaned = text.replace(/^\s*\/\s*/, '').trim();
      const m = /^([A-Za-z0-9_-]+)/.exec(cleaned);
      return { value: m ? m[1] : null, raw: { composerText: text } };
    });
    const sessionAfter = await rec.read('调用会话身份(后)', 'session', { channel: 'dom', scope: '主界面会话容器', locator: '[data-conversation-session]' }, async () => {
      const v = await readSession();
      return { value: v, raw: { value: v } };
    });
    return { action_refs: [newAct.event_id, useAct.event_id], observations: { sessionBefore, sessionAfter, reference } };
  } finally { await conn.close(); }
}

// 仅经 快捷使用 入口（不手动新建任务），观察入口是否自行新建会话。
export async function useSkillDirect(ctx, args = {}) {
  const { displayName } = args;
  const conn = await connect(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    const readSession = async () => page.locator('[data-conversation-session]').first().getAttribute('data-conversation-session');
    await rec.action('关闭可能遮挡的弹窗', 'escape', null, async () => {
      for (let i = 0; i < 3; i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
    });
    const rows = page.locator('[data-row-key^="session:"]');
    const mount = (await rows.filter({ hasText: '请只输出一个代码块' }).first().count()) ? rows.filter({ hasText: '请只输出一个代码块' }).first() : rows.first();
    if (await mount.count()) { await mount.click(); await page.waitForTimeout(1500); }
    const sessionBefore = await rec.read('入口前活动会话', 'session', { channel: 'dom', scope: '主界面会话容器', locator: '[data-conversation-session]' }, async () => { const v = await readSession(); return { value: v, raw: { value: v } }; });
    const useAct = await rec.action('经快捷使用入口引入技能', 'click-quick-use', { displayName }, async () => {
      await page.locator('button[aria-label="技能"]').first().click();
      await page.waitForTimeout(1500);
      const frame = page.frames().find((f) => f.url().includes(SKILL_SEL.frameUrlPart));
      if (await frame.locator('[class*="dir-preview"]').count()) {
        await frame.locator('[class*="page-top"]').getByText('技能', { exact: true }).first().click();
        await page.waitForTimeout(800);
      }
      const card = await cardByTitle(frame, displayName, ctx.internalName);
      await card.scrollIntoViewIfNeeded();
      await card.hover();
      await card.getByText('快捷使用', { exact: true }).first().click();
      await page.waitForTimeout(2000);
    });
    const reference = await rec.read('入口后技能引用', 'composer-skill-reference', { channel: 'dom', scope: 'composer 输入区', locator: SEL.composer }, async () => {
      const text = await page.locator(SEL.composer).first().innerText();
      const cleaned = text.replace(/^\s*\/\s*/, '').trim();
      const m = /^([A-Za-z0-9_-]+)/.exec(cleaned);
      return { value: m ? m[1] : null, raw: { composerText: text } };
    });
    const sessionAfter = await rec.read('入口后活动会话', 'session', { channel: 'dom', scope: '主界面会话容器', locator: '[data-conversation-session]' }, async () => { const v = await readSession(); return { value: v, raw: { value: v } }; });
    return { action_refs: [useAct.event_id], observations: { sessionBefore, sessionAfter, reference } };
  } finally { await conn.close(); }
}

// 发送本轮技能的固定回复规则请求并等待终态；返回助手正文与用户请求。
export async function useSkillRequest(ctx, args = {}) {
  const { text = '请执行本轮回归技能的固定回复规则', timeoutMs = 120000, answer } = args;
  const conn = await connect(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    let preCount = 0, submittedRequest;
    const act = await rec.action('发送技能固定回复请求', 'type-and-send', { chars: text.length }, async () => {
      preCount = await page.locator(SEL.assistantBody).count();
      const c = page.locator(SEL.composer).first();
      await c.click();
      await page.keyboard.press('End');
      // 保留 composer 中已有的技能引用，在末尾追加请求文本。
      await page.keyboard.insertText(text);
      await page.waitForTimeout(400);
      submittedRequest = await readComposerRequest(page, SEL.composer);
      await page.locator(SEL.send).first().click();
    });
    let wait;
    try { wait = await waitTerminal(page, { timeoutMs, minBubbles: preCount + 1 }); }
    catch (e) { wait = { error: String(e.message), timed_out: true }; }
    const assistant = await rec.read('技能调用助手气泡', 'last-assistant-bubble', { channel: 'dom', scope: '对话 助手气泡', locator: SEL.assistantBody }, async () => {
      const bubbles = page.locator(SEL.assistantBody);
      const n = await bubbles.count();
      const last = n ? (await bubbles.nth(n - 1).innerText()).trim() : null;
      return { value: last, raw: { count: n, last } };
    });
    const userReq = await rec.read('本轮用户请求', 'submitted-composer', { channel: 'dom', scope: '本次提交前编辑区完整输入', locator: SEL.composer }, async () => {
      if(typeof answer!=='string'||!submittedRequest)throw Error('answer and submitted composer observation required');
      const requestText=submittedRequest.text;
      return { value: requestText.includes(answer), raw: { requestText, session:submittedRequest.session, capturedAt:submittedRequest.capturedAt, answer, capturedBeforeSend:true }, derivation:'complete submitted composer text.includes(answer)' };
    });
    return { action_refs: [act.event_id], observations: { wait, assistant, userReq } };
  } finally { await conn.close(); }
}

// 读取本轮技能调用轨迹中的 skill_content 资源标识（限定轨迹表格，不整页搜索）。
export async function readTraceSkillContent(ctx,args){
 if(!args.internalName)throw Error('internalName required');const c=await connect(ctx);try{
 const action=await ctx.recorder.action('打开本会话轨迹','click',null,async()=>{await c.page.getByText('轨迹',{exact:true}).first().click();await c.page.waitForTimeout(500);});
 const resource=await ctx.recorder.read('指定技能独立注入内容',args.internalName,{channel:'dom',scope:'当前session轨迹/context'},async()=>{
 const rows=c.page.locator('tr[data-trajectory-row-key]');const matches=[];
 for(const row of await rows.all()){const text=await row.innerText();if(text.includes('<skill_content')&&text.includes('name="'+args.internalName+'"'))matches.push(text);}
 return {value:matches.length?matches.join('\n'):null,raw:{internalName:args.internalName,matches,session:await c.page.locator('[data-conversation-session]').first().getAttribute('data-conversation-session')}};
 });return {action_refs:[action.event_id],observations:{resource}};
 }finally{await c.close();}
}

export async function importPackage(ctx, args = {}) {
  const { filePath, displayName, field = null } = args;
  const conn = await connectSkills(ctx);
  try {
    const { frame, page } = conn;
    const rec = ctx.recorder;
    const actionRefs = [];
    const openAct = await rec.action('打开导入技能弹窗', 'click', null, async () => {
      if (!(await frame.locator(SKILL_SEL.dialog).count())) {
        await frame.getByRole('button', { name: '导入技能' }).click();
      }
      await page.waitForTimeout(1200);
    });
    actionRefs.push(openAct.event_id);
    const submitAct = await rec.action('提交技能导入', 'setInputFiles-and-import', { filePath, field }, async () => {
      await frame.locator(SKILL_SEL.fileInput).first().setInputFiles(filePath);
      await page.waitForTimeout(900);
      await frame.locator(SKILL_SEL.dialog).locator('button', { hasText: '导入' }).last().click();
      await page.waitForTimeout(2500);
    });
    actionRefs.push(submitAct.event_id);
    const feedback = await rec.read('导入校验反馈', 'skill-import-feedback', { channel: 'dom', scope: '技能页/导入弹窗', locator: SKILL_SEL.dialog }, async () => {
      const n = await frame.locator(SKILL_SEL.dialog).count();
      const text = n ? (await frame.locator(SKILL_SEL.dialog).first().innerText()).replace(/\s+/g, ' ').trim() : null;
      let value = null;
      if (text) {
        if (field === 'name') value = /name/i.test(text) && /(缺失|必填|required|缺少|不能为空|未填写)/.test(text);
        else if (field === 'description') value = /(description|描述)/i.test(text) && /(缺失|必填|required|缺少|不能为空|未填写)/.test(text);
        else value = false;
      } else if (field) {
        // 弹窗已关闭且无错误反馈 = 提交完成且无对应拒绝反馈
        value = false;
      }
      return { value, raw: { dialogCount: n, text, field }, derivation: `field=${field} 校验提示` };
    });
    if (displayName) { await frame.locator(SKILL_SEL.dialog).first().waitFor({ state: 'detached', timeout: 6000 }); await page.waitForTimeout(800); }
    const card = await rec.read('本轮技能卡存在', 'skill-card-present', { channel: 'dom', scope: '技能页/我的技能卡片', locator: SKILL_SEL.card }, async () => {
      const c = displayName ? await cardByTitle(frame, displayName, ctx.internalName) : frame.locator(SKILL_SEL.card);
      const n = await c.count();
      const visible = n ? await c.first().isVisible() : false;
      return { value: n > 0 && visible, raw: { count: n, visible }, derivation: 'count>0 && visible' };
    });
    return { action_refs: actionRefs, observations: { feedback, card } };
  } finally { await conn.close(); }
}

// 读取技能列表全部卡片标题（排序）作为内部身份集合。
export async function readListIdentity(ctx){
 const p=ctx.environment.skills_registry;if(!p)throw Error('environment.skills_registry required');
 const read=await ctx.recorder.read('正式技能内部身份集合',p,{channel:'file',scope:'实际技能注册表'},async()=>{
 const obj=JSON.parse(fs.readFileSync(p,'utf8'));if(!obj.entries)throw Error('Unknown skills registry structure');
 const names=Object.keys(obj.entries).sort();return {value:names,raw:{path:p,count:names.length,names}};
 });return {observations:{read}};
}

export async function readIconState(ctx, args = {}) {
  const { title } = args;
  const conn = await connectSkills(ctx);
  try {
    const { frame } = conn;
    const rec = ctx.recorder;
    const card = await cardByTitle(frame, title, ctx.internalName);
    const loaded = await rec.read('样本图标加载', 'skill-icon-loaded', { channel: 'dom', scope: '技能页/本轮卡片图标', locator: SKILL_SEL.card }, async () => {
      const info = await card.evaluate((el) => {
        const icon = el.querySelector('[class*="icon"]');
        const img = icon ? icon.querySelector('img') : null;
        const svg = icon ? icon.querySelector('svg') : null;
        return { hasImg: !!img, src: img ? img.getAttribute('src') : null, complete: img ? img.complete : null, naturalWidth: img ? img.naturalWidth : null, hasSvg: !!svg };
      });
      const value = info.hasImg && info.complete === true && info.naturalWidth > 0;
      return { value, raw: info, derivation: 'hasImg && complete && naturalWidth>0' };
    });
    const source = await rec.read('图标资源身份', 'skill-icon-source', { channel: 'dom', scope: '技能页/本轮卡片图标', locator: SKILL_SEL.card }, async () => {
      const info = await card.evaluate((el) => {
        const icon = el.querySelector('[class*="icon"]');
        const img = icon ? icon.querySelector('img') : null;
        const svg = icon ? icon.querySelector('svg') : null;
        return { src: img ? img.getAttribute('src') : null, hasSvg: !!svg, isDefaultSrc: img ? /data:image\/svg/i.test(img.getAttribute('src') || '') : false };
      });
      const src = info.src || '';
      const fromInstall = /^(blob:|dsh-app:|file:)/.test(src) ? true : (/skill|skill-icon|assets|icon/i.test(src) && !/^data:image\/svg/i.test(src));
      return { value: info.hasSvg ? false : fromInstall, raw: info, derivation: '非内联SVG默认图标且 src 指向安装资源' };
    });
    const defaultIcon = await rec.read('默认图标降级可见', 'skill-icon-default', { channel: 'dom', scope: '技能页/本轮卡片图标', locator: SKILL_SEL.card }, async () => {
      const info = await card.evaluate((el) => {
        const icon = el.querySelector('[class*="icon"]');
        const img = icon ? icon.querySelector('img') : null;
        const svg = icon ? icon.querySelector('svg') : null;
        const vis = (e) => !!(e && (e.offsetWidth || e.offsetHeight || e.getClientRects().length));
        return { hasSvgVisible: vis(svg), hasImgVisible: vis(img), defaultSrc: img ? /data:image\/svg/i.test(img.getAttribute('src') || '') : false };
      });
      const value = info.hasSvgVisible || (info.hasImgVisible && info.defaultSrc) || (info.hasImgVisible && !info.defaultSrc);
      return { value, raw: info, derivation: '存在可见默认图标(内联SVG或默认src img)' };
    });
    return { observations: { loaded, source, defaultIcon } };
  } finally { await conn.close(); }
}

// 导入技能包并监听与该 icon 完整 URL 匹配的网络请求数。
export async function importPackageMonitored(ctx, args = {}) {
  const { filePath, displayName, urlPattern } = args;
  const conn = await connectSkills(ctx);
  try {
    const { frame, page } = conn;
    const rec = ctx.recorder;
    const hits = [];
    const onReq = (req) => { try { if (urlPattern && req.url().includes(urlPattern)) hits.push(req.url()); } catch { /* ignore */ } };
    page.on('request', onReq);
    const act = await rec.action('监听导入技能包', 'setInputFiles-and-import', { filePath }, async () => {
      if (!(await frame.locator(SKILL_SEL.dialog).count())) { await frame.getByRole('button', { name: '导入技能' }).click(); await page.waitForTimeout(1000); }
      await frame.locator(SKILL_SEL.fileInput).first().setInputFiles(filePath);
      await page.waitForTimeout(800);
      await frame.locator(SKILL_SEL.dialog).locator('button', { hasText: '导入' }).last().click();
      await page.waitForTimeout(3000);
    });
    page.off('request', onReq);
    const count = await rec.read('网络icon实际请求数', 'skill-icon-requests', { channel: 'http', scope: '页面网络请求监听', locator: `request(url includes ${urlPattern})` }, async () => ({ value: hits.length, raw: { hits, urlPattern } }));
    const card = await rec.read('本轮技能卡存在', 'skill-card-present', { channel: 'dom', scope: '技能页/我的技能卡片', locator: SKILL_SEL.card }, async () => {
      const c = displayName ? await cardByTitle(frame, displayName, ctx.internalName) : frame.locator(SKILL_SEL.card);
      const n = await c.count();
      const visible = n ? await c.first().isVisible() : false;
      return { value: n > 0 && visible, raw: { count: n, visible }, derivation: 'count>0 && visible' };
    });
    return { action_refs: [act.event_id], observations: { count, card } };
  } finally { await conn.close(); }
}

const TREE = '[class*="dir-tree"]';

async function ensureDetail(frame, page, displayName) {
  if (!(await frame.locator('[class*="dir-preview"]').count())) {
    const card = await cardByTitle(frame, displayName, ctx.internalName);
    await card.locator('[data-slot="card-content"]').first().click();
    await page.waitForTimeout(1800);
  }
}

// 读取技能详情目录树：选中节点、预览正文、节点名列表。
export async function readDetailTree(ctx, args = {}) {
  const { displayName } = args;
  const conn = await connectSkills(ctx, { preserveView: true });
  try {
    const { frame, page } = conn;
    const rec = ctx.recorder;
    const act = await rec.action('打开技能详情(目录树)', 'click-card', null, async () => { await ensureDetail(frame, page, displayName); });
    const selected = await rec.read('详情初始选中文件', 'skill-detail-selected', { channel: 'dom', scope: '技能页/技能详情/目录树', locator: TREE }, async () => {
      const info = await frame.evaluate(() => {
        const tree = document.querySelector('[class*="dir-tree"]');
        if (!tree) return { found: false };
        const sel = tree.querySelector('[aria-selected="true"], [class*="selected"]');
        const names = [...tree.querySelectorAll('span')].map((e) => (e.innerText || '').trim()).filter(Boolean);
        return { found: true, selected: sel ? (sel.innerText || '').trim() : null, names };
      });
      const value = info.selected || null;
      return { value, raw: info };
    });
    const preview = await rec.read('默认预览完整正文', 'skill-detail-preview', { channel: 'dom', scope: '技能页/技能详情/预览', locator: '[class*="dir-preview"]' }, async () => {
      const text = await frame.locator('[class*="dir-preview"]').first().innerText();
      return { value: text, raw: { length: text.length } };
    });
    return { action_refs: [act.event_id], observations: { selected, preview } };
  } finally { await conn.close(); }
}

// 展开路径文件夹并选择目标文件；读取预览正文、可编辑控件数、图片加载。
export async function clickTreeNode(ctx, args = {}) {
  const { displayName, path: segs } = args;
  const conn = await connectSkills(ctx, { preserveView: true });
  try {
    const { frame, page } = conn;
    const rec = ctx.recorder;
    await ensureDetail(frame, page, displayName);
    const act = await rec.action('选择目录树文件', 'click', { path: segs }, async () => {
      for (const s of segs) {
        await frame.locator(TREE).getByText(s, { exact: true }).first().click();
        await page.waitForTimeout(900);
      }
      await page.waitForTimeout(600);
    });
    const preview = await rec.read('文件预览正文', 'skill-file-preview', { channel: 'dom', scope: '技能页/技能详情/预览', locator: '[class*="dir-preview"]' }, async () => {
      const text = await frame.locator('[class*="dir-preview"]').first().innerText();
      return { value: text, raw: { length: text.length } };
    });
    const editable = await rec.read('文件预览可编辑控件数', 'skill-file-editable', { channel: 'dom', scope: '技能页/技能详情/预览', locator: '[class*="dir-preview"]' }, async () => {
      const n = await frame.evaluate(() => {
        const p = document.querySelector('[class*="dir-preview"]');
        if (!p) return 0;
        const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
        return [...p.querySelectorAll('textarea,[contenteditable="true"]')].filter(vis).length;
      });
      return { value: n, raw: { count: n } };
    });
    const image = await rec.read('包内图片预览加载', 'skill-file-image', { channel: 'dom', scope: '技能页/技能详情/预览', locator: '[class*="dir-preview"]' }, async () => {
      const info = await frame.evaluate(() => {
        const p = document.querySelector('[class*="dir-preview"]');
        const img = p ? p.querySelector('img') : null;
        return { hasImg: !!img, src: img ? img.getAttribute('src') : null, complete: img ? img.complete : null, naturalWidth: img ? img.naturalWidth : null };
      });
      const value = info.hasImg && info.complete === true && info.naturalWidth > 0;
      return { value, raw: info, derivation: 'hasImg && complete && naturalWidth>0' };
    });
    const meta = await rec.read('文件预览元信息', 'skill-file-meta', { channel: 'dom', scope: '技能页/技能详情/预览', locator: '[class*="dir-preview"]' }, async () => {
      const text = (await frame.locator('[class*="dir-preview"]').first().innerText()).replace(/\s+/g, ' ').trim();
      const value = /(名称|类型|大小)/.test(text) && /(类型|大小)/.test(text);
      return { value, raw: { text }, derivation: '预览含名称/类型/大小说明' };
    });
    const parseClaim = await rec.read('二进制解析声称', 'skill-file-parse', { channel: 'dom', scope: '技能页/技能详情/预览', locator: '[class*="dir-preview"]' }, async () => {
      const text = (await frame.locator('[class*="dir-preview"]').first().innerText()).replace(/\s+/g, ' ').trim();
      const value = /(解析成功|已解析|内容已识别|解析结果|识别成功|解析完成)/.test(text);
      return { value, raw: { text }, derivation: '含对文件业务内容的解析成功声明' };
    });
    return { action_refs: [act.event_id], observations: { preview, editable, image, meta, parseClaim } };
  } finally { await conn.close(); }
}

// 收起/展开目录树中的某个文件夹节点。
export async function toggleTreeFolder(ctx, args = {}) {
  const { displayName, label } = args;
  const conn = await connectSkills(ctx, { preserveView: true });
  try {
    const { frame, page } = conn;
    const rec = ctx.recorder;
    await ensureDetail(frame, page, displayName);
    const act = await rec.action('切换目录树文件夹', 'click', { label }, async () => {
      await frame.locator(TREE).getByText(label, { exact: true }).first().click();
      await page.waitForTimeout(1200);
    });
    return { action_refs: [act.event_id], observations: {} };
  } finally { await conn.close(); }
}

// 读取指定树节点可见状态。
export async function readTreeNodeVisible(ctx, args = {}) {
  const { displayName, label } = args;
  const conn = await connectSkills(ctx, { preserveView: true });
  try {
    const { frame,page } = conn;
    await ensureDetail(frame,page,displayName);
    const rec = ctx.recorder;
    const read = await rec.read('目录树节点可见状态', 'skill-tree-node-visible', { channel: 'dom', scope: '技能页/技能详情/目录树', locator: TREE }, async () => {
      await frame.locator(TREE).waitFor({state:'visible'});
      const el = frame.locator(TREE).getByText(label, { exact: true }).first();
      const n = await el.count();
      const vis = n ? await el.isVisible() : false;
      return { value: vis, raw: { count: n, visible: vis }, derivation: 'count>0 && visible' };
    });
    return { observations: { read } };
  } finally { await conn.close(); }
}

// 读写本轮实际安装的技能文件（外部修改，channel=file）。
export async function installedSkillFile(ctx, args = {}) {
  const fs = await import('node:fs');
  const { createHash } = await import('node:crypto');
  const rec = ctx.recorder;
  const { path: p, write, content } = args;
  if (write) { fs.writeFileSync(p, content, 'utf8'); }
  const digest = fs.existsSync(p) ? createHash('sha256').update(fs.readFileSync(p)).digest('hex') : null;
  const read = await rec.read('本轮实际安装SKILL.md哈希', p, { channel: 'file', scope: '本机已安装技能目录', locator: p }, async () => ({ value: digest, raw: { path: p, exists: fs.existsSync(p), written: !!write } }));
  return { observations: { read } };
}

// 仅经 快捷使用 入口把技能引用注入当前会话（不新建、不切换会话）。
export async function quickUse(ctx, args = {}) {
  const { displayName } = args;
  const conn = await connect(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    const useAct = await rec.action('在当前会话快捷使用技能', 'click-quick-use', { displayName }, async () => {
      await page.locator('button[aria-label="技能"]').first().click();
      await page.waitForTimeout(1500);
      const frame = page.frames().find((f) => f.url().includes(SKILL_SEL.frameUrlPart));
      if (await frame.locator('[class*="dir-preview"]').count()) {
        await frame.locator('[class*="page-top"]').getByText('技能', { exact: true }).first().click();
        await page.waitForTimeout(800);
      }
      const card = await cardByTitle(frame, displayName, ctx.internalName);
      await card.scrollIntoViewIfNeeded();
      await card.hover();
      await card.getByText('快捷使用', { exact: true }).first().click();
      await page.waitForTimeout(2000);
    });
    const reference = await rec.read('当前会话技能引用', 'composer-skill-reference', { channel: 'dom', scope: 'composer 输入区', locator: SEL.composer }, async () => {
      const text = await page.locator(SEL.composer).first().innerText();
      const cleaned = text.replace(/^\s*\/\s*/, '').trim();
      const m = /^([A-Za-z0-9_-]+)/.exec(cleaned);
      return { value: m ? m[1] : null, raw: { composerText: text } };
    });
    return { action_refs: [useAct.event_id], observations: { reference } };
  } finally { await conn.close(); }
}

// 打开技能列表/详情读取本轮技能的外部修改校验反馈。
export async function readValidationFeedback(ctx, args = {}) {
  const { displayName } = args;
  const conn = await connectSkills(ctx);
  try {
    const { frame, page } = conn;
    const rec = ctx.recorder;
    const act = await rec.action('打开技能列表观察校验', 'click-nav', null, async () => { await page.waitForTimeout(800); });
    const feedback = await rec.read('外部修改校验反馈', 'skill-validation-feedback', { channel: 'dom', scope: '技能页/本轮卡片或提示', locator: 'section.panel' }, async () => {
      const info = await frame.evaluate(() => {
        const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
        const alerts = [...document.querySelectorAll('[role="alert"],[class*="toast"],[class*="error"],[class*="invalid"]')].filter(vis).map((e) => (e.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
        const panel = document.querySelector('section.panel');
        const text = panel ? (panel.innerText || '').replace(/\s+/g, ' ').trim() : '';
        return { alerts, panelText: text.slice(0, 400) };
      });
      const joined = (info.alerts.join(' | ') + ' ' + info.panelText).trim();
      const value = /(description|描述)/i.test(joined) && /(缺失|必填|required|校验|无效|invalid|失败|缺少)/.test(joined);
      return { value, raw: info, derivation: '提示含 description 缺失/校验失败' };
    });
    return { action_refs: [act.event_id], observations: { feedback } };
  } finally { await conn.close(); }
}

// 读取技能页双页签均可见可点击。
export async function readTabs(ctx) {
  const conn = await connectSkills(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    const act = await rec.action('打开技能页读取页签', 'click-nav', null, async () => { await page.waitForTimeout(300); });
    const read = await rec.read('技能页双页签可见可点击', 'skill-tabs', { channel: 'dom', scope: '技能页/顶部页签', locator: '[role="tab"]' }, async () => {
      const frame = page.frames().find((f) => f.url().includes(SKILL_SEL.frameUrlPart));
      const info = await frame.evaluate(() => {
        const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
        const items = [...document.querySelectorAll('button,[role="tab"]')].filter(vis).filter((e) => /^(我的技能|技能市场)/.test((e.innerText || '').trim()));
        return items.map((e) => ({ text: (e.innerText || '').replace(/\s+/g, ' ').trim(), disabled: e.disabled }));
      });
      const labels = info.map((i) => i.text);
      const hasBoth = labels.some((t) => t.startsWith('我的技能')) && labels.some((t) => t.startsWith('技能市场')) && info.every((i) => !i.disabled);
      return { value: hasBoth, raw: { tabs: info, labels }, derivation: '我的技能与技能市场页签均可见可点击' };
    });
    return { action_refs: [act.event_id], observations: { read } };
  } finally { await conn.close(); }
}

// 在技能页搜索并读取结果列表中指定内部名出现的次数。
export async function searchSkill(ctx, args = {}) {
  const { query, internalName } = args;
  const matchText = args.matchText || internalName;
  const conn = await connectSkills(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    const act = await rec.action('技能页搜索', 'type-search', { query }, async () => {
      const frame = page.frames().find((f) => f.url().includes(SKILL_SEL.frameUrlPart));
      const box = frame.locator('input[type="search"],input[placeholder*="搜索"],input').first();
      await box.click();
      await box.fill('');
      await box.type(query, { delay: 40 });
      await page.waitForTimeout(1800);
    });
    const result = await rec.read('搜索结果命中数', 'skill-search-count', { channel: 'dom', scope: '技能页/结果列表', locator: SKILL_SEL.card }, async () => {
      const frame = page.frames().find((f) => f.url().includes(SKILL_SEL.frameUrlPart));
      const titles = await frame.evaluate(() => {
        const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
        return [...document.querySelectorAll('.card-title h3,[data-slot="card"] h3')].filter(vis).map((e) => (e.getAttribute('title') || e.innerText || '').trim());
      });
      const count = titles.filter((t) => t === matchText).length;
      return { value: count, raw: { matched: count, titles, query, matchText }, derivation: '结果卡片标题等于本轮身份文本的计数' };
    });
    return { action_refs: [act.event_id], observations: { result } };
  } finally { await conn.close(); }
}

// 读取技能页首张卡片的内部身份（用于确认打开详情对象）。
export async function readFirstCardIdentity(ctx, args = {}) {
  const { internalName } = args;
  const conn = await connectSkills(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    const read = await rec.read('详情对象为本轮卡片', 'skill-detail-identity', { channel: 'dom', scope: '技能页/详情或首卡', locator: SKILL_SEL.card }, async () => {
      const frame = page.frames().find((f) => f.url().includes(SKILL_SEL.frameUrlPart));
      const text = await frame.evaluate(() => {
        const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
        const d = document.querySelector('[class*="dir-preview"],[class*="detail"]');
        return d && vis(d) ? (d.innerText || '').replace(/\s+/g, ' ').slice(0, 300) : '';
      });
      const value = internalName ? text.includes(internalName) : text.length > 0;
      return { value, raw: { detailText: text, internalName }, derivation: '详情文本含本轮内部名' };
    });
    return { observations: { read } };
  } finally { await conn.close(); }
}

// 在技能列表切换开关（不进入详情），回读改前/改后与详情是否未打开。
export async function toggleSwitchNoDetail(ctx, args = {}) {
  const { matchText } = args;
  const conn = await connectSkills(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    const frame = page.frames().find((f) => f.url().includes(SKILL_SEL.frameUrlPart));
    const card = frame.locator('[data-slot="card"]').filter({ hasText: matchText }).first();
    const sw = card.locator('button[role="switch"]').first();
    const before = await rec.read('技能列表开关状态', 'skill-card-switch', { channel: 'dom', scope: '技能页/本轮卡片开关', locator: 'button[role="switch"]' }, async () => {
      const aria = await sw.getAttribute('aria-checked');
      return { value: parseBoolean(aria), raw: { aria_checked: aria, matchText }, derivation: "aria_checked === 'true'" };
    });
    const act = await rec.action('切换技能开关', 'click', { matchText }, async () => { await sw.click(); await page.waitForTimeout(1500); });
    const after = await rec.read('技能列表开关状态', 'skill-card-switch', { channel: 'dom', scope: '技能页/本轮卡片开关', locator: 'button[role="switch"]' }, async () => {
      const aria = await sw.getAttribute('aria-checked');
      return { value: parseBoolean(aria), raw: { aria_checked: aria, matchText }, derivation: "aria_checked === 'true'" };
    });
    const listState = await rec.read('切换后列表可见且详情未打开', 'skill-list-detail-state', { channel: 'dom', scope: '技能页/列表与详情', locator: '[data-slot="card"]' }, async () => {
      const s = await frame.evaluate(() => {
        const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
        const list = [...document.querySelectorAll('[data-slot="card"]')].filter(vis).length;
        const detail = document.querySelector('[class*="dir-preview"]');
        const detailOpen = detail ? vis(detail) : false;
        return { list, detailOpen };
      });
      return { value: s.list > 0 && !s.detailOpen, raw: s, derivation: '列表卡可见且无 dir-preview 详情' };
    });
    const restore = await rec.action('恢复技能开关', 'click', { matchText }, async () => { await sw.click(); await page.waitForTimeout(1500); });
    const restored = await rec.read('技能列表开关状态', 'skill-card-switch', { channel: 'dom', scope: '技能页/本轮卡片开关', locator: 'button[role="switch"]' }, async () => {
      const aria = await sw.getAttribute('aria-checked');
      return { value: parseBoolean(aria), raw: { aria_checked: aria, matchText }, derivation: "aria_checked === 'true'" };
    });
    return { action_refs: [act.event_id, restore.event_id], observations: { before, after, listState, restored } };
  } finally { await conn.close(); }
}

// 点击技能卡片主体打开详情，并读取详情身份文本。
export async function openCardDetail(ctx, args = {}) {
  const { matchText, internalName } = args;
  const conn = await connectSkills(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    const frame = page.frames().find((f) => f.url().includes(SKILL_SEL.frameUrlPart));
    const card = frame.locator('[data-slot="card"]').filter({ hasText: matchText }).first();
    const act = await rec.action('点击技能卡片主体', 'click', { matchText }, async () => {
      await card.locator('[data-slot="card-content"], .card-main, .card-head').first().click();
      await page.waitForTimeout(1500);
    });
    const read = await rec.read('详情身份为本轮技能', 'skill-detail-identity', { channel: 'dom', scope: '技能页/详情', locator: '[class*="dir-preview"]' }, async () => {
      const text = await frame.evaluate(() => {
        const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
        const d = document.querySelector('[class*="dir-preview"]');
        return d && vis(d) ? (d.innerText || '').replace(/\s+/g, ' ').slice(0, 400) : '';
      });
      const hasInternal = internalName ? text.includes(internalName) : false;
      const hasDisplay = text.includes(matchText);
      return { value: hasInternal || hasDisplay, raw: { detailText: text, hasInternal, hasDisplay, internalName, matchText }, derivation: '详情文本含内部名或本轮显示名' };
    });
    return { action_refs: [act.event_id], observations: { read } };
  } finally { await conn.close(); }
}

// 点击“新建技能”，读取是否进入明确的创建技能模式（预置指令）。
export async function startCreate(ctx, args = {}) {
  const { label = '新建技能', presetPattern = 'create-skill|创建技能' } = args;
  const conn = await connectSkills(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    const act = await rec.action('点击创建技能入口', 'click', { label }, async () => {
      const frame = page.frames().find((f) => f.url().includes(SKILL_SEL.frameUrlPart));
      await frame.getByText(label, { exact: true }).first().click();
      await page.waitForTimeout(2500);
    });
    const mode = await rec.read('创建技能模式标识', 'skill-create-mode', { channel: 'dom', scope: 'composer 输入区', locator: SEL.composer }, async () => {
      const t = await page.locator(SEL.composer).first().innerText();
      const value = new RegExp(presetPattern).test(t);
      return { value, raw: { composer: t, presetPattern }, derivation: 'composer 含预置创建技能指令/标签' };
    });
    const visible = await rec.read('创建技能面板可见', 'skill-create-visible', { channel: 'dom', scope: '主表面 composer', locator: SEL.composer }, async () => {
      const v = await page.locator(SEL.composer).first().isVisible();
      return { value: v, raw: { visible: v }, derivation: 'composer.isVisible()' };
    });
    return { action_refs: [act.event_id], observations: { mode, visible } };
  } finally { await conn.close(); }
}

// 选择 ZIP 到导入弹窗，读取候选与列表（不点最终确认），随后取消。
export async function readImportCandidates(ctx, args = {}) {
  const { filePath } = args;
  const conn = await connectSkills(ctx);
  try {
    const { frame, page } = conn;
    const rec = ctx.recorder;
    const clearSearch = async () => {
      const box = frame.locator('input[type="search"],input[placeholder*="搜索"],input').first();
      if (await box.count()) { await box.click(); await box.fill(''); await page.waitForTimeout(1200); }
    };
    await clearSearch();
    const before=(await readListIdentity(ctx)).observations.read;
    const act = await rec.action('选择导入ZIP', 'setInputFiles', { filePath }, async () => {
      if (!(await frame.locator(SKILL_SEL.dialog).count())) await frame.getByRole('button', { name: '导入技能' }).click();
      await page.waitForTimeout(1000);
      await frame.locator(SKILL_SEL.fileInput).first().setInputFiles(filePath);
      await page.waitForTimeout(1800);
    });
    const beforeConfirm=(await readListIdentity(ctx)).observations.read;
    const candidates = await rec.read('导入候选', 'skill-import-candidates', { channel: 'dom', scope: '技能页/导入弹窗', locator: SKILL_SEL.dialog }, async () => {
      const n = await frame.locator(SKILL_SEL.dialog).count();
      const t = n ? (await frame.locator(SKILL_SEL.dialog).first().innerText()).replace(/\s+/g, ' ').trim() : '';
      return { value: t || null, raw: { text: t }, derivation: '导入弹窗文本（候选）' };
    });
    const candidateExists = await rec.read('导入候选存在', 'skill-import-candidate-exists', { channel: 'dom', scope: '技能页/导入弹窗', locator: SKILL_SEL.dialog }, async () => {
      const n = await frame.locator(SKILL_SEL.dialog).count();
      const t = n ? (await frame.locator(SKILL_SEL.dialog).first().innerText()).replace(/\s+/g, ' ').trim() : '';
      const objects=await frame.locator(SKILL_SEL.dialog+' [data-skill-name]').evaluateAll(els=>els.map(e=>e.getAttribute('data-skill-name')));
      const value=objects.length>0;
      return { value, raw: { text:t, scannedInternalNames:objects, uploadSelected:/\.zip/i.test(t) }, derivation:'explicit scanned candidate identities, not archive filename' };
    });
    const cancel = await rec.action('取消导入', 'click', null, async () => {
      const c = frame.locator(SKILL_SEL.dialog).locator('button', { hasText: '取消' }).first();
      if (await c.count()) await c.click();
      await page.waitForTimeout(800);
    });
    return { action_refs: [act.event_id, cancel.event_id], observations: { before, beforeConfirm, candidates, candidateExists } };
  } finally { await conn.close(); }
}

// 提交并确认 ZIP 导入，读取结果。
export async function confirmImport(ctx, args = {}) {
  const { filePath } = args;
  const conn = await connectSkills(ctx);
  try {
    const { frame, page } = conn;
    const rec = ctx.recorder;
    const act = await rec.action('提交并确认导入', 'setInputFiles-and-import', { filePath }, async () => {
      if (!(await frame.locator(SKILL_SEL.dialog).count())) await frame.getByRole('button', { name: '导入技能' }).click();
      await page.waitForTimeout(1000);
      await frame.locator(SKILL_SEL.fileInput).first().setInputFiles(filePath);
      await page.waitForTimeout(1400);
      await frame.locator(SKILL_SEL.dialog).locator('button', { hasText: '导入' }).last().click();
      await page.waitForTimeout(4000);
    });
    const result = await rec.read('导入结果', 'skill-import-result', { channel: 'dom', scope: '技能页/导入弹窗或列表', locator: SKILL_SEL.dialog }, async () => {
      const n = await frame.locator(SKILL_SEL.dialog).count();
      const t = n ? (await frame.locator(SKILL_SEL.dialog).first().innerText()).replace(/\s+/g, ' ').trim() : '';
      const count = await frame.locator('[data-slot="card"]').count();
      return { value: t || null, raw: { dialogCount: n, text: t, listCount: count }, derivation: '导入结果文本或列表数' };
    });
    const conflictDefault = await rec.read('候选默认选项', 'skill-import-conflict-default', { channel: 'dom', scope: '技能页/导入弹窗', locator: SKILL_SEL.dialog }, async () => {
      const n = await frame.locator(SKILL_SEL.dialog).count();
      const t = n ? (await frame.locator(SKILL_SEL.dialog).first().innerText()).replace(/\s+/g, ' ').trim() : '';
      const value = /已跳过同名/.test(t) || /跳过/.test(t) ? '跳过' : (/覆盖/.test(t) ? '覆盖' : null);
      return { value, raw: { text: t }, derivation: '结果文本含 跳过/覆盖' };
    });
    return { action_refs: [act.event_id], observations: { result, conflictDefault } };
  } finally { await conn.close(); }
}

// 读取我的技能列表卡片数。
export async function readSkillCount(ctx) {
  const conn = await connectSkills(ctx);
  try {
    const { frame } = conn;
    const read = await ctx.recorder.read('我的技能列表数', 'skill-list-count', { channel: 'dom', scope: '技能页/我的技能列表', locator: '[data-slot="card"]' }, async () => {
      const n = await frame.locator('[data-slot="card"]').count();
      return { value: n, raw: { count: n } };
    });
    return { observations: { read } };
  } finally { await conn.close(); }
}

// 递归列出本机技能安装目录文件（channel=file）。
export async function listInstalledFiles(ctx, args = {}) {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const base = args.base;
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      out.push(path.relative(base, p).replace(/\\/g, '/'));
      if (e.isDirectory()) walk(p);
    }
  };
  if (fs.existsSync(base)) walk(base);
  const read = await ctx.recorder.read('技能安装目录文件列表', base, { channel: 'file', scope: '本机技能安装目录', locator: base }, async () => ({ value: out.join('|'), raw: { base, files: out } }));
  const junk = await ctx.recorder.read('系统垃圾文件存在', base, { channel: 'file', scope: '本机技能安装目录', locator: base }, async () => {
    const hit = out.filter((f) => /__MACOSX|\.DS_Store/.test(f));
    return { value: hit.length > 0, raw: { files: out, hit }, derivation: '存在 __MACOSX 或 .DS_Store' };
  });
  return { observations: { read, junk } };
}

// 基于两个读取事件计算计数增量（derived 读）。
export async function countDelta(ctx, args = {}) {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const p = path.resolve(ctx.taskRoot, '运行日志/business.jsonl');
  const rows = fs.existsSync(p) ? fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : [];
  const pick = (id) => { const e = rows.find((x) => x.event_id === id); return e ? e.value : null; };
  const before = pick(args.beforeEvent);
  const after = pick(args.afterEvent);
  const read = await ctx.recorder.read('导入前后计数增量', `${args.beforeEvent}->${args.afterEvent}`, { channel: 'derived', scope: '技能列表计数', locator: 'skill-list-count' }, async () => ({ value: (after != null && before != null) ? (after - before) : null, raw: { before, after, beforeEvent: args.beforeEvent, afterEvent: args.afterEvent }, derivation: 'after - before' }));
  return { observations: { read } };
}

// 搜索并读取匹配标题的技能名数组（排序）。
export async function readSkillNames(ctx, args = {}) {
  const { query, exactTitle } = args;
  const conn = await connectSkills(ctx);
  try {
    const { frame, page } = conn;
    const rec = ctx.recorder;
    const act = await rec.action('搜索并读取技能名', 'type-search', { query }, async () => {
      const box = frame.locator('input[type="search"],input[placeholder*="搜索"],input').first();
      await box.click();
      await box.fill('');
      await box.type(query, { delay: 40 });
      await page.waitForTimeout(1800);
    });
    const read = await rec.read('匹配技能名数组', 'skill-name-list', { channel: 'dom', scope: '技能页/结果列表', locator: 'section.panel [data-slot="card"]' }, async () => {
      const titles = await frame.evaluate(() => {
        const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
        return [...document.querySelectorAll('.card-title h3,[data-slot="card"] h3')].filter(vis).map((e) => (e.getAttribute('title') || e.innerText || '').trim());
      });
      const value = [...new Set(titles.filter((t) => !exactTitle || t === exactTitle))].sort();
      return { value, raw: { titles: [...new Set(titles)], value, exactTitle }, derivation: '结果卡片标题集合（排序）' };
    });
    return { action_refs: [act.event_id], observations: { read } };
  } finally { await conn.close(); }
}
