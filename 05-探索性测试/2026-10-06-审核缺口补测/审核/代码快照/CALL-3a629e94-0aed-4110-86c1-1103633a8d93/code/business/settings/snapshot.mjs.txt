// G12-17: settings snapshot before/after all reversible setting operations.
import { withApp, sleep } from '../../automation/tpt.mjs';
import { openSettings, openSection, closeSettings, readSelectorValue, readSwitch, openShortcutDialog, closeShortcutDialog } from '../../automation/settings.mjs';

async function readSnapshot(page) {
  const snap = {};
  const safe = async (k, fn) => { try { snap[k] = await fn(); } catch (e) { snap[k] = null; } };
  await openSettings(page);
  await openSection(page, '常规');
  await safe('theme', () => page.evaluate(() => {
    const d = [...document.querySelectorAll('[role="dialog"]')].find((e) => e.offsetWidth && /常规/.test(e.innerText));
    const cubes = [...d.querySelectorAll('button[aria-pressed]')].filter((b) => /浅色|深色|跟随系统/.test(b.innerText));
    const sel = cubes.find((b) => b.getAttribute('aria-pressed') === 'true');
    return sel ? sel.innerText.trim() : null;
  }));
  await safe('language', () => readSelectorValue(page, '语言'));
  await safe('font', () => page.evaluate(() => {
    const d = [...document.querySelectorAll('[role="dialog"]')].find((e) => e.offsetWidth && /常规/.test(e.innerText));
    const m = d && d.innerText.match(/(\d+)\s*px/);
    return m ? Number(m[1]) : null;
  }));
  await safe('permission', () => readSelectorValue(page, '权限'));
  await safe('workSteps', () => readSelectorValue(page, '工作步骤展示'));
  await safe('usage', () => readSelectorValue(page, '性能与用量'));
  await safe('link', () => readSelectorValue(page, '网页链接默认打开方式'));
  await safe('codeTools', () => readSwitch(page, '代码工作工具'));
  await safe('busy', () => readSelectorValue(page, '繁忙时的发送行为'));

  await openSection(page, '记忆与进化');
  await safe('memory', () => page.evaluate(() => {
    const d = [...document.querySelectorAll('[role="dialog"]')].find((e) => e.offsetWidth);
    const cbs = [...d.querySelectorAll('input[type="checkbox"]')];
    return cbs[0] ? cbs[0].checked : null;
  }));
  await safe('evolution', () => page.evaluate(() => {
    const d = [...document.querySelectorAll('[role="dialog"]')].find((e) => e.offsetWidth);
    const cbs = [...d.querySelectorAll('input[type="checkbox"]')];
    return cbs[1] ? cbs[1].checked : null;
  }));

  await openSection(page, '实验性功能');
  await safe('experimental', () => page.evaluate(() => {
    const d = [...document.querySelectorAll('[role="dialog"]')].find((e) => e.offsetWidth);
    const sw = d && d.querySelector('input[type="checkbox"],[role="switch"]');
    if (!sw) return null;
    return sw.tagName === 'INPUT' ? sw.checked : sw.getAttribute('aria-checked') === 'true';
  }));
  await openSection(page, '开发者模式');
  await safe('developer', () => page.evaluate(() => {
    const d = [...document.querySelectorAll('[role="dialog"]')].find((e) => e.offsetWidth);
    const sw = d && d.querySelector('input[type="checkbox"],[role="switch"]');
    if (!sw) return null;
    return sw.tagName === 'INPUT' ? sw.checked : sw.getAttribute('aria-checked') === 'true';
  }));

  await openSection(page, '常规');
  await safe('shortcut.new', async () => {
    await openShortcutDialog(page);
    const v = await page.evaluate(() => {
      const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
      const li = [...document.querySelectorAll('li')].find((x) => norm(x.innerText).startsWith('新会话'));
      return li ? [...li.querySelectorAll('kbd')].map((k) => norm(k.innerText)).filter((x) => x && x !== '+').join('+') : null;
    });
    await closeShortcutDialog(page);
    return v;
  });
  await safe('shortcut.search', async () => {
    await openShortcutDialog(page);
    const v = await page.evaluate(() => {
      const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
      const li = [...document.querySelectorAll('li')].find((x) => norm(x.innerText).startsWith('搜索会话'));
      return li ? [...li.querySelectorAll('kbd')].map((k) => norm(k.innerText)).filter((x) => x && x !== '+').join('+') : null;
    });
    await closeShortcutDialog(page);
    return v;
  });
  await closeSettings(page);
  return snap;
}

export async function settingsSnapshot(ctx, args) {
  return withApp(ctx, async (page) => {
    const { recorder } = ctx;
    await closeSettings(page);
    const read = await recorder.read('本轮可逆设置规范化快照', 'settings.snapshot', {
      channel: 'derived', scope: '设置各分类字段', locator: 'settings sections + shortcut dialog',
    }, async () => {
      const s = await readSnapshot(page);
      const missing = Object.entries(s).filter(([, v]) => v === null).map(([k]) => k);
      return { value: s, raw: { missing, fields: Object.keys(s) }, derivation: 'named settings fields read from each section' };
    });
    return { phase: args.phase ?? 'current', read: read.event_id, value: read.value };
  });
}
