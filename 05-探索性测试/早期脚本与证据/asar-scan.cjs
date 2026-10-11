'use strict';
const fs = require('fs');
const p = process.argv[2];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pat = process.argv[3] ? new RegExp(process.argv[3]) : /@tpt-work\//;
const fd = fs.openSync(p, 'r');
const h = Buffer.alloc(16);
fs.readSync(fd, h, 0, 16, 0);
const hbl = h.readUInt32LE(4), jl = h.readUInt32LE(12);
const b = Buffer.alloc(hbl);
fs.readSync(fd, b, 0, hbl, 8);
const j = JSON.parse(b.slice(8, 8 + jl).toString('utf8'));
fs.closeSync(fd);
const paths = [];
const rec = (n, pre) => {
  if (n.files) { for (const [k, c] of Object.entries(n.files)) rec(c, pre ? pre + '/' + k : k); }
  else if (n.offset !== undefined) paths.push(pre);
};
rec(j, '');
const hit = paths.filter((x) => pat.test(x));
console.log('matched files: ' + hit.length);
const pkgs = [...new Set(hit.map((x) => {
  const m = x.match(/(?:node_modules\/)?(@[^/]+\/[^/]+)/g);
  return m ? m[m.length - 1] : '(none)';
}))];
console.log('distinct @-scoped package dirs (' + pkgs.length + '):');
console.log(pkgs.sort().join('\n'));
if (process.argv[4] === '--list') console.log(hit.slice(0, 200).join('\n'));
