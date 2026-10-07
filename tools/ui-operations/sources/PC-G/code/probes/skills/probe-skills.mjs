// Probe: inspect skills iframe structure (import button, list, search).
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const frame = page.frames().find(f => f.url().includes('supcon-skills'));
  if (!frame) { console.log('no skills frame; frames=', page.frames().map(f => f.url())); }
  else {
    const dump = await frame.evaluate(() => {
      const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
      const btns = [...document.querySelectorAll('button,[role="button"],[role="tab"],input')].filter(vis).map(b => ({ tag: b.tagName, t: (b.innerText || b.value || '').trim().slice(0, 40), aria: b.getAttribute('aria-label'), ph: b.getAttribute('placeholder'), type: b.getAttribute('type') }));
      return { url: location.href, btns, body: document.body.innerText.slice(0, 1500), inputs: [...document.querySelectorAll('input[type=file]')].length };
    });
    console.log(JSON.stringify(dump, null, 2));
  }
} finally { await browser.close(); }
