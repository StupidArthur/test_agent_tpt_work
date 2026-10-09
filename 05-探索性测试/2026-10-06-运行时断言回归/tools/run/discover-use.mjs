import { withApp, dump, sleep } from './lib.mjs';
await withApp(async (page) => {
  const frame = page.frame({ url: /supcon-skills/ });
  const MY_NAME = 'fast-assert-skill-20261006-oc1';
  const backToList = async () => {
    for (let i = 0; i < 3; i++) {
      const isDetail = await frame.evaluate(() => !!document.querySelector('[class*="_page_"]'));
      if (!isDetail) return;
      await frame.evaluate(() => { const p = document.querySelector('[class*="_page_"]'); const b = p && [...p.querySelectorAll('button')].find(x => (x.innerText || '').trim() === '技能'); if (b) b.click(); });
      await sleep(900);
    }
  };
  await backToList();
  const cards = frame.locator('[data-slot="card"]').filter({ hasText: '本轮快速回归技能' });
  let used = false;
  for (let i = 0; i < await cards.count(); i++) {
    await cards.nth(i).locator('[data-slot="card-content"]').click({ timeout: 8000 }).catch(() => {});
    await sleep(1300);
    const nm = await frame.evaluate(() => { const p = document.querySelector('[class*="_page_"]'); return p ? ((p.innerText.match(/name:\s*([^\s]+)/) || [])[1] || null) : null; });
    if (nm === MY_NAME) {
      await frame.getByRole('button', { name: '使用', exact: true }).click({ timeout: 8000 });
      used = true; break;
    }
    await backToList();
  }
  await sleep(3000);
  const st = await page.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    const sel = document.querySelector('[data-row-key][aria-selected="true"], [class*="sessionRow"][data-active="true"]');
    const rows = [...document.querySelectorAll('[data-row-key]')].filter(e => (e.getAttribute('class') || '').includes('selected') || e.getAttribute('aria-selected') === 'true').map(e => e.getAttribute('data-row-key'));
    return {
      composerText: norm(document.querySelector('[contenteditable="true"]')?.innerText || ''),
      composerHtml: document.querySelector('[contenteditable="true"]')?.innerHTML?.slice(0, 1200),
      ariaButtons: [...document.querySelectorAll('button,[role="button"]')].map(b => b.getAttribute('aria-label')).filter(Boolean).filter(a => /技能|skill/i.test(a)),
      selectedRows: rows,
      bodyHasSkillName: norm(document.body.innerText).includes('fast-assert-skill-20261006-oc1'),
    };
  });
  dump('use-flow', { used, ...st });
});
