const fs = require('fs');
const path = require('path');
const os = require('os');

const ASAR = path.join(process.env.LOCALAPPDATA, 'Programs', 'tpt-work', 'resources', 'app.asar');
const OUTDIR = process.argv[2];
const buf = fs.readFileSync(ASAR);
const headerBufLen = buf.readUInt32LE(4);
const jsonLen = buf.readUInt32LE(12);
const header = JSON.parse(buf.toString('utf8', 16, 16 + jsonLen));
const dataStart = 8 + headerBufLen;

const files = [];
(function walk(node, prefix) {
  for (const [name, v] of Object.entries(node.files || {})) {
    const full = prefix ? prefix + '/' + name : name;
    if (v.files) walk(v, full);
    else files.push({ p: full, size: Number(v.size) || 0, off: Number(v.offset) || 0 });
  }
})(header, '');

const byPath = new Map(files.map(f => [f.p, f]));
fs.mkdirSync(OUTDIR, { recursive: true });

const pats = process.argv.slice(3);
let n = 0;
for (const f of files) {
  if (!pats.some(p => f.p.includes(p))) continue;
  const a = dataStart + f.off;
  if (a + f.size > buf.length) { console.log('SKIP(越界) ' + f.p); continue; }
  const out = path.join(OUTDIR, f.p.replace(/[\/\\]/g, '__'));
  fs.writeFileSync(out, buf.subarray(a, a + f.size));
  console.log('OK  ' + f.size + ' B  ' + f.p);
  n++;
}
console.log('共导出 ' + n + ' 个文件 → ' + OUTDIR);
