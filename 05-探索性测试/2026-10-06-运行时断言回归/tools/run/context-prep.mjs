import path from 'node:path';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { withApp, sleep, openSettings, openSettingsSection, root, fixtureRoot, runSuffix, environmentId } from './lib.mjs';

const require = createRequire(import.meta.url);
const { createRecorder } = require(path.join(root, 'tools', 'record.cjs'));

const log = createRecorder(root, { environment_id: environmentId, group: 'CTX' });

const readDom = (target, object_id, scope, fn) =>
  log.read(target, object_id, { channel: 'dom', scope, locator: scope }, fn);

await withApp(async (page) => {
  await openSettings(page);

  const vals = await page.evaluate(() => {
    const dlg = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth && /常规/.test(e.innerText));
    const q = c => dlg.querySelector('button[class*="' + c + '"]');
    const qa = c => [...dlg.querySelectorAll('button[class*="' + c + '"]')].map(b => b.innerText.trim());
    return {
      themeSel: (() => { const s = [...dlg.querySelectorAll('button[class*="sele"]')].find(b => /浅色|深色|跟随系统/.test(b.innerText)); return s ? s.innerText.trim() : null; })(),
      permission: q('oY77xG_selector')?.innerText.trim() ?? null,
      language: q('hVGvvW_selector')?.innerText.trim() ?? null,
      selector3: qa('_2XZxNq_selector'),
      busy: q('T1PP_q_selector')?.innerText.trim() ?? null,
    };
  });
  const themeSel = vals.themeSel;
  const rTheme = await readDom('设置外观当前选中项', 'settings.theme', '设置对话框/常规/外观', async () => ({ value: themeSel, raw: { selected: themeSel }, derivation: 'the selected themeCube button text' }));
  const language = vals.language;
  const rLang = await readDom('设置语言当前值', 'settings.language', '设置对话框/常规/语言', async () => ({ value: language }));
  const font = await page.evaluate(() => {
    const dlg = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth && /常规/.test(e.innerText));
    const m = dlg.innerText.match(/字号大小[\s\S]*?\n(\d{1,2})\s*\n?px/);
    return m ? Number(m[1]) : null;
  });
  const rFont = await readDom('设置字号当前数字值', 'settings.font', '设置对话框/常规/字号大小', async () => ({ value: font, raw: { text: String(font) }, derivation: 'parse integer before px' }));
  const permission = vals.permission;
  const rPerm = await readDom('设置默认权限当前值', 'settings.permission', '设置对话框/常规/权限', async () => ({ value: permission }));
  const workSteps = vals.selector3[0] ?? null;
  const rWs = await readDom('设置工作步骤展示当前值', 'settings.work_steps', '设置对话框/常规/工作步骤展示', async () => ({ value: workSteps }));
  const usage = vals.selector3[1] ?? null;
  const rUsage = await readDom('设置性能与用量当前值', 'settings.usage', '设置对话框/常规/性能与用量', async () => ({ value: usage }));
  const busy = vals.busy;
  const rBusy = await readDom('设置繁忙发送行为当前值', 'settings.busy', '设置对话框/常规/繁忙时的发送行为', async () => ({ value: busy }));
  const link = vals.selector3[2] ?? null;
  const rLink = await readDom('设置网页链接默认打开方式当前值', 'settings.link', '设置对话框/常规/网页链接默认打开方式', async () => ({ value: link }));

  const swEval = async (label) => page.evaluate((label) => {
    const dlg = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth);
    const switches = [...dlg.querySelectorAll('[role="switch"]')];
    for (const s of switches) {
      if (s.getAttribute('aria-label') === label) return { found: true, checked: s.getAttribute('aria-checked'), via: 'aria' };
    }
    for (const s of switches) {
      let e = s, txt = '';
      for (let i = 0; i < 6 && e; i++) { txt = e.innerText || ''; if (txt.includes(label)) break; e = e.parentElement; }
      if (txt.includes(label)) return { found: true, checked: s.getAttribute('aria-checked'), via: 'ancestor' };
    }
    return { found: false, labels: switches.map(s => s.getAttribute('aria-label')) };
  }, label);
  const sw = async (label, target, id) => {
    const r = await swEval(label);
    return readDom(target, id, '设置对话框', async () => ({ value: r.checked === 'true', raw: { aria_checked: r.checked, found: r.found, labels: r.labels || null }, derivation: "aria_checked === 'true'" }));
  };
  const rCodeTools = await sw('代码工作工具', '设置代码工作工具开关初值', 'settings.code_tools');

  // --- scene ---
  await openSettingsSection(page, '场景预设');
  const scene = await page.evaluate(() => {
    const dlg = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth && /场景预设/.test(e.innerText));
    const m = dlg.innerText.match(/(标准模式|PTC 模式|工厂模式)\n新任务默认/);
    return m ? m[1] : (dlg.innerText.includes('标准模式') ? '标准模式' : null);
  });
  const rScene = await readDom('场景预设新任务默认值', 'settings.scene', '设置对话框/场景预设', async () => ({ value: scene }));

  // --- memory section switches ---
  await openSettingsSection(page, '记忆与进化');
  const rMem = await sw('启用记忆', '启用记忆开关初值', 'settings.memory');
  const rEvo = await sw('启用沉淀', '启用沉淀开关初值', 'settings.evolution');

  // --- experimental section ---
  await openSettingsSection(page, '实验性功能');
  const expSwitches = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"]:not([hidden]) [role="switch"]')].map(e => ({ label: e.getAttribute('aria-label'), checked: e.getAttribute('aria-checked') })));
  const rExp = await sw('实验性功能', '实验性功能开关初值', 'settings.experimental');

  // --- developer section ---
  await openSettingsSection(page, '开发者模式');
  const devSwitches = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"]:not([hidden]) [role="switch"]')].map(e => ({ label: e.getAttribute('aria-label'), checked: e.getAttribute('aria-checked') })));
  const rDev = await sw('开发者模式', '开发者模式开关初值', 'settings.developer');

  const out = {
    theme: { value: themeSel, event: rTheme.event_id },
    language: { value: language, event: rLang.event_id },
    font: { value: font, event: rFont.event_id },
    permission: { value: permission, event: rPerm.event_id },
    work_steps: { value: workSteps, event: rWs.event_id },
    usage: { value: usage, event: rUsage.event_id },
    busy: { value: busy, event: rBusy.event_id },
    link: { value: link, event: rLink.event_id },
    code_tools: { value: rCodeTools.value, event: rCodeTools.event_id },
    scene: { value: scene, event: rScene.event_id },
    memory: { value: rMem.value, event: rMem.event_id },
    evolution: { value: rEvo.value, event: rEvo.event_id },
    experimental: { value: rExp.value, event: rExp.event_id },
    developer: { value: rDev.value, event: rDev.event_id },
    extra: { expSwitches, devSwitches },
  };
  const scratch = path.join(root, 'tools', 'run', 'scratch', 'context-reads.json');
  fs.writeFileSync(scratch, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(out, null, 2));
});
