const fs = require('fs');
const path = require('path');
const p = path.join(process.env.LOCALAPPDATA, 'Programs', 'tpt-work', 'resources', 'app.asar');

const buf = fs.readFileSync(p);
// asar: [0]=4 | [4]=headerBufLen | [8]=4 | [12]=jsonLen | [16..] json | data
const headerBufLen = buf.readUInt32LE(4);
const jsonLen = buf.readUInt32LE(12);
const jsonStart = 16;
const header = JSON.parse(buf.toString('utf8', jsonStart, jsonStart + jsonLen));
const dataStart = 8 + headerBufLen;

const files = [];
(function walk(node, prefix) {
  for (const [name, v] of Object.entries(node.files || {})) {
    const full = prefix ? prefix + '/' + name : name;
    if (v.files) walk(v, full);
    else files.push({ p: full, size: Number(v.size) || 0, off: Number(v.offset) || 0 });
  }
})(header, '');
files.sort((a, b) => a.off - b.off);

console.log('文件数=' + files.length + ' headerBufLen=' + headerBufLen + ' jsonLen=' + jsonLen + ' dataStart=' + dataStart);

// 自校验
const f0 = files[0];
const head0 = buf.toString('utf8', dataStart + f0.off, dataStart + f0.off + 40);
console.log('自校验: 首文件 "' + f0.p + '" 开头 = ' + JSON.stringify(head0));

function absOf(f) { return dataStart + f.off; }
function findFile(byteOff) {
  let lo = 0, hi = files.length - 1, best = null;
  while (lo <= hi) { const m = (lo + hi) >> 1; const a = absOf(files[m]); if (byteOff >= a) { best = files[m]; lo = m + 1; } else hi = m - 1; }
  if (!best) return null;
  const a = absOf(best);
  return (byteOff < a + best.size) ? { f: best, inner: byteOff - a } : null;
}

for (const n of process.argv.slice(2)) {
  const nb = Buffer.from(n, 'utf8');
  let i = -1, c = 0;
  console.log('\n### ' + n);
  while ((i = buf.indexOf(nb, i + 1)) >= 0 && c < 4) {
    c++;
    const hit = findFile(i);
    console.log('  ' + (hit ? hit.f.p + '  (文件内偏移 ' + hit.inner + ' / ' + hit.f.size + ' B)' : 'byte@' + i + ' 未落在文件区间'));
  }
  if (!c) console.log('  （未找到）');
}
