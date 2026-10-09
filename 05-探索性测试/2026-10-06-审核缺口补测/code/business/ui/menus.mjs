// G13 menu/entry reads: @ menu, expert/skill create modes, automation recommend, help, plugin expand, session sort.
import { withApp, sleep, newTask, selectProject, expertsFrame, skillsFrame, expandMore } from '../../automation/tpt.mjs';
import { openSettings, openSection, closeSettings } from '../../automation/settings.mjs';

async function clickText(page, text) {
  return page.evaluate((t) => {
    const b = [...document.querySelectorAll('button,[role="menuitem"]')].find((e) => (e.innerText || '').replace(/\s+/g, ' ').trim() === t);
    if (b) { b.click(); return true; }
    return false;
  }, text);
}

export async function uiMenus(ctx, args) {
  return withApp(ctx, async (page) => {
    const { recorder } = ctx;
    const out = {};
    await closeSettings(page);

    // ---------- G13-01 @ menu ----------
    await newTask(page);
    await selectProject(page).catch(() => {});
    const a1 = await recorder.action('输入@打开菜单', 'type', '@', async () => {
      const c = page.locator('[contenteditable="true"]').first();
      await c.click({ timeout: 8000 });
      await page.keyboard.type('@');
      await sleep(1400);
    });
    const r1 = await recorder.read('@菜单本地文件入口', 'composer.at-menu', {
      channel: 'dom', scope: 'composer/@浮层', locator: '[role="listbox"]',
    }, async () => {
      const t = await page.evaluate(() => {
        const m = [...document.querySelectorAll('[role="listbox"],[role="menu"]')].find((e) => e.offsetWidth && (e.innerText || '').trim());
        return m ? m.innerText.replace(/\s+/g, ' ') : '';
      });
      const value = /文件与文件夹|本地|资料/.test(t);
      return { value, raw: { menu: t.slice(0, 400) }, derivation: 'menu shows 文件与文件夹/本地/资料' };
    });
    await page.keyboard.press('Escape').catch(() => {});
    await page.evaluate(() => { const c = document.querySelector('[contenteditable="true"]'); if (c) c.blur(); });
    out.G13_01 = { action: a1.event_id, read: r1.event_id, value: r1.value };

    // ---------- G13-04 expert create + import input ----------
    const ef = await expertsFrame(page);
    const a4 = await recorder.action('点击新建专家', 'click', '新建专家', async () => {
      await ef.getByRole('button', { name: '新建专家', exact: true }).first().click({ timeout: 8000 }).catch(() => {});
      await sleep(2500);
    });
    const r4a = await recorder.read('专家创建模式', 'expert.create.mode', {
      channel: 'dom', scope: '点击新建专家后的目标会话/面板', locator: 'body innerText snippet',
    }, async () => {
      const t = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 1500));
      const value = /创建专家|新建专家|Expert/.test(t);
      return { value, raw: { snippet: t.slice(0, 300) }, derivation: 'target session shows create-expert semantics' };
    });
    const ef2 = await expertsFrame(page);
    const a4b = await recorder.action('打开专家导入dialog', 'click', '导入专家', async () => {
      await ef2.getByRole('button', { name: '导入专家', exact: true }).first().click({ timeout: 8000 });
      await sleep(1200);
    });
    const r4b = await recorder.read('专家导入目录input', 'expert.import.dir-input', {
      channel: 'dom', scope: '专家iframe/导入dialog', locator: '[role="dialog"] input[webkitdirectory]',
    }, async () => {
      const n = await ef2.evaluate(() => { const d = [...document.querySelectorAll('[role="dialog"]')].find((e) => e.offsetWidth); return d ? d.querySelectorAll('input[webkitdirectory]').length : 0; });
      return { value: n > 0, raw: { dir_inputs: n }, derivation: 'webkitdirectory input count > 0' };
    });
    await page.keyboard.press('Escape').catch(() => {});
    out.G13_04 = { createAction: a4.event_id, createRead: r4a.event_id, createValue: r4a.value, dialogAction: a4b.event_id, dirRead: r4b.event_id, dirValue: r4b.value };

    // ---------- G13-11 skill create mode ----------
    await expandMore(page);
    const sf = await skillsFrame(page);
    const a11 = await recorder.action('点击新建技能', 'click', '新建技能', async () => {
      await sf.getByRole('button', { name: '新建技能', exact: true }).first().click({ timeout: 8000 }).catch(() => {});
      await sleep(2500);
    });
    const r11 = await recorder.read('技能创建模式', 'skill.create.mode', {
      channel: 'dom', scope: '点击新建技能后的目标会话/面板', locator: 'body innerText snippet',
    }, async () => {
      const t = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 1500));
      const value = /创建技能|新建技能|Skill/.test(t);
      return { value, raw: { snippet: t.slice(0, 300) }, derivation: 'target session shows create-skill semantics' };
    });
    const r11nav = await recorder.read('创建页左导航', 'skill.create.nav', {
      channel: 'dom', scope: '主页面/左侧导航', locator: '[data-slot="sidebar"]',
    }, async () => {
      const v = await page.locator('[data-slot="sidebar"]').first().isVisible().catch(() => null);
      return { value: v, raw: { visible: v }, derivation: 'left sidebar visible' };
    });
    out.G13_11 = { action: a11.event_id, modeRead: r11.event_id, mode: r11.value, navRead: r11nav.event_id, nav: r11nav.value };

    // ---------- G13-05 automation recommend ----------
    const a5 = await recorder.action('打开自动化任务', 'click', '自动化任务', async () => {
      await page.getByRole('button', { name: '自动化任务', exact: true }).first().click({ timeout: 6000 }).catch(() => {});
      await sleep(3000);
    });
    const r5 = await recorder.read('推荐点击后预填', 'automation.prefill', {
      channel: 'dom', scope: '自动化任务页/推荐案例 + composer', locator: 'automation cards + composer',
    }, async () => {
      const info = await page.evaluate(() => {
        const cards = [...document.querySelectorAll('[class*="card"],[class*="Card"]')].filter((e) => e.offsetWidth && /推荐|使用|案例/.test(e.innerText || ''));
        const first = cards[0];
        const prompt = first ? first.innerText.replace(/\s+/g, ' ').trim().slice(0, 300) : null;
        return { cardCount: cards.length, prompt };
      });
      return { value: null, raw: info, reason: '需在点击前独立读取推荐卡提示词并点击使用；本函数仅做一次页面探测', failed_dependency: '自动化推荐卡结构' };
    });
    out.G13_05 = { action: a5.event_id, read: r5.event_id, value: r5.value };

    // ---------- G13-06 help ----------
    const a6 = await recorder.action('打开帮助与反馈', 'click', '帮助与反馈', async () => {
      await page.locator('[data-slot="settings.user"] button[aria-haspopup="menu"]').first().click({ timeout: 6000 }).catch(() => {});
      await sleep(700);
      await page.getByRole('menuitem', { name: '帮助与反馈' }).click({ timeout: 6000 }).catch(() => {});
      await sleep(3000);
    });
    const r6 = await recorder.read('帮助点击有可观察响应', 'help.response', {
      channel: 'dom', scope: '顶层/弹窗', locator: 'location.href + dialogs',
    }, async () => {
      const info = await page.evaluate(() => ({ url: location.href, dialogs: document.querySelectorAll('[role="dialog"]').length, text: document.body.innerText.slice(0, 300) }));
      const value = info.dialogs > 0;
      return { value, raw: info, derivation: 'a dialog opened after help click' };
    });
    out.G13_06 = { action: a6.event_id, read: r6.event_id, value: r6.value };

    // ---------- G13-12 plugins ----------
    await closeSettings(page);
    await openSettings(page);
    await openSection(page, '内置插件');
    const pluginExpr = () => {
      const d = [...document.querySelectorAll('[role="dialog"]')].find((e) => e.offsetWidth);
      const b = d && [...d.querySelectorAll('[aria-expanded]')].find((x) => /插件|standard|标准/.test(x.innerText || ''));
      return b ? { expanded: b.getAttribute('aria-expanded'), hasContent: (b.innerText || '').length > 10 } : null;
    };
    const r12before = await recorder.read('本轮插件卡展开状态', 'plugin.expanded.before', {
      channel: 'dom', scope: '设置/内置插件/插件卡', locator: '[aria-expanded]',
    }, async () => {
      const v = await page.evaluate(pluginExpr);
      return { value: v ? v.expanded : null, raw: { state: v }, reason: v ? undefined : 'no plugin aria-expanded node found' };
    });
    const a12 = await recorder.action('展开插件卡', 'click', '插件卡', async () => {
      await page.evaluate(() => {
        const d = [...document.querySelectorAll('[role="dialog"]')].find((e) => e.offsetWidth);
        const b = d && [...d.querySelectorAll('[aria-expanded]')].find((x) => /插件|standard|标准/.test(x.innerText || ''));
        if (b) b.click();
      });
      await sleep(1200);
    });
    const r12a = await recorder.read('插件展开详情', 'plugin.expanded', {
      channel: 'dom', scope: '设置/内置插件/插件卡', locator: '[aria-expanded]',
    }, async () => {
      const v = await page.evaluate(pluginExpr);
      const value = !!(v && v.expanded === 'true' && v.hasContent);
      return { value, raw: { state: v }, derivation: "expanded==='true' && detail content present" };
    });
    const a12b = await recorder.action('恢复插件卡折叠', 'click', '插件卡', async () => {
      await page.evaluate(() => {
        const d = [...document.querySelectorAll('[role="dialog"]')].find((e) => e.offsetWidth);
        const b = d && [...d.querySelectorAll('[aria-expanded]')].find((x) => /插件|standard|标准/.test(x.innerText || ''));
        if (b) b.click();
      });
      await sleep(1200);
    });
    const r12after = await recorder.read('本轮插件卡展开状态', 'plugin.expanded.before', {
      channel: 'dom', scope: '设置/内置插件/插件卡', locator: '[aria-expanded]',
    }, async () => {
      const v = await page.evaluate(pluginExpr);
      return { value: v ? v.expanded : null, raw: { state: v }, reason: v ? undefined : 'no plugin aria-expanded node found' };
    });
    await closeSettings(page);
    out.G13_12 = { before: r12before.event_id, expandAction: a12.event_id, detail: r12a.event_id, collapseAction: a12b.event_id, after: r12after.event_id };

    // ---------- G13-14 sort ----------
    const sortExpr = () => {
      const m = [...document.querySelectorAll('[role="menu"]')].find((e) => e.offsetWidth);
      if (!m) return null;
      const sel = [...m.querySelectorAll('[role="menuitemradio"],[role="menuitem"]')].find((x) => x.getAttribute('aria-checked') === 'true' || x.getAttribute('data-state') === 'checked');
      return sel ? sel.innerText.trim() : null;
    };
    const a14 = await recorder.action('打开排序菜单', 'click', '排序方式', async () => {
      await page.locator('[aria-label="排序方式"]').first().click({ timeout: 6000 }).catch(() => {});
      await sleep(900);
    });
    const r14initial = await recorder.read('排序初始选中项', 'sort.initial', {
      channel: 'dom', scope: '侧栏排序菜单', locator: '[role="menuitemradio"]',
    }, async () => {
      const v = await page.evaluate(sortExpr);
      return { value: v, raw: { selected: v }, reason: v ? undefined : 'sort menu selection not found' };
    });
    const a14b = await recorder.action('选择另一排序', 'click', '手动排序', async () => {
      await page.getByText('手动排序', { exact: true }).last().click({ timeout: 5000 }).catch(() => {});
      await sleep(1200);
    });
    await page.locator('[aria-label="排序方式"]').first().click({ timeout: 6000 }).catch(() => {});
    await sleep(900);
    const r14changed = await recorder.read('排序更改选中项', 'sort.changed', {
      channel: 'dom', scope: '侧栏排序菜单', locator: '[role="menuitemradio"]',
    }, async () => {
      const v = await page.evaluate(sortExpr);
      return { value: v, raw: { selected: v }, reason: v ? undefined : 'sort menu selection not found' };
    });
    const a14c = await recorder.action('恢复排序', 'click', '最近更新', async () => {
      await page.getByText(/最近更新/).last().click({ timeout: 5000 }).catch(() => {});
      await sleep(1000);
    });
    await page.locator('[aria-label="排序方式"]').first().click({ timeout: 6000 }).catch(() => {});
    await sleep(800);
    const r14restored = await recorder.read('排序恢复选中项', 'sort.restored', {
      channel: 'dom', scope: '侧栏排序菜单', locator: '[role="menuitemradio"]',
    }, async () => {
      const v = await page.evaluate(sortExpr);
      return { value: v, raw: { selected: v }, reason: v ? undefined : 'sort menu selection not found' };
    });
    await page.keyboard.press('Escape').catch(() => {});
    out.G13_14 = { open: a14.event_id, initial: r14initial.event_id, initialValue: r14initial.value, change: a14b.event_id, changed: r14changed.event_id, changedValue: r14changed.value, restore: a14c.event_id, restored: r14restored.event_id, restoredValue: r14restored.value };
    return out;
  });
}
