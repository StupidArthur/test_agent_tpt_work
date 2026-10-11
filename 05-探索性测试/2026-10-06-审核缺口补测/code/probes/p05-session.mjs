import fs from 'node:fs';
import { connect, findMainPage, sleep } from '../automation/connect.mjs';

const browser = await connect();
try {
  const page = findMainPage(browser);
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(400);
  await page.getByRole('button', { name: '新建任务', exact: true }).first().click({ timeout: 10000 });
  await sleep(1500);
  // select project
  const ws = page.locator('.pXSMma_workspace').first();
  const before = (await ws.innerText().catch(() => '')).trim();
  await ws.click().catch(() => {});
  await sleep(600);
  const item = page.getByRole('menuitem', { name: /^tpt-workspace/ }).first();
  if (await item.count()) { await item.click().catch(() => {}); }
  await sleep(800);
  const after = (await ws.innerText().catch((e) => 'ERR:' + e.message)).trim();
  console.log('WS before/after:', JSON.stringify(before), JSON.stringify(after));
  const attrs = await page.evaluate(() => {
    const out = {};
    document.querySelectorAll('*').forEach((e) => {
      for (const a of e.attributes || []) if (/session.*id|data-session|data-task|data-conv|data-key/i.test(a.name)) { (out[a.name] ||= []).push(a.value); }
    });
    for (const k of Object.keys(out)) out[k] = [...new Set(out[k])].slice(0, 5);
    return out;
  });
  console.log('SESSION ATTRS', JSON.stringify(attrs, null, 2));
  // send
  const composer = page.locator('[contenteditable="true"]').first();
  await composer.click();
  await composer.fill('只回答：FAST_CHAT_OK');
  await sleep(300);
  const send = page.locator('button[aria-label="发送消息"]').first();
  for (let i = 0; i < 30; i++) { if (!(await send.isDisabled().catch(() => true))) break; await sleep(300); }
  await send.click();
  for (let i = 0; i < 60; i++) { await sleep(2000); const t = await page.locator('body').innerText(); if (/FAST_CHAT_OK/.test(t)) break; }
  const dump = await page.evaluate(() => {
    const slots = [...new Set([...document.querySelectorAll('[data-slot]')].map((e) => e.getAttribute('data-slot')))];
    const classes = [...new Set([...document.querySelectorAll('div[class]')].map((e) => (e.className || '').toString().split(' ')[0]))].slice(0, 200);
    const arts = [...document.querySelectorAll('[class*="artifact"],[class*="Artifact"],[class*="fileCard"],[class*="FileCard"],[data-slot*="file"]')].map((e) => ({ cls: (e.className || '').toString().slice(0, 100), slot: e.getAttribute('data-slot'), text: (e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80) }));
    return { slots, arts, bodyTail: document.body.innerText.slice(-600) };
  });
  fs.writeFileSync('code/probes/p05-session.json', JSON.stringify(dump, null, 2), 'utf8');
  console.log('SLOTS', JSON.stringify(dump.slots, null, 2).slice(0, 1500));
  console.log('ARTS', JSON.stringify(dump.arts, null, 2).slice(0, 800));
  console.log('TAIL', dump.bodyTail);
} finally { await browser.close(); }
