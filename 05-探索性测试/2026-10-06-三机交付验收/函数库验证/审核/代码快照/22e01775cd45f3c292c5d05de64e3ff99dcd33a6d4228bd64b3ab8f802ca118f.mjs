import { parseBoolean, readComposerRequest } from '../../automation/identity.mjs';
// 业务函数层：专家导入与查看。
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { connectExperts, EXPERT_SEL, cardByTitle } from '../../automation/experts.mjs';
import { connect } from '../../automation/session.mjs';
import { SEL, waitTerminal } from '../../automation/conversation.mjs';

// 读取专家导入弹窗的目录(webkitdirectory) input 数量。
export async function readImportDialog(ctx) {
  const conn = await connectExperts(ctx);
  try {
    const { frame, page } = conn;
    const rec = ctx.recorder;
    const act = await rec.action('打开导入专家弹窗', 'click', null, async () => {
      if (!(await frame.locator(EXPERT_SEL.dialog).count())) {
        await frame.getByRole('button', { name: '导入专家' }).click();
      }
      await page.waitForTimeout(1200);
    });
    const inputs = await rec.read('专家导入弹窗目录input数量', 'expert-import-dir-inputs', { channel: 'dom', scope: '专家页/导入本地专家弹窗', locator: EXPERT_SEL.dirInput }, async () => {
      const dirCount = await frame.locator(EXPERT_SEL.dirInput).count();
      const zipCount = await frame.locator(EXPERT_SEL.zipInput).count();
      const dialogText = (await frame.locator(EXPERT_SEL.dialog).first().innerText()).replace(/\s+/g, ' ').trim();
      return { value: dirCount, raw: { dirCount, zipCount, dialogText } };
    });
    await frame.locator(EXPERT_SEL.dialog).getByRole('button', { name: '取消' }).click();
    return { action_refs: [act.event_id], observations: { inputs } };
  } finally { await conn.close(); }
}

// 提交一个专家目录导入；onConflict='副本'|'覆盖'。返回卡片存在状态与冲突弹窗文本。
export async function importDirectory(ctx, args = {}) {
  const { dirPath, displayName, onConflict = null } = args;
  if (!dirPath) throw new Error('dirPath 必填');
  const conn = await connectExperts(ctx);
  try {
    const { frame, page } = conn;
    const rec = ctx.recorder;
    const actionRefs = [];
    const openAct = await rec.action('打开导入专家弹窗', 'click', null, async () => {
      if (!(await frame.locator(EXPERT_SEL.dialog).count())) {
        await frame.getByRole('button', { name: '导入专家' }).click();
      }
      await page.waitForTimeout(1200);
    });
    actionRefs.push(openAct.event_id);
    const submitAct = await rec.action('提交专家目录导入', 'setInputFiles-and-submit', { dirPath, onConflict }, async () => {
      await frame.locator(EXPERT_SEL.dirInput).first().setInputFiles(dirPath);
      await page.waitForTimeout(1000);
      await frame.locator(EXPERT_SEL.dialog).locator('button', { hasText: '提交' }).last().click();
      await page.waitForTimeout(1500);
      if (onConflict) {
        const opt = frame.locator(EXPERT_SEL.dialog).getByText(onConflict, { exact: false }).first();
        if (await opt.count()) { await opt.click(); await page.waitForTimeout(1200); }
      }
    });
    actionRefs.push(submitAct.event_id);
    const conflict = await rec.read('同名冲突弹窗', 'expert-conflict-dialog', { channel: 'dom', scope: '专家页/导入冲突弹窗', locator: EXPERT_SEL.dialog }, async () => {
      const n = await frame.locator(EXPERT_SEL.dialog).count();
      const text = n ? (await frame.locator(EXPERT_SEL.dialog).first().innerText()).replace(/\s+/g, ' ').trim() : null;
      const hasOverwrite = text ? text.includes('覆盖') : false;
      const hasCopy = text ? text.includes('副本') : false;
      return { value: { hasOverwrite, hasCopy }, raw: { dialogCount: n, text } };
    });
    await frame.locator(EXPERT_SEL.dialog).first().waitFor({ state: 'detached', timeout: 8000 });
    await page.waitForTimeout(1000);
    const card = await rec.read('本轮专家卡存在', 'expert-card-present', { channel: 'dom', scope: '专家页/我的专家卡片', locator: EXPERT_SEL.card }, async () => {
      const c = displayName ? cardByTitle(frame, displayName) : frame.locator(EXPERT_SEL.card);
      const n = await c.count();
      const visible = n ? await c.first().isVisible() : false;
      return { value: n > 0 && visible, raw: { count: n, visible }, derivation: 'count>0 && visible' };
    });
    return { action_refs: actionRefs, observations: { conflict, card } };
  } finally { await conn.close(); }
}

// 读取本轮专家卡片：标题、版本、来源、运行位置，以及是否存在内部 name 标记。
export async function readCard(ctx, args = {}) {
  const { displayName, internalName } = args;
  const conn = await connectExperts(ctx);
  try {
    const { frame } = conn;
    const rec = ctx.recorder;
    const card = cardByTitle(frame, displayName);
    const title = await rec.read('本轮专家标题', 'expert-card-title', { channel: 'dom', scope: '专家页/我的专家卡片', locator: EXPERT_SEL.cardTitle }, async () => {
      const value = (await card.locator(EXPERT_SEL.cardTitle).first().innerText()).trim();
      return { value, raw: { title: value } };
    });
    const meta = await rec.read('本轮专家名称与版本', 'expert-card-meta', { channel: 'dom', scope: '专家页/我的专家卡片', locator: EXPERT_SEL.card }, async () => {
      const value = (await card.locator(EXPERT_SEL.cardTitle).first().innerText()).trim();
      const text = (await card.innerText()).replace(/\s+/g, ' ').trim();
      const version = (/v([0-9][0-9.]*)/.exec(text) || [])[1] || null;
      return { value: [value, version], raw: { title: value, version, text } };
    });
    const fields = await rec.read('本轮专家来源与运行类型', 'expert-card-fields', { channel: 'dom', scope: '专家页/我的专家卡片', locator: EXPERT_SEL.card }, async () => {
      const text = (await card.innerText()).replace(/\s+/g, ' ').trim();
      const source = /我创建的/.test(text) ? '我创建的' : (/公共\s*Agent/.test(text) ? '公共 Agent' : null);
      const location = /本地运行/.test(text) ? '本地运行' : (/云端运行/.test(text) ? '云端运行' : null);
      return { value: [source, location], raw: { text, source, location } };
    });
    const description = await rec.read('本轮专家简介', 'expert-card-description', { channel: 'dom', scope: '专家页/我的专家卡片', locator: EXPERT_SEL.card }, async () => {
      const text = (await card.innerText()).replace(/\s+/g, ' ').trim();
      const titleText = (await card.locator(EXPERT_SEL.cardTitle).first().innerText()).trim();
      let desc = text.slice(text.indexOf(titleText) + titleText.length).trim();
      desc = desc.replace(/\s*来源\s.*$/, '').trim();
      desc = desc.replace(/\s*(来源|v[0-9].*|使用).*$/, '').trim();
      desc = desc.replace(/\s*(回归验证|Regression|标签).*$/, '').trim();
      return { value: desc || null, raw: { text, desc } };
    });
    const exists = await rec.read('按内部name核对存在', 'expert-card-internal', { channel: 'dom', scope: '专家页/我的专家卡片', locator: EXPERT_SEL.card }, async () => {
      const n = await card.count();
      const attrHit = internalName ? await frame.evaluate((nm) => document.body.innerHTML.includes(nm), internalName) : false;
      const raw = { count: n, internalNameInDom: attrHit };
      return { value: n > 0, raw, derivation: 'count > 0' };
    });
    return { observations: { title, meta, fields, description, exists } };
  } finally { await conn.close(); }
}

// 打开专家详情并读取提示词正文、可编辑元素数、推荐问题、打开文件夹按钮数。
export async function readDetail(ctx, args = {}) {
  const { displayName } = args;
  const conn = await connectExperts(ctx);
  try {
    const { frame, page } = conn;
    const rec = ctx.recorder;
    const card = cardByTitle(frame, displayName);
    const act = await rec.action('打开专家详情', 'click-card', null, async () => {
      await card.locator('div[class*="cursor-pointer"]').first().click();
      await page.waitForTimeout(1800);
    });
    const prompt = await rec.read('本轮专家提示词正文', 'expert-prompt-body', { channel: 'dom', scope: '专家页/专家详情/提示词', locator: '[data-slot="markdown"]' }, async () => {
      const text = await frame.locator('[data-slot="markdown"]').first().innerText();
      return { value: text, raw: { length: text.length } };
    });
    const endVisible = await rec.read('末尾标记可见', 'expert-prompt-end', { channel: 'dom', scope: '专家页/专家详情/提示词', locator: '[data-slot="markdown"]' }, async () => {
      const el = frame.locator('[data-slot="markdown"]').first();
      const text = await el.innerText();
      const visible = await el.isVisible();
      const hasEnd = args.endMarker ? text.includes(args.endMarker) : null;
      return { value: hasEnd && visible, raw: { hasEnd, visible }, derivation: 'hasEnd && visible' };
    });
    const editable = await rec.read('专家提示词面板可编辑元素数量', 'expert-prompt-editable', { channel: 'dom', scope: '专家页/专家详情', locator: 'textarea,[contenteditable="true"]' }, async () => {
      const n = await frame.evaluate(() => {
        const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
        return [...document.querySelectorAll('textarea,[contenteditable="true"]')].filter(vis).length;
      });
      return { value: n, raw: { count: n } };
    });
    const quick = await rec.read('专家推荐问题', 'expert-quick-prompts', { channel: 'dom', scope: '专家页/专家详情', locator: 'button' }, async () => {
      const texts = (await frame.locator('button').allInnerTexts()).map((t) => t.trim()).filter((t) => t.startsWith('请执行') && t.endsWith('。'));
      return { value: texts, raw: { texts } };
    });
    const folder = await rec.read('详情目录入口数量', 'expert-folder-buttons', { channel: 'dom', scope: '专家页/专家详情', locator: 'button' }, async () => {
      const n = await frame.evaluate(() => {
        const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
        return [...document.querySelectorAll('button')].filter(vis).filter((b) => /打开文件夹|打开本地目录/.test((b.innerText || '') + (b.getAttribute('aria-label') || ''))).length;
      });
      return { value: n, raw: { count: n } };
    });
    return { action_refs: [act.event_id], observations: { prompt, endVisible, editable, quick, folder } };
  } finally { await conn.close(); }
}

// 读取本机已安装文件的 SHA256（channel=file，离线读取）。
export async function readInstalledFileHashes(ctx, args = {}) {  const { paths } = args;
  const rec = ctx.recorder;
  const out = {};
  for (const p of paths) {
    const digest = fs.existsSync(p) ? createHash('sha256').update(fs.readFileSync(p)).digest('hex') : null;
    out[p] = await rec.read('已安装文件哈希', p, { channel: 'file', scope: '本机已安装专家目录', locator: p }, async () => ({ value: digest, raw: { path: p, exists: fs.existsSync(p), sha256: digest } }));
  }
  return { observations: { hashes: out } };
}

// 读取本机已安装文件内容（channel=file）。
export async function readFileContent(ctx, args = {}) {
  const fs = await import('node:fs');
  const p = args.path;
  let text = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
  if (text != null && args.trim) text = text.trim();
  const read = await ctx.recorder.read('安装文件内容', p, { channel: 'file', scope: '本机已安装专家目录', locator: p }, async () => ({ value: text, raw: { path: p, exists: fs.existsSync(p), length: text ? text.length : 0 } }));
  return { observations: { read } };
}

// 读取文件是否存在（channel=file）。
export async function readFileExists(ctx, args = {}) {
  const fs = await import('node:fs');
  const p = args.path;
  const exists = fs.existsSync(p) && fs.statSync(p).isFile();
  const read = await ctx.recorder.read('文件存在状态', p, { channel: 'file', scope: '本机已安装专家目录', locator: p }, async () => ({ value: exists, raw: { path: p, exists }, derivation: 'existsSync && isFile' }));
  return { observations: { read } };
}

// 读取安装 metadata.json 的指定字段。
export async function readMetadataField(ctx, args = {}) {
  const fs = await import('node:fs');
  const p = args.path;
  let value = null; let raw = { path: p, exists: fs.existsSync(p) };
  if (fs.existsSync(p)) {
    try { const obj = JSON.parse(fs.readFileSync(p, 'utf8')); value = args.field.split('.').reduce((o, k) => (o == null ? null : o[k]), obj); raw.value = value; }
    catch (e) { raw.parseError = String(e.message); }
  }
  const read = await ctx.recorder.read('安装metadata字段', p, { channel: 'file', scope: '本机已安装专家目录', locator: p }, async () => ({ value, raw }));
  return { observations: { read } };
}

// 打开专家列表读取本轮对象的坏配置校验反馈。
export async function readValidationFeedback(ctx, args = {}) {
  const conn = await connectExperts(ctx);
  try {
    const { frame, page } = conn;
    const rec = ctx.recorder;
    const act = await rec.action('打开专家列表观察校验', 'click-nav', null, async () => { await page.waitForTimeout(1000); });
    const feedback = await rec.read('坏JSON校验提示', 'expert-validation-feedback', { channel: 'dom', scope: '专家页/本轮卡片或提示', locator: 'section, [role="alert"], [class*="toast"]' }, async () => {
      const info = await frame.evaluate(() => {
        const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
        const alerts = [...document.querySelectorAll('[role="alert"],[class*="toast"],[class*="error"],[class*="invalid"]')].filter(vis).map((e) => (e.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
        const body = (document.body.innerText || '').replace(/\s+/g, ' ');
        return { alerts, bodyHead: body.slice(0, 500) };
      });
      const joined = (info.alerts.join(' | ') + ' ' + info.bodyHead).trim();
      const value = /(JSON|metadata|格式|解析|无效|invalid|校验|非法)/i.test(joined) && /(错误|失败|无效|invalid|解析|格式|不合法|失败)/.test(joined);
      return { value, raw: info, derivation: '提示含格式/校验错误' };
    });
    return { action_refs: [act.event_id], observations: { feedback } };
  } finally { await conn.close(); }
}

// 点击“创建专家”，读取是否进入明确的创建专家模式（预置指令）。
export async function startCreate(ctx, args = {}) {
  const { presetPattern = 'create-expert|创建专家' } = args;
  const conn = await connectExperts(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    const act = await rec.action('点击创建专家入口', 'click', null, async () => {
      const frame = page.frames().find((f) => f.url().includes(EXPERT_SEL.frameUrlPart));
      let clicked = false;
      for (const lbl of ['新建专家', '创建专家']) {
        const b = frame.getByText(lbl, { exact: true }).first();
        if (await b.count()) { await b.click(); clicked = true; break; }
      }
      if (!clicked) throw new Error('create-expert entry not found');
      await page.waitForTimeout(2500);
    });
    const mode = await rec.read('创建专家模式标识', 'expert-create-mode', { channel: 'dom', scope: 'composer 输入区', locator: SEL.composer }, async () => {
      const t = await page.locator(SEL.composer).first().innerText();
      const value = new RegExp(presetPattern).test(t);
      return { value, raw: { composer: t, presetPattern }, derivation: 'composer 含预置创建专家指令/标签' };
    });
    return { action_refs: [act.event_id], observations: { mode } };
  } finally { await conn.close(); }
}

// 打开“导入专家” dialog，读取其中是否存在 webkitdirectory 目录选择输入。
export async function readImportDialogFolderInput(ctx) {
  const conn = await connectExperts(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    const act = await rec.action('打开导入专家 dialog', 'click', null, async () => {
      const frame = page.frames().find((f) => f.url().includes(EXPERT_SEL.frameUrlPart));
      await frame.getByText('导入专家', { exact: true }).first().click();
      await page.waitForTimeout(1500);
    });
    const read = await rec.read('导入dialog目录选择输入存在', 'expert-import-dir-input', { channel: 'dom', scope: '导入专家 dialog', locator: 'input[webkitdirectory]' }, async () => {
      const info = await conn.frame.evaluate(() => [...document.querySelectorAll('input[webkitdirectory],input[type="file"]')].map((e) => ({ webkit: e.hasAttribute('webkitdirectory'), type: e.type, inDialog: !!e.closest('[role="dialog"],[class*="dialog"],[class*="Dialog"]') })));
      const value = info.some((i) => i.webkit);
      return { value, raw: { inputs: info }, derivation: '存在 webkitdirectory 文件输入（含隐藏）' };
    });
    await page.keyboard.press('Escape');
    return { action_refs: [act.event_id], observations: { read } };
  } finally { await conn.close(); }
}

// 分别读取若干完整绝对路径（channel=file）。
export async function readPaths(ctx, args = {}) {
  const out = {};
  for (const p of args.paths) {
    out[p] = await ctx.recorder.read('文件完整路径', p, { channel: 'file', scope: '本轮安装/源包', locator: p }, async () => ({ value: p, raw: { path: p } }));
  }
  return { observations: { paths: out } };
}

// 从专家详情进入“去对话编辑”编辑会话，读取引用/编辑模式/左侧导航。
export async function startEdit(ctx, args = {}) {
  const { displayName, internalName } = args;
  const conn = await connect(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    const newAct = await rec.action('编辑前新建任务', 'click', null, async () => { await page.locator(SEL.newTask).first().click(); await page.waitForTimeout(1500); });
    const editAct = await rec.action('进入专家对话编辑', 'click', { displayName }, async () => {
      await page.locator('button[aria-label="专家"]').first().click();
      await page.waitForTimeout(1500);
      const frame = page.frames().find((f) => f.url().includes(EXPERT_SEL.frameUrlPart));
      if ((await frame.locator('div[class*="_card_"]').count()) === 0) { await page.waitForTimeout(1000); }
      const card = cardByTitle(frame, displayName);
      await card.locator('div[class*="cursor-pointer"]').first().click();
      await page.waitForTimeout(1500);
      await frame.getByText('去对话编辑', { exact: true }).first().click();
      await page.waitForTimeout(2500);
    });
    const reference = await rec.read('专家编辑引用身份', 'expert-edit-composer', { channel: 'dom', scope: 'composer 输入区', locator: SEL.composer }, async () => {
      const text = await page.locator(SEL.composer).first().innerText();
      const value = internalName ? text.includes(internalName) : /修改专家|编辑专家/.test(text);
      return { value, raw: { text, internalName }, derivation: 'composer 含本轮专家内部名' };
    });
    const mode = await rec.read('专家编辑模式', 'expert-edit-mode', { channel: 'dom', scope: 'composer 输入区', locator: SEL.composer }, async () => {
      const text = await page.locator(SEL.composer).first().innerText();
      const value = /(修改专家|编辑专家|优化)/.test(text) && (internalName ? text.includes(internalName) : true);
      return { value, raw: { text }, derivation: 'composer 明确表示修改/编辑该专家' };
    });
    const nav = await rec.read('左侧导航可见', 'left-nav', { channel: 'dom', scope: '主界面左侧导航', locator: 'button[aria-label="新建任务"]' }, async () => {
      const v = await page.locator('button[aria-label="新建任务"]').first().isVisible();
      return { value: v, raw: { visible: v }, derivation: '新建任务按钮可见' };
    });
    return { action_refs: [newAct.event_id, editAct.event_id], observations: { reference, mode, nav } };
  } finally { await conn.close(); }
}

// 在编辑会话发送一条消息并等待终态，返回助手正文。
export async function editSend(ctx, args = {}) {
  const { text, timeoutMs = 150000 } = args;
  const conn = await connect(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    let preCount = 0;
    const act = await rec.action('编辑会话发送消息', 'type-and-send', { chars: text.length }, async () => {
      preCount = await page.locator(SEL.assistantBody).count();
      const c = page.locator(SEL.composer).first();
      await c.click();
      await page.keyboard.press('End');
      await page.keyboard.insertText(text);
      await page.waitForTimeout(400);
      await page.locator(SEL.send).first().click();
    });
    let wait;
    try { wait = await waitTerminal(page, { timeoutMs, minBubbles: preCount + 1 }); }
    catch (e) { wait = { error: String(e.message), timed_out: true }; }
    const assistant = await rec.read('编辑会话助手摘要正文', 'last-assistant-bubble', { channel: 'dom', scope: '对话 助手气泡', locator: SEL.assistantBody }, async () => {
      const bubbles = page.locator(SEL.assistantBody);
      const n = await bubbles.count();
      const last = n ? (await bubbles.nth(n - 1).innerText()).trim() : null;
      return { value: last, raw: { count: n, last } };
    });
    return { action_refs: [act.event_id], observations: { wait, assistant } };
  } finally { await conn.close(); }
}

// 列出本机已安装专家目录名。
export async function listAgentDirs(ctx, args = {}) {  const base = args.base || ctx.environment.agents_root;
  const names = fs.existsSync(base) ? fs.readdirSync(base).filter((n) => n.startsWith('fast-assert-expert')).sort() : [];
  const read = await ctx.recorder.read('已安装专家目录列表', base, { channel: 'file', scope: '本机已安装专家目录', locator: base }, async () => ({ value: names, raw: { base, names } }));
  return { observations: { dirs: read } };
}

// 读取指定内部名对应的完整安装路径（channel=file）。
export async function readInstallPaths(ctx, args = {}) {
  const base = args.base || ctx.environment.agents_root;
  const out = {};
  for (const n of args.internalNames) {
    const p = `${base}/${n}`;
    out[n] = await ctx.recorder.read('已安装专家目录路径', p, { channel: 'file', scope: '本机已安装专家目录', locator: p }, async () => ({ value: p, raw: { path: p, exists: fs.existsSync(p) } }));
  }
  return { observations: { paths: out } };
}

// 读取安装目录内 agent.md 与 metadata.json 是否均存在。
export async function readAgentDirFiles(ctx, args = {}) {
  const base = args.base || ctx.environment.agents_root;
  const dir = `${base}/${args.internalName}`;
  const agent = fs.existsSync(`${dir}/agent.md`);
  const meta = fs.existsSync(`${dir}/metadata.json`);
  const read = await ctx.recorder.read('副本目录文件存在状态', dir, { channel: 'file', scope: '本机已安装专家目录', locator: dir }, async () => ({ value: agent && meta, raw: { dir, agentMd: agent, metadataJson: meta }, derivation: 'agentMd && metadataJson' }));
  return { observations: { files: read } };
}

// 提交专家目录导入并读取列表数量(前/后)与拒绝反馈；kind 决定反馈判据。
export async function submitAndReadFeedback(ctx, args = {}) {
  const { dirPath, kind } = args;
  const conn = await connectExperts(ctx);
  try {
    const { frame, page } = conn;
    const rec = ctx.recorder;
    const openAct = await rec.action('重新打开导入专家弹窗', 'reopen', null, async () => {
      if (await frame.locator(EXPERT_SEL.dialog).count()) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(800);
      }
      if (!(await frame.locator(EXPERT_SEL.dialog).count())) {
        await frame.getByRole('button', { name: '导入专家' }).click();
      }
      await page.waitForTimeout(1200);
    });
    const countBefore = await rec.read('专家列表数量', 'expert-list-count', { channel: 'dom', scope: '专家页/我的专家卡片', locator: EXPERT_SEL.card }, async () => {
      const n = await frame.locator(EXPERT_SEL.card).count();
      return { value: n, raw: { count: n } };
    });
    const submitAct = await rec.action('提交专家目录导入', 'setInputFiles-and-submit', { dirPath, kind }, async () => {
      await frame.locator(EXPERT_SEL.dirInput).first().setInputFiles(dirPath);
      await page.waitForTimeout(1000);
      await frame.locator(EXPERT_SEL.dialog).locator('button', { hasText: '提交' }).last().click();
      await page.waitForTimeout(2500);
    });
    const feedback = await rec.read('提交反馈', 'expert-submit-feedback', { channel: 'dom', scope: '专家页/导入弹窗或提示', locator: '[role="dialog"],[role="alert"],[class*="toast"]' }, async () => {
      const dialogs = frame.locator('[role="dialog"]');
      const n = await dialogs.count();
      const full = n ? (await dialogs.first().innerText()).replace(/\s+/g, ' ').trim() : null;
      // 仅取校验提示句（排除弹窗内的静态说明文本）。
      let msg = null;
      if (full) {
        const idx = full.indexOf('所选内容');
        if (idx >= 0) { msg = full.slice(idx); if (msg.endsWith('提交')) msg = msg.slice(0, -2).trim(); else if (msg.endsWith('取消')) msg = msg.slice(0, -2).trim(); }
        else { const i2 = full.indexOf('不是有效的专家包'); msg = i2 >= 0 ? full.slice(i2 - 6) : null; }
      }
      let value = null;
      if (msg) {
        if (kind === 'missing-agent') value = /agent\.md/i.test(msg) && /(需要包含|缺失|缺少|未找到|不存在|必填|required)/.test(msg);
        else if (kind === 'bad-json') value = /(metadata\.json|JSON)/i.test(msg) && /(解析|格式校验|格式错误|无效|invalid|parse|JSON 错误|JSON错误)/i.test(msg);
        else value = false;
      }
      return { value, raw: { dialogCount: n, message: msg, fullText: full, predicate: kind }, derivation: `predicate=${kind}` };
    });
    const countAfter = await rec.read('专家列表数量', 'expert-list-count', { channel: 'dom', scope: '专家页/我的专家卡片', locator: EXPERT_SEL.card }, async () => {
      const n = await frame.locator(EXPERT_SEL.card).count();
      return { value: n, raw: { count: n } };
    });
    return { action_refs: [openAct.event_id, submitAct.event_id], observations: { countBefore, feedback, countAfter } };
  } finally { await conn.close(); }
}

// 提交专家目录导入并读取同名冲突弹窗（不选择处理方式）。
export async function submitImport(ctx, args = {}) {
  const { dirPath } = args;
  const conn = await connectExperts(ctx);
  try {
    const { frame, page } = conn;
    const rec = ctx.recorder;
    const act = await rec.action('提交专家目录导入', 'setInputFiles-and-submit', { dirPath }, async () => {
      if (!(await frame.locator(EXPERT_SEL.dialog).count())) {
        await frame.getByRole('button', { name: '导入专家' }).click();
        await page.waitForTimeout(1200);
      }
      await frame.locator(EXPERT_SEL.dirInput).first().setInputFiles(dirPath);
      await page.waitForTimeout(1000);
      await frame.locator(EXPERT_SEL.dialog).locator('button', { hasText: '提交' }).last().click();
      await page.waitForTimeout(1800);
    });
    const conflict = await rec.read('同名冲突弹窗', 'expert-conflict-dialog', { channel: 'dom', scope: '专家页/导入冲突弹窗', locator: EXPERT_SEL.dialog }, async () => {
      const n = await frame.locator(EXPERT_SEL.dialog).count();
      const text = n ? (await frame.locator(EXPERT_SEL.dialog).first().innerText()).replace(/\s+/g, ' ').trim() : null;
      const hasOverwrite = text ? text.includes('覆盖') : false;
      const hasCopy = text ? text.includes('副本') : false;
      return { value: { hasOverwrite, hasCopy }, raw: { dialogCount: n, text } };
    });
    const both = await rec.read('同名冲突覆盖与副本并存', 'expert-conflict-both', { channel: 'dom', scope: '专家页/导入冲突弹窗', locator: EXPERT_SEL.dialog }, async () => {
      const n = await frame.locator(EXPERT_SEL.dialog).count();
      const text = n ? (await frame.locator(EXPERT_SEL.dialog).first().innerText()).replace(/\s+/g, ' ').trim() : null;
      const hasOverwrite = text ? text.includes('覆盖') : false;
      const hasCopy = text ? text.includes('副本') : false;
      return { value: hasOverwrite && hasCopy, raw: { dialogCount: n, hasOverwrite, hasCopy, text }, derivation: 'hasOverwrite && hasCopy' };
    });
    return { action_refs: [act.event_id], observations: { conflict, both } };
  } finally { await conn.close(); }
}

// 在同名冲突弹窗中选择 覆盖/副本。
export async function chooseConflict(ctx, args = {}) {
  const { option } = args;
  const conn = await connectExperts(ctx);
  try {
    const { frame, page } = conn;
    const rec = ctx.recorder;
    const act = await rec.action('处理同名冲突', 'click-option', { option }, async () => {
      await frame.locator(EXPERT_SEL.dialog).getByRole('button', { name: option, exact: true }).first().click();
      await page.waitForTimeout(2500);
    });
    return { action_refs: [act.event_id], observations: {} };
  } finally { await conn.close(); }
}

// 新建会话后经专家卡片/详情 使用 引入专家引用；返回改前/改后会话身份与引用名。
export async function useExpert(ctx, args = {}) {
  const { displayName } = args;
  const conn = await connect(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    const readSession = async () => page.locator('[data-conversation-session]').first().getAttribute('data-conversation-session');
    const rows = page.locator('[data-row-key^="session:"]');
    const mount = (await rows.filter({ hasText: '请只输出一个代码块' }).first().count()) ? rows.filter({ hasText: '请只输出一个代码块' }).first() : rows.first();
    if (await mount.count()) { await mount.click(); await page.waitForTimeout(1500); }
    const sessionBefore = await rec.read('专家调用会话身份(前)', 'session', { channel: 'dom', scope: '主界面会话容器', locator: '[data-conversation-session]' }, async () => { const v = await readSession(); return { value: v, raw: { value: v } }; });
    const newAct = await rec.action('专家调用前新建任务', 'click', null, async () => { await page.locator(SEL.newTask).first().click(); await page.waitForTimeout(1500); });
    const useAct = await rec.action('使用本轮专家', 'click-use', { displayName }, async () => {
      await page.locator('button[aria-label="专家"]').first().click();
      await page.waitForTimeout(1500);
      const frame = page.frames().find((f) => f.url().includes(EXPERT_SEL.frameUrlPart));
      const card = cardByTitle(frame, displayName);
      await card.scrollIntoViewIfNeeded();
      await card.getByText('使用', { exact: true }).first().click();
      await page.waitForTimeout(2000);
    });
    const reference = await rec.read('新会话专家引用', 'composer-expert-reference', { channel: 'dom', scope: 'composer 输入区', locator: SEL.composer }, async () => {
      const text = await page.locator(SEL.composer).first().innerText();
      const cleaned = text.replace(/^\s*[\/@]\s*/, '').trim();
      const m = /^(.+?)(\n|$)/.exec(cleaned);
      return { value: m ? m[1].trim() : null, raw: { composerText: text } };
    });
    const sessionAfter = await rec.read('专家调用会话身份(后)', 'session', { channel: 'dom', scope: '主界面会话容器', locator: '[data-conversation-session]' }, async () => { const v = await readSession(); return { value: v, raw: { value: v } }; });
    return { action_refs: [newAct.event_id, useAct.event_id], observations: { sessionBefore, sessionAfter, reference } };
  } finally { await conn.close(); }
}

// 发送专家固定回复规则请求并读取终态；返回助手正文与用户请求是否含输出串。
export async function useExpertRequest(ctx, args = {}) {
  const { text = '请执行你的本轮回归固定回复规则', timeoutMs = 120000, answer } = args;
  const conn = await connect(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    let preCount = 0, submittedRequest;
    const act = await rec.action('发送专家固定回复请求', 'type-and-send', { chars: text.length }, async () => {
      preCount = await page.locator(SEL.assistantBody).count();
      const c = page.locator(SEL.composer).first();
      await c.click();
      await page.keyboard.press('End');
      await page.keyboard.insertText(text);
      await page.waitForTimeout(400);
      submittedRequest = await readComposerRequest(page, SEL.composer);
      await page.locator(SEL.send).first().click();
    });
    let wait;
    try { wait = await waitTerminal(page, { timeoutMs, minBubbles: preCount + 1 }); }
    catch (e) { wait = { error: String(e.message), timed_out: true }; }
    const assistant = await rec.read('专家助手最终正文', 'last-assistant-bubble', { channel: 'dom', scope: '对话 助手气泡', locator: SEL.assistantBody }, async () => {
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

// 读取本轮专家调用轨迹中的专家正文注入记录（限定轨迹表格）。
export async function readTraceExpertContent(ctx,args){
 const needle=args.internalName||args.contains;if(!needle)throw Error('internalName or contains required');const c=await connect(ctx);try{
 const action=await ctx.recorder.action('打开专家调用轨迹','click',null,async()=>{await c.page.getByText('轨迹',{exact:true}).first().click();await c.page.waitForTimeout(500);});
 const resource=await ctx.recorder.read('专家独立加载/工具读取记录',needle,{channel:'dom',scope:'当前session轨迹/context或工具read'},async()=>{
 const rows=c.page.locator('tr[data-trajectory-row-key]');const matches=[];
 for(const row of await rows.all()){const text=await row.innerText();if(text.includes(needle)&&(text.includes('<skill_content')||(/read/.test(text)&&text.includes('<content>'))))matches.push(text);}
 return {value:matches.length?matches.join('\n'):null,raw:{needle,matches}};
 });return {action_refs:[action.event_id],observations:{resource}};
 }finally{await c.close();}
}
