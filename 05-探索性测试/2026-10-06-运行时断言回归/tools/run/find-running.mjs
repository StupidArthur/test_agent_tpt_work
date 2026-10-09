import { withApp, dump } from './lib.mjs';
await withApp(async (page) => {
  const hits = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('*').forEach(e => {
      if (e.children.length) return;
      const t = (e.textContent || '').trim();
      if (['进行中', '探索中...', '正在准备对话…', '等待回答'].includes(t) && (e.offsetWidth || e.offsetHeight)) {
        const chain = [];
        let x = e;
        for (let i = 0; i < 5 && x; i++) { chain.push({ tag: x.tagName, cls: (x.className || '').toString().slice(0, 50) }); x = x.parentElement; }
        out.push({ text: t, chain });
      }
    });
    return out;
  });
  dump('running-indicators', hits);
});
