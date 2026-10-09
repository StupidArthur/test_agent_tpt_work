import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const base = 'C:\\Users\\Administrator\\.tpt-work\\dsh\\sessions';
const files = [];
for (const d of fs.readdirSync(base, { withFileTypes: true }).filter((x) => x.isDirectory())) {
  const sub = path.join(base, d.name);
  for (const s of fs.readdirSync(sub)) {
    const sp = path.join(sub, s);
    if (!fs.statSync(sp).isDirectory()) continue;
    const fp = path.join(sp, 'session.v4.jsonl.zstd');
    if (fs.existsSync(fp)) files.push({ fp, m: fs.statSync(fp).mtimeMs });
  }
}
files.sort((a, b) => b.m - a.m);
console.log('files', files.length);
let found = 0;
for (const f of files.slice(0, 60)) {
  let text = '';
  try { text = zlib.zstdDecompressSync(fs.readFileSync(f.fp)).toString('utf8'); } catch { continue; }
  if (/skill_content/.test(text) && /fast-assert|FAST_SKILL|FAST_RICH/.test(text)) {
    console.log('=== MATCH', f.fp, 'len', text.length);
    const lines = text.split(/\r?\n/).filter(Boolean);
    for (const l of lines) if (/skill_content|fast-assert|FAST_SKILL|FAST_RICH/.test(l)) console.log(l.slice(0, 500));
    if (++found >= 3) break;
  }
}
