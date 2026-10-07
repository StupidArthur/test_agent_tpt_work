// Probe: extract skill_content resource line from trace.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const body = await page.locator('body').innerText();
  let i = body.indexOf('skill_content');
  const hits = [];
  while (i >= 0 && hits.length < 5) { hits.push(body.slice(Math.max(0, i - 250), i + 250)); i = body.indexOf('skill_content', i + 1); }
  console.log(JSON.stringify(hits, null, 2));
} finally { await browser.close(); }
