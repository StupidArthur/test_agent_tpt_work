import fs from 'node:fs';
import { connect, findMainPage, sleep } from '../automation/connect.mjs';

const browser = await connect();
try {
  const page = findMainPage(browser);
  await page.keyboard.press('Escape').catch(() => {});
  await page.getByRole('button', { name: '新建任务', exact: true }).first().click({ timeout: 10000 });
  await sleep(1200);
  const ws = page.locator('.pXSMma_workspace').first();
  await ws.click().catch(() => {}); await sleep(500);
  const it = page.getByRole('menuitem', { name: /^tpt-workspace/ }).first();
  if (await it.count()) await it.click().catch(() => {});
  await sleep(500);
  const composer = page.locator('[contenteditable="true"]').first();
  await composer.click(); await composer.fill('请只回复固定字符串：G1PROBE_OK');
  await sleep(300);
  const send = page.locator('button[aria-label="发送消息"]').first();
  for (let i = 0; i < 30; i++) { if (!(await send.isDisabled().catch(() => true))) break; await sleep(300); }
  await send.click();
  for (let i = 0; i < 60; i++) { await sleep(2000); const t = await page.locator('body').innerText(); if (/G1PROBE_OK/.test(t)) break; }
  const info = await page.evaluate(() => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const chat = document.querySelector('[data-conversation-region="chat"]');
    const nodes = chat ? [...chat.querySelectorAll('[data-slot="conversation.chat.node"]')] : [];
    return {
      session: document.querySelector('[data-conversation-session]')?.getAttribute('data-conversation-session'),
      nodeCount: nodes.length,
      nodes: nodes.slice(-4).map((n) => ({ cls: (n.className || '').toString().slice(0, 80), text: norm(n.innerText).slice(0, 120), childClasses: [...new Set([...n.querySelectorAll('div[class]')].map((e) => (e.className || '').toString().split(' ')[0]))].slice(0, 15) })),
      chatText: chat ? norm(chat.innerText).slice(-500) : null,
    };
  });
  console.log(JSON.stringify(info, null, 2));
  fs.writeFileSync('code/probes/p10-chatnodes.json', JSON.stringify(info, null, 2), 'utf8');
} finally { await browser.close(); }
