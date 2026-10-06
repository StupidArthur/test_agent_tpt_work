import fs from 'node:fs';
import { connect, findMainPage, sleep } from '../automation/connect.mjs';

const browser = await connect();
try {
  const page = findMainPage(browser);
  await page.getByRole('button', { name: '新建任务', exact: true }).first().click({ timeout: 10000 });
  await sleep(2000);
  const info = await page.evaluate(() => {
    const out = { buttons: [], projectish: [], composer: null, url: location.href };
    document.querySelectorAll('button,[role="button"],[role="combobox"],[aria-haspopup]').forEach((b) => {
      const t = (b.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 60);
      const aria = b.getAttribute('aria-label');
      const cls = (b.className || '').toString().slice(0, 80);
      if (t || aria) out.buttons.push({ t, aria, cls, slot: b.getAttribute('data-slot'), expanded: b.getAttribute('aria-expanded') });
    });
    // project-ish text nodes
    document.querySelectorAll('*').forEach((e) => {
      if (e.children.length) return;
      const t = (e.textContent || '').trim();
      if (/tpt-workspace|选择项目|项目/.test(t) && t.length < 40) out.projectish.push({ t, cls: (e.className || '').toString().slice(0, 60), parentCls: (e.parentElement?.className || '').toString().slice(0, 80) });
    });
    const ce = document.querySelector('[contenteditable="true"]');
    if (ce) out.composer = { cls: ce.className, outer: ce.outerHTML.slice(0, 400) };
    return out;
  });
  fs.writeFileSync('code/probes/p03-newtask.json', JSON.stringify(info, null, 2), 'utf8');
  console.log('PROJECTISH', JSON.stringify(info.projectish.slice(0, 30), null, 2));
  console.log('BUTTONS', JSON.stringify(info.buttons.filter(b => /项目|工作区|权限|模型|发送|场景|标准/.test((b.t || '') + (b.aria || ''))).slice(0, 40), null, 2));
  console.log('COMPOSER', JSON.stringify(info.composer, null, 2).slice(0, 600));
} finally { await browser.close(); }
