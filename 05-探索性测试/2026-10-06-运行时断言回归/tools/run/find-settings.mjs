import { withApp, dump } from './lib.mjs';

await withApp(async (page) => {
  const hits = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('*').forEach(e => {
      const t = (e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60);
      const a = (e.getAttribute && e.getAttribute('aria-label')) || '';
      const r = (e.getAttribute && e.getAttribute('role')) || '';
      if ((t.includes('设置') || a.includes('设置') || a.includes('Arthur') || t === 'Arthur' || /Arthur/.test(t) || a.includes('账户')) && e.children.length <= 4) {
        out.push({ tag: e.tagName, role: r, aria: a, text: t, cls: (e.className || '').toString().slice(0, 70) });
      }
    });
    return out.slice(0, 80);
  });
  dump('settings-hits', hits);
});
