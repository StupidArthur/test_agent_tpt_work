import fs from 'node:fs';
import { withApp, sleep } from '../automation/tpt.mjs';
const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
await withApp(ctx, async (page) => {
  console.log('sort btn count', await page.locator('[aria-label="排序方式"]').count());
  await page.locator('[aria-label="排序方式"]').first().click({ timeout: 6000 }).catch((e) => console.log('err', e.message));
  await sleep(1000);
  const info = await page.evaluate(() => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const menus = [...document.querySelectorAll('[role="menu"],[role="listbox"],[class*="menu"],[class*="Menu"]')].filter((e) => e.offsetWidth && e.innerText.trim());
    return menus.slice(0, 4).map((m) => ({ role: m.getAttribute('role'), cls: (m.className || '').toString().slice(0, 50), text: norm(m.innerText).slice(0, 200), items: [...m.querySelectorAll('[role="menuitemradio"],[role="menuitem"],[role="option"],button,li')].map((i) => ({ role: i.getAttribute('role'), checked: i.getAttribute('aria-checked'), state: i.getAttribute('data-state'), t: norm(i.innerText).slice(0, 30) })) }));
  });
  console.log(JSON.stringify(info, null, 2));
  fs.writeFileSync('code/probes/p42-sort.json', JSON.stringify(info, null, 2), 'utf8');
});
