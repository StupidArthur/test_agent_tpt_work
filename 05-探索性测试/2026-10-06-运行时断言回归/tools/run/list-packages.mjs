import fs from 'node:fs';
import path from 'node:path';
const base = path.join('夹具', '本轮', '20261006-oc1', 'packages');
for (const d of ['root', 'collection', 'mixed', 'trash']) {
  const files = [];
  (function walk(p) { for (const f of fs.readdirSync(p)) { const fp = path.join(p, f); if (fs.statSync(fp).isDirectory()) walk(fp); else files.push(fp); } })(path.join(base, d));
  console.log('====' + d + '====');
  for (const f of files) {
    if (/SKILL\.md$/.test(f)) { const t = fs.readFileSync(f, 'utf8'); const m = t.match(/name:\s*"?([^"\n]+)"?/); console.log(path.relative(base, f), '=>', m ? m[1] : '(no name)'); }
    else console.log(path.relative(base, f));
  }
}
