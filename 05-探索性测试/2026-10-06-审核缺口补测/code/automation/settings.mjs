// Settings dialog helpers (runtime support).
import { sleep } from './tpt.mjs';

export async function isSettingsOpen(page) {
  return page.evaluate(() => {
    const d = [...document.querySelectorAll('[role="dialog"]')].find((e) => e.offsetWidth && /常规/.test(e.innerText) && /关闭/.test(e.innerText));
    return !!d;
  });
}

export async function openSettings(page) {
  if (!(await isSettingsOpen(page))) {
    const menuVisible = await page.locator('[role="menu"]:visible').count();
    if (!menuVisible) {
      await page.locator('[data-slot="settings.user"] button[aria-haspopup="menu"]').first().click({ timeout: 8000 });
      await sleep(600);
    }
    await page.getByRole('menuitem', { name: '设置', exact: true }).click({ timeout: 8000 });
    await sleep(1200);
  }
  return page;
}

export async function openSection(page, name) {
  await page.locator('[role="dialog"]:visible button').filter({ hasText: new RegExp('^' + name) }).first().click({ timeout: 8000 }).catch(() => {});
  await sleep(800);
}

export async function closeSettings(page) {
  for (let i = 0; i < 8; i++) {
    const any = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].filter((e) => e.offsetWidth).length);
    if (!any) break;
    const close = page.locator('[role="dialog"]:visible button').filter({ hasText: /^(关闭|Close)$/ }).first();
    if (await close.count()) await close.click({ timeout: 4000 }).catch(() => {});
    else await page.keyboard.press('Escape').catch(() => {});
    await sleep(600);
  }
}

function rowLocator(page, label) {
  return page.locator('[role="dialog"]:visible').first();
}

export async function settingsRowStructure(page, label) {
  return page.evaluate((lab) => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const d = [...document.querySelectorAll('[role="dialog"]')].find((e) => e.offsetWidth && /常规/.test(e.innerText));
    if (!d) return null;
    const el = [...d.querySelectorAll('*')].find((e) => e.children.length === 0 && norm(e.textContent) === lab);
    if (!el) return null;
    let row = el;
    for (let i = 0; i < 6 && row && row !== d; i++) { row = row.parentElement; if (row && row.querySelectorAll('button,[role="switch"]').length) break; }
    const btns = row ? [...row.querySelectorAll('button')].map((b) => ({ text: norm(b.innerText), aria: b.getAttribute('aria-label'), pressed: b.getAttribute('aria-pressed'), role: b.getAttribute('role'), checked: b.getAttribute('aria-checked') })) : [];
    return { text: row ? norm(row.innerText) : null, btns };
  }, label);
}

export async function readSelectorValue(page, label) {
  const st = await settingsRowStructure(page, label);
  if (!st) return null;
  const sel = st.btns.find((b) => b.text && b.text !== '');
  return sel ? sel.text : null;
}

export async function setSelector(page, label, option) {
  const opened = await page.evaluate((lab) => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const d = [...document.querySelectorAll('[role="dialog"]')].find((e) => e.offsetWidth && /常规/.test(e.innerText));
    if (!d) return false;
    const el = [...d.querySelectorAll('*')].find((e) => e.children.length === 0 && norm(e.textContent) === lab);
    if (!el) return false;
    let row = el;
    for (let i = 0; i < 6 && row && row !== d; i++) { row = row.parentElement; if (row && row.querySelector('button')) break; }
    const btn = row && row.querySelector('button');
    if (!btn) return false;
    btn.click();
    return true;
  }, label);
  if (!opened) throw new Error('selector not found for ' + label);
  await sleep(800);
  const clicked = await page.evaluate((opt) => {
    const menus = [...document.querySelectorAll('[role="menu"]')].filter((e) => e.offsetWidth);
    for (const m of menus) {
      const items = [...m.querySelectorAll('[role="menuitem"],[role="option"],button')];
      const t = items.find((i) => (i.innerText || '').trim() === opt);
      if (t) { t.click(); return true; }
    }
    return false;
  }, option);
  if (!clicked) throw new Error('option not found ' + option);
  await sleep(900);
}

export async function readSwitch(page, label) {
  const st = await settingsRowStructure(page, label);
  if (!st) return null;
  const sw = st.btns.find((b) => b.role === 'switch');
  return sw ? sw.checked === 'true' : null;
}

export async function clickSwitch(page, label) {
  const clicked = await page.evaluate((lab) => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const d = [...document.querySelectorAll('[role="dialog"]')].find((e) => e.offsetWidth && /常规/.test(e.innerText));
    const el = [...d.querySelectorAll('*')].find((e) => e.children.length === 0 && norm(e.textContent) === lab);
    if (!el) return false;
    let row = el;
    for (let i = 0; i < 6 && row && row !== d; i++) { row = row.parentElement; if (row && row.querySelector('[role="switch"]')) break; }
    const sw = row && row.querySelector('[role="switch"]');
    if (!sw) return false;
    sw.click();
    return true;
  }, label);
  if (!clicked) throw new Error('switch not found for ' + label);
  await sleep(1400);
}

export async function usageFooterText(page) {
  return page.evaluate(() => {
    const chat = document.querySelector('[data-conversation-region="chat"]');
    if (!chat) return null;
    const roots = [...chat.querySelectorAll('[class*="TS9iAW_root"]')];
    if (roots.length) return roots[roots.length - 1].innerText.replace(/\s+/g, ' ').trim();
    const cand = [...chat.querySelectorAll('[class*="TS9iAW"]')].filter((e) => e.offsetWidth || e.offsetHeight);
    if (cand.length) return cand[cand.length - 1].innerText.replace(/\s+/g, ' ').trim();
    return null;
  });
}

export async function openShortcutDialog(page) {
  const ok = await page.evaluate(() => {
    const b = document.querySelector('button[aria-label="编辑快捷键"]');
    if (b) { b.click(); return true; }
    return false;
  });
  if (!ok) {
    await page.getByRole('button', { name: '编辑快捷键' }).first().click({ force: true, timeout: 8000 }).catch(() => {});
  }
  await sleep(1400);
}

export async function shortcutRowsText(page) {
  return page.evaluate(() => {
    const ds = [...document.querySelectorAll('[role="dialog"]')].filter((e) => e.offsetWidth);
    const d = ds[ds.length - 1];
    if (!d || !/快捷键/.test(d.innerText)) return null;
    return d.innerText.replace(/[ \t]+/g, ' ').trim();
  });
}

// Returns the current combo for a labeled shortcut row, e.g. label '新会话'
export async function readShortcut(page, label) {
  return page.evaluate((lab) => {
    const ds = [...document.querySelectorAll('[role="dialog"]')].filter((e) => e.offsetWidth);
    const d = ds[ds.length - 1];
    if (!d) return null;
    const all = [...d.querySelectorAll('*')].filter((e) => e.children.length === 0 && (e.textContent || '').trim() === lab);
    for (const el of all) {
      // find the nearest ancestor row containing a kbd/button with a combo
      let row = el;
      for (let i = 0; i < 5 && row && row !== d; i++) { row = row.parentElement; if (row && /Ctrl|Shift|Alt/.test(row.innerText) && row.innerText.includes(lab)) break; }
      if (row) {
        const combo = row.innerText.replace(/\s+/g, ' ').replace(lab, '').trim();
        if (combo) return combo;
      }
    }
    return null;
  }, label);
}

export async function closeShortcutDialog(page) {
  for (let i = 0; i < 4; i++) {
    const closed = await page.evaluate(() => {
      const ds = [...document.querySelectorAll('[role="dialog"]')].filter((e) => e.offsetWidth);
      return !(ds.length && /快捷键/.test(ds[ds.length - 1].innerText));
    });
    if (closed) return;
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(600);
  }
}
