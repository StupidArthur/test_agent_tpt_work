'use strict';

/*
 * asar-extract.cjs - 只读解析 Electron app.asar，导出指定 README / 源码文件。
 * 用法: node asar-extract.cjs
 * 不修改被导出源文件，不启动/关闭任何进程。
 */

const fs = require('fs');
const path = require('path');

const ASAR = process.argv[2] || 'C:\\Users\\yuzechao\\AppData\\Local\\Programs\\tpt-work\\resources\\app.asar';
const OUTDIR = process.argv[3] || 'F:\\electron-ui\\tpt-work-notes\\20260929_2153\\refs';

// 导出文件名规则: 路径中的 '/' 换成 '__'
function flatName(p) {
  return p.replace(/\//g, '__');
}

function main() {
  fs.mkdirSync(OUTDIR, { recursive: true });

  const fd = fs.openSync(ASAR, 'r');
  try {
    const hdr = Buffer.alloc(16);
    fs.readSync(fd, hdr, 0, 16, 0);

    const u32_0 = hdr.readUInt32LE(0);   // 应为 4
    const headerBufLen = hdr.readUInt32LE(4);
    const u32_8 = hdr.readUInt32LE(8);   // 应为 4
    const jsonLen = hdr.readUInt32LE(12);

    const headerBuf = Buffer.alloc(headerBufLen);
    fs.readSync(fd, headerBuf, 0, headerBufLen, 8);

    // headerBuf 覆盖文件偏移 [8, 8+headerBufLen)，其内部为 Pickle：
    //   [0..4) = u32_8（内层 payload 长度）、[4..8) = jsonLen、[8..] = JSON 文本
    // 即 JSON 位于文件偏移 16，相对 headerBuf 起始的偏移为 8。
    const jsonStart = 8;
    const jsonStr = headerBuf.slice(jsonStart, jsonStart + jsonLen).toString('utf8');

    let header;
    let parsePath = 'primary';
    try {
      header = JSON.parse(jsonStr);
    } catch (e) {
      parsePath = 'fallback-regex';
      // 替代解析：正则定位 JSON 边界
      const s = headerBuf.toString('utf8');
      const a = s.indexOf('{');
      const b = s.lastIndexOf('}');
      header = JSON.parse(s.slice(a, b + 1));
    }

    const dataStart = 8 + headerBufLen;

    // 遍历文件表，收集所有文件条目
    const all = [];
    function walk(node, prefix) {
      if (!node || typeof node !== 'object') return;
      if (node.files) {
        for (const [name, child] of Object.entries(node.files)) {
          walk(child, prefix ? prefix + '/' + name : name);
        }
      } else if (typeof node.offset !== 'undefined' && typeof node.size !== 'undefined') {
        all.push({ path: prefix, size: node.size, offset: node.offset });
      }
    }
    walk(header, '');

    const readEntry = (entry) => {
      const buf = Buffer.alloc(entry.size);
      fs.readSync(fd, buf, 0, entry.size, dataStart + Number(entry.offset));
      return buf;
    };

    const report = {
      asar: ASAR,
      header: { u32_0, headerBufLen, u32_8, jsonLen, dataStart },
      totalFiles: all.length,
      readmes: [],
      sourceFiles: [],
      missing: [],
    };

    const hdrInfo = {
      magic0: u32_0, headerBufLen, magic8: u32_8, jsonLen, dataStart,
      fileCount: all.length, parsePath,
    };

    // 2. README 匹配
    const reDsh = /README\.(zh\.)?md$/;
    const readmeTargets = all.filter((f) =>
      reDsh.test(f.path) && f.path.includes('dsh-client-ui-')
    );
    const readmeTpt = all.filter((f) =>
      reDsh.test(f.path) && f.path.includes('@tpt-work/')
    );

    // 4. 源码文件
    const srcTargets = [
      'dsh/node_modules/@deepseek-ai/dsh-client-ui-workspace/lib/client.js',
      'dsh/node_modules/@deepseek-ai/dsh-client-ui-sidebar/lib/client.js',
    ].map((p) => ({ want: p, entry: all.find((f) => f.path === p) }));

    const exported = [];

    const dump = (entry, kind) => {
      const buf = readEntry(entry);
      const outPath = path.join(OUTDIR, flatName(entry.path));
      fs.writeFileSync(outPath, buf);
      exported.push({
        kind, path: entry.path, outPath,
        bytes: buf.length,
        text: buf.toString('utf8'),
      });
    };

    for (const e of readmeTargets) dump(e, 'readme-dsh');
    for (const e of readmeTpt) dump(e, 'readme-tpt');
    for (const s of srcTargets) {
      if (s.entry) dump(s.entry, 'source');
      else report.missing.push(s.want);
    }

    // 5. 关键词统计
    const KEYWORDS = ['归档', '撤销', '未读', '标记为未读', '分享任务', 'Fork', '重命名', '置顶', '搜索', '三选一', '停止并归档'];
    const counts = exported.map((f) => {
      const row = { path: f.path, bytes: f.bytes };
      for (const k of KEYWORDS) {
        row[k] = f.text ? f.text.split(k).length - 1 : 0;
      }
      return row;
    });

    report.readmes = readmeTargets.map((f) => f.path).concat(readmeTpt.map((f) => f.path));
    report.exported = exported.map((f) => ({ kind: f.kind, path: f.path, bytes: f.bytes }));
    report.keywords = KEYWORDS;
    report.counts = counts;

    // 6. 摘录 workspace README.zh.md 的三段上下文（各 800 字）
    const wsZh = exported.find((f) => f.path.endsWith('dsh-client-ui-workspace/README.zh.md'));
    const excerpts = [];
    if (wsZh) {
      const text = wsZh.text;
      const targets = ['归档成功后的提示', '视图选项', '不经过确认对话框'];
      for (const t of targets) {
        const idx = text.indexOf(t);
        if (idx < 0) { excerpts.push({ keyword: t, found: false, text: '' }); continue; }
        const start = Math.max(0, idx - 400);
        const end = Math.min(text.length, idx + 400);
        excerpts.push({ keyword: t, found: true, at: idx, text: text.slice(start, end) });
      }
    }
    fs.writeFileSync(path.join(OUTDIR, '_extract-report.json'),
      JSON.stringify(report, null, 2), 'utf8');
    fs.writeFileSync(path.join(OUTDIR, '_excerpts.json'),
      JSON.stringify(excerpts, null, 2), 'utf8');
    fs.writeFileSync(path.join(OUTDIR, '_hdr.json'),
      JSON.stringify(hdrInfo, null, 2), 'utf8');

    console.log(JSON.stringify({
      header: hdrInfo,
      exportedCount: exported.length,
      exported: report.exported,
      missing: report.missing,
      keywords: report.keywords,
      counts,
      excerptFound: excerpts.map((e) => ({ keyword: e.keyword, found: e.found, at: e.at })),
    }, null, 2));
  } finally {
    fs.closeSync(fd);
  }
}

try {
  main();
} catch (e) {
  console.error('FAILED:', e && e.stack ? e.stack : e);
  process.exit(1);
}
