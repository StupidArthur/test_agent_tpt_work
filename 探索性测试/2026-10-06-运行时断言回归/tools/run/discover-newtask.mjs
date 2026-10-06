import { withApp, dump, sleep, closeSettings } from './lib.mjs';

await withApp(async (page) => {
  await closeSettings(page);
  await page.getByRole('button', { name: '新建任务', exact: true }).first().click({ timeout: 8000 }).catch(async () => {
    await page.getByRole('button', { name: '新建会话', exact: true }).first().click({ timeout: 8000 });
  });
  await sleep(2500);
  const state = await page.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    return {
      bodyTop: document.body.innerText.slice(0, 1500),
      editables: [...document.querySelectorAll('[contenteditable="true"], textarea, input[type="text"]')].map(e => ({ tag: e.tagName, cls: (e.className || '').toString().slice(0, 60), ph: e.getAttribute('placeholder'), aria: e.getAttribute('aria-label'), dataSlot: e.getAttribute('data-slot') })),
      sendButtons: [...document.querySelectorAll('button')].filter(b => /发送|停止|Send|Stop/.test(b.getAttribute('aria-label') || b.innerText || '')).map(b => ({ text: norm(b.innerText).slice(0, 20), aria: b.getAttribute('aria-label'), cls: (b.className || '').toString().slice(0, 50), disabled: b.disabled })),
      modelChips: [...document.querySelectorAll('button,[role="button"],[data-slot*="model"],[data-slot*="modelPicker"]')].filter(b => /标准|low|模型|推理/.test(b.innerText || '')).slice(0, 15).map(b => ({ text: norm(b.innerText).slice(0, 40), aria: b.getAttribute('aria-label'), cls: (b.className || '').toString().slice(0, 50) })),
      dialogs: [...document.querySelectorAll('[role="dialog"]')].filter(e => e.offsetWidth).map(e => norm(e.innerText).slice(0, 200)),
    };
  });
  await page.screenshot({ path: 'tools/run/scratch/newtask.png' });
  dump('newtask-state', state);
});
