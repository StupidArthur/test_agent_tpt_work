// G12-08/G12-09: new-session shortcut custom save/restore, and search shortcut runtime effect.
import { withApp, sleep, newTask } from '../../automation/tpt.mjs';
import { openSettings, openSection, closeSettings, openShortcutDialog, closeShortcutDialog } from '../../automation/settings.mjs';

function toPlaywrightKeys(combo) {
  return combo.replace(/\s+/g, '').replace(/Ctrl/gi, 'Control').replace(/Cmd/gi, 'Meta').replace(/⌘/g, 'Meta');
}

async function readBinding(page, label) {
  return page.evaluate((lab) => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const lis = [...document.querySelectorAll('li')].filter((li) => norm(li.innerText).startsWith(lab));
    const li = lis[0];
    if (!li) return null;
    const kbds = [...li.querySelectorAll('kbd')].map((k) => norm(k.innerText)).filter((x) => x && x !== '+').join('+');
    return kbds || null;
  }, label);
}

async function editBinding(page, label, keys) {
  const open = await page.evaluate((lab) => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const lis = [...document.querySelectorAll('li')].filter((li) => norm(li.innerText).startsWith(lab));
    const li = lis[0];
    if (!li) return false;
    const btn = li.querySelector('button[aria-label^="修改"]');
    if (!btn) return false;
    btn.click();
    return true;
  }, label);
  if (!open) throw new Error('shortcut row not found ' + label);
  await sleep(800);
  await page.evaluate((lab) => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const li = [...document.querySelectorAll('li')].find((x) => norm(x.innerText).startsWith(lab));
    const rec = li && li.querySelector('button[aria-label="按下快捷键"]');
    if (rec) rec.click();
  }, label);
  await sleep(400);
  await page.keyboard.press(keys);
  await sleep(1200);
}

export async function settingsShortcuts(ctx, args) {
  return withApp(ctx, async (page) => {
    const { recorder } = ctx;
    const out = {};
    await closeSettings(page);
    await openSettings(page);
    await openSection(page, '常规');
    await openShortcutDialog(page);

    const rNewInit = await recorder.read('新建快捷键初值', 'settings.shortcut.new.initial', {
      channel: 'dom', scope: '设置/快捷键dialog/新会话行', locator: 'li[class*=row]',
    }, async () => {
      const v = await readBinding(page, '新会话');
      return { value: v, raw: { binding: v } };
    });
    out.newInitial = rNewInit.value;

    const aChange = await recorder.action('修改新会话快捷键', 'click+keys', 'Ctrl+Alt+Shift+F9', async () => {
      await editBinding(page, '新会话', 'Control+Alt+Shift+F9');
    });
    const rAfterChange = await recorder.read('修改后新会话快捷键', 'settings.shortcut.new.changed', {
      channel: 'dom', scope: '设置/快捷键dialog/新会话行', locator: 'li[class*=row]',
    }, async () => {
      const v = await readBinding(page, '新会话');
      return { value: v, raw: { binding: v } };
    });
    await closeShortcutDialog(page);
    await closeSettings(page);

    // reopen and read persisted
    await openSettings(page);
    await openSection(page, '常规');
    await openShortcutDialog(page);
    const rReopen = await recorder.read('重开后的新建快捷键', 'settings.shortcut.new.reopen', {
      channel: 'dom', scope: '设置/快捷键dialog/新会话行', locator: 'li[class*=row]',
    }, async () => {
      const v = await readBinding(page, '新会话');
      return { value: v, raw: { binding: v } };
    });

    // G12-09 read search combo before closing
    const rSearchCombo = await recorder.read('搜索会话快捷键组合', 'settings.shortcut.search.combo', {
      channel: 'dom', scope: '设置/快捷键dialog/搜索会话行', locator: 'li[class*=row]',
    }, async () => {
      const v = await readBinding(page, '搜索会话');
      return { value: v, raw: { binding: v } };
    });
    out.searchCombo = rSearchCombo.value;

    // restore new shortcut
    const aRestore = await recorder.action('恢复新会话快捷键', 'click+keys', rNewInit.value, async () => {
      if (rNewInit.value) await editBinding(page, '新会话', toPlaywrightKeys(rNewInit.value));
    });
    const rRestored = await recorder.read('恢复后新建快捷键', 'settings.shortcut.new.restored', {
      channel: 'dom', scope: '设置/快捷键dialog/新会话行', locator: 'li[class*=row]',
    }, async () => {
      const v = await readBinding(page, '新会话');
      return { value: v, raw: { binding: v } };
    });
    await closeShortcutDialog(page);
    await closeSettings(page);

    // ---- G12-09 press the configured search combo ----
    const aPress = await recorder.action('按当前搜索快捷键', 'keyboard', rSearchCombo.value ?? 'Ctrl+K', async () => {
      const combo = toPlaywrightKeys(rSearchCombo.value ?? 'Ctrl + K');
      await page.keyboard.press(combo);
      await sleep(1800);
    });
    const rSearchPanel = await recorder.read('快捷键后的搜索会话输入', 'search.panel.visible', {
      channel: 'dom', scope: '搜索会话面板', locator: 'input[placeholder*="搜索"], [role="dialog"]',
    }, async () => {
      const value = await page.evaluate(() => {
        const inputs = [...document.querySelectorAll('input')].filter((e) => e.offsetWidth && /搜索/.test(e.placeholder || ''));
        return inputs.length > 0;
      });
      return { value, raw: { search_inputs: value ? 1 : 0 }, derivation: 'visible search input count > 0' };
    });
    await page.keyboard.press('Escape').catch(() => {});

    out.reads = { newInit: rNewInit.event_id, afterChange: rAfterChange.event_id, reopen: rReopen.event_id, searchCombo: rSearchCombo.event_id, restored: rRestored.event_id, searchPanel: rSearchPanel.event_id };
    out.actions = { change: aChange.event_id, restore: aRestore.event_id, press: aPress.event_id };
    out.values = { newInitial: rNewInit.value, afterChange: rAfterChange.value, reopen: rReopen.value, restored: rRestored.value, searchPanel: rSearchPanel.value };
    return out;
  });
}
