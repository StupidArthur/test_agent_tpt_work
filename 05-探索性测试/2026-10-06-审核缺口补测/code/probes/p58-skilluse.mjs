import fs from 'node:fs';
import { withApp, sleep, sessionId } from '../automation/tpt.mjs';
import { ensureList, findCardIndexByInternalName, cardByTitle, readDetail } from '../automation/skills.mjs';
const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
const name = 'fast-assert-skillc-20261006-agent2';
const title = '本轮快速回归技能';
await withApp(ctx, async (page) => {
  const f = await ensureList(page);
  const before = await sessionId(page);
  console.log('session before', before);
  const res = await findCardIndexByInternalName(f, title, name);
  console.log('matched', res.matched, res.seen);
  if (!res.matched) return;
  const card = (await cardByTitle(f, title)).nth(res.index);
  // read switch state
  const sw = card.locator('[role="switch"]').first();
  console.log('switch', await sw.getAttribute('aria-checked'));
  // open detail
  await card.locator('[data-slot="card-content"]').click({ timeout: 8000 });
  await sleep(1200);
  const btns = await f.evaluate(() => [...document.querySelectorAll('[class*="_page_"] button')].map((b) => (b.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean));
  console.log('detail buttons', JSON.stringify(btns));
  const useBtn = f.getByRole('button', { name: '使用', exact: true });
  console.log('use count', await useBtn.count());
  if (await useBtn.count()) await useBtn.click({ timeout: 8000 });
  await sleep(2500);
  const state = await page.evaluate(() => ({
    session: document.querySelector('[data-conversation-session]')?.getAttribute('data-conversation-session') ?? null,
    composer: document.querySelector('[contenteditable="true"]')?.innerText ?? null,
    chats: [...document.querySelectorAll('[data-conversation-region="chat"]')].length,
    body: document.body.innerText.replace(/\s+/g, ' ').slice(0, 400),
  }));
  console.log('after use', JSON.stringify(state, null, 2));
});
