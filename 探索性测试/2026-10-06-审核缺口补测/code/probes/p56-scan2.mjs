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
    if (fs.existsSync(fp)) files.push({ fp, m: fs.statSync(fp).mtimeMs, size: fs.statSync(fp).size });
  }
}
files.sort((a, b) => b.size - a.size);
let shown = 0;
for (const f of files) {
  let text = '';
  try { text = zlib.zstdDecompressSync(fs.readFileSync(f.fp)).toString('utf8'); } catch { continue; }
  if (/fast-assert|FAST_SKILL|FAST_RICH|skill_content/.test(text)) {
    console.log('=== ', f.fp, 'len', text.length);
    const lines = text.split(/\r?\n/).filter((l) => /fast-assert|FAST_SKILL|FAST_RICH|skill_content/.test(l));
    for (const l of lines.slice(0, 4)) console.log(l.slice(0, 400));
    if (++shown >= 4) break;
  }
}
if (!shown) console.log('no matches; sample largest file:');
if (!shown) {
  const f = files[0];
  const text = zlib.zstdDecompressSync(fs.readFileSync(f.fp)).toString('utf8');
  console.log(f.fp, text.length);
  console.log(text.slice(0, 1200));
}
