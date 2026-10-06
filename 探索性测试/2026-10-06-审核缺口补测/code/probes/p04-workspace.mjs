import fs from 'node:fs';
import { connect, findMainPage, sleep } from '../automation/connect.mjs';

const browser = await connect();
try {
  const page = findMainPage(browser);
  const ws = page.locator('.pXSMma_workspace').first();
  console.log('workspace count', await page.locator('.pXSMma_workspace').count(), 'visible', await ws.isVisible().catch(() => null));
  console.log('workspace text', await ws.innerText().catch(() => ''));
  console.log('workspace html', (await ws.innerHTML().catch(() => '')).slice(0, 500));
  await ws.click({ timeout: 8000 }).catch((e) => console.log('click err', e.message));
  await sleep(800);
  const menus = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('[role="menu"],[role="listbox"],[role="dialog"],[class*="popover"],[class*="Popover"],[class*="dropdown"],[class*="Dropdown"]').forEach((e) => {
      if (!(e.offsetWidth || e.offsetHeight)) return;
      out.push({ role: e.getAttribute('role'), cls: (e.className || '').toString().slice(0, 80), text: (e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 400) });
    });
    const items = [...document.querySelectorAll('[role="menuitem"],[role="option"]')].filter((e) => e.offsetWidth || e.offsetHeight).map((e) => ({ role: e.getAttribute('role'), text: (e.innerText || '').trim(), cls: (e.className || '').toString().slice(0, 60) }));
    return { out, items };
  });
  console.log(JSON.stringify(menus, null, 2));
  fs.writeFileSync('code/probes/p04-workspace-menu.json', JSON.stringify(menus, null, 2), 'utf8');
} finally { await browser.close(); }
