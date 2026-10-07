'use strict';
/* extra-extract.cjs <asar> <outdir> <path...> : 只读导出指定 asar 内路径 */
const fs = require('fs');
const path = require('path');
const ASAR = process.argv[2];
const OUTDIR = process.argv[3];
const targets = process.argv.slice(4);
const flat = (p) => p.replace(/\//g, '__');

const fd = fs.openSync(ASAR, 'r');
const h = Buffer.alloc(16);
fs.readSync(fd, h, 0, 16, 0);
const hbl = h.readUInt32LE(4), jl = h.readUInt32LE(12);
const b = Buffer.alloc(hbl);
fs.readSync(fd, b, 0, hbl, 8);
const j = JSON.parse(b.slice(8, 8 + jl).toString('utf8'));
const dataStart = 8 + hbl;
const files = new Map();
(function rec(n, pre) {
  if (n.files) { for (const [k, c] of Object.entries(n.files)) rec(c, pre ? pre + '/' + k : k); }
  else if (n.offset !== undefined) files.set(pre, n);
})(j, '');

fs.mkdirSync(OUTDIR, { recursive: true });
for (const t of targets) {
  const e = files.get(t);
  if (!e) { console.log('MISSING: ' + t); continue; }
  const buf = Buffer.alloc(e.size);
  fs.readSync(fd, buf, 0, e.size, dataStart + Number(e.offset));
  const out = path.join(OUTDIR, flat(t));
  fs.writeFileSync(out, buf);
  const text = buf.toString('utf8');
  const kw = ['归档', '撤销', '未读', '标记为未读', '分享任务', 'Fork', '重命名', '置顶', '搜索', '三选一', '停止并归档'];
  const counts = kw.map((k) => k + '=' + (text.split(k).length - 1)).join(' ');
  console.log(`OK ${t} bytes=${buf.length}`);
  console.log('   ' + counts);
}
fs.closeSync(fd);
