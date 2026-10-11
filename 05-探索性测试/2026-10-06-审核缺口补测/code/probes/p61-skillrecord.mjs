import fs from 'node:fs';
import { withApp } from '../automation/tpt.mjs';
const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
await withApp(ctx, async (page) => {
  const info = await page.evaluate(() => {
    const leaf = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && /invoked the skill|技能|skill_content/i.test(e.textContent || '') && /fast-assert/.test(e.textContent || ''));
    if (!leaf) return null;
    const chain = [];
    let el = leaf;
    for (let i = 0; i < 6 && el; i++) { chain.push({ tag: el.tagName, cls: (el.className || '').toString().slice(0, 50), slot: el.getAttribute && el.getAttribute('data-slot'), text: (el.textContent || '').replace(/\s+/g, ' ').slice(0, 200) }); el = el.parentElement; }
    return { leaf: leaf.outerHTML.slice(0, 500), chain };
  });
  console.log(JSON.stringify(info, null, 2));
});
