import fs from 'node:fs';
import { withApp, sleep } from '../automation/tpt.mjs';
import { ensureList, findCardIndexByInternalName, cardByTitle } from '../automation/skills.mjs';
const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
await withApp(ctx, async (page) => {
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(500);
  const before = await page.evaluate(() => ({ sessions: [...document.querySelectorAll('[data-conversation-session]')].map((e) => e.getAttribute('data-conversation-session')), title: (document.querySelector('[data-slot="conversation.session.header"]') || {}).innerText }));
  console.log('before', JSON.stringify(before));
  const f = await ensureList(page);
  const r = await findCardIndexByInternalName(f, '本轮快速回归技能', 'fast-assert-skillc-20261006-agent2');
  const card = (await cardByTitle(f, '本轮快速回归技能')).nth(r.index);
  await card.locator('[data-slot="card-content"]').click({ timeout: 8000 });
  await sleep(1200);
  await f.getByRole('button', { name: '使用', exact: true }).click({ timeout: 8000 });
  await sleep(4000);
  const after = await page.evaluate(() => ({
    sessions: [...document.querySelectorAll('[data-conversation-session]')].map((e) => e.getAttribute('data-conversation-session')),
    titleSet: [...document.querySelectorAll('[data-slot="conversation.session.header"]')].map((e) => (e.innerText || '').replace(/\s+/g, ' ').slice(0, 80)),
    composer: [...document.querySelectorAll('[contenteditable="true"]')].map((e) => (e.innerText || '').replace(/\s+/g, ' ').slice(0, 80)),
    selectedRow: [...document.querySelectorAll('[data-row-key][aria-selected="true"]')].map((e) => ({ k: e.getAttribute('data-row-key'), t: (e.innerText || '').replace(/\s+/g, ' ').slice(0, 40) })),
  }));
  console.log('after', JSON.stringify(after, null, 2));
});
