import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const base = 'C:\\Users\\Administrator\\.tpt-work\\dsh\\sessions';
const dirs = fs.readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
// find the most recently modified session file
let best = null;
for (const d of dirs) {
  const sub = path.join(base, d);
  for (const s of fs.readdirSync(sub)) {
    const sp = path.join(sub, s);
    if (!fs.statSync(sp).isDirectory()) continue;
    for (const f of fs.readdirSync(sp)) {
      const fp = path.join(sp, f);
      const m = fs.statSync(fp).mtimeMs;
      if (!best || m > best.m) best = { fp, m, name: f };
    }
  }
}
console.log('latest', best && best.fp);
const raw = fs.readFileSync(best.fp);
let text;
try {
  text = zlib.zstdDecompressSync ? zlib.zstdDecompressSync(raw).toString('utf8') : 'no-zstd';
} catch (e) { text = 'ERR ' + e.message; }
console.log('decompressed length', text.length);
console.log(text.slice(0, 1500));
console.log('--- has skill_content?', /skill_content/.test(text), 'has rich name?', /fast-assert-rich/.test(text));
