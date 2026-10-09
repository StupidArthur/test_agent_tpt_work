import { withApp, dump, sleep, openSettings } from './lib.mjs';

await withApp(async (page) => {
  await openSettings(page);
  const data = await page.evaluate(() => {
    const dlg = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth && /常规/.test(e.innerText));
    if (!dlg) return { error: 'no dialog' };
    const rows = [];
    // collect elements with data-state or role radio/switch/button-with-selected
    dlg.querySelectorAll('button,[role="radio"],[role="switch"],[role="tab"],select,[role="combobox"]').forEach(e => {
      const t = (e.innerText || '').trim().replace(/\s+/g, ' ');
      if (!t && !e.getAttribute('aria-label')) return;
      rows.push({ tag: e.tagName, role: e.getAttribute('role'), text: t.slice(0, 30), aria: e.getAttribute('aria-label'), checked: e.getAttribute('aria-checked'), selected: e.getAttribute('aria-selected') || e.getAttribute('aria-pressed'), dataState: e.getAttribute('data-state'), value: e.value ?? null, cls: (e.className || '').toString().slice(0, 30) });
    });
    return { text: dlg.innerText, rows };
  });
  dump('settings-controls2', data);
});
