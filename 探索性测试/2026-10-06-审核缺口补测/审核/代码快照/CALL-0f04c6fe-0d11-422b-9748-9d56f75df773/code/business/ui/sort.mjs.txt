// G13-14: session sort menu selected item change and restore.
import { withApp, sleep } from '../../automation/tpt.mjs';

function sortExpr() {
  const menus = [...document.querySelectorAll('[role="menu"]')].filter((e) => e.offsetWidth && /排序方式/.test(e.innerText));
  const m = menus[menus.length - 1];
  if (!m) return null;
  const sel = [...m.querySelectorAll('[role="menuitem"]')].find((i) => /selected/.test((i.className || '').toString()));
  const all = [...m.querySelectorAll('[role="menuitem"]')].map((i) => i.innerText.replace(/\s+/g, ' ').trim());
  return { selected: sel ? sel.innerText.trim() : null, items: all };
}

export async function uiSort(ctx, args) {
  return withApp(ctx, async (page) => {
    const { recorder } = ctx;
    const out = {};
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(600);
    const aOpen1 = await recorder.action('打开排序菜单', 'click', '排序方式', async () => {
      await page.locator('[aria-label="排序方式"]').first().click({ timeout: 6000 });
      await sleep(1000);
    });
    const rInitial = await recorder.read('排序初始选中项', 'sort.initial', {
      channel: 'dom', scope: '侧栏排序菜单', locator: '[role="menu"] [role="menuitem"].selected',
    }, async () => {
      const v = await page.evaluate(sortExpr);
      return { value: v ? v.selected : null, raw: { ...v }, reason: v ? undefined : 'sort menu not open' };
    });
    const aChange = await recorder.action('选择另一排序', 'click', '手动排序', async () => {
      await page.getByText('手动排序', { exact: true }).last().click({ timeout: 5000 });
      await sleep(1200);
    });
    await page.locator('[aria-label="排序方式"]').first().click({ timeout: 6000 }).catch(() => {});
    await sleep(1000);
    const rChanged = await recorder.read('排序更改选中项', 'sort.changed', {
      channel: 'dom', scope: '侧栏排序菜单', locator: '[role="menu"] [role="menuitem"].selected',
    }, async () => {
      const v = await page.evaluate(sortExpr);
      return { value: v ? v.selected : null, raw: { ...v }, reason: v ? undefined : 'sort menu not open' };
    });
    const aRestore = await recorder.action('恢复排序初值', 'click', '恢复为读取到的初值', async () => {
      const target = rInitial.value;
      if (target) await page.getByText(target, { exact: true }).last().click({ timeout: 5000 });
      await sleep(1200);
    });
    await page.locator('[aria-label="排序方式"]').first().click({ timeout: 6000 }).catch(() => {});
    await sleep(1000);
    const rRestored = await recorder.read('排序恢复选中项', 'sort.restored', {
      channel: 'dom', scope: '侧栏排序菜单', locator: '[role="menu"] [role="menuitem"].selected',
    }, async () => {
      const v = await page.evaluate(sortExpr);
      return { value: v ? v.selected : null, raw: { ...v }, reason: v ? undefined : 'sort menu not open' };
    });
    await page.keyboard.press('Escape').catch(() => {});
    out.G13_14 = { open: aOpen1.event_id, initial: rInitial.event_id, initialValue: rInitial.value, change: aChange.event_id, changed: rChanged.event_id, changedValue: rChanged.value, restore: aRestore.event_id, restored: rRestored.event_id, restoredValue: rRestored.value };
    return out;
  });
}
