import fs from 'node:fs';
import path from 'node:path';
import { root, fixtureRoot, runSuffix } from './lib.mjs';

const skillSrc = path.join(root, '夹具', 'skill-template', 'SKILL.md');
const skillDst = path.join(fixtureRoot, 'skill-import');
fs.mkdirSync(skillDst, { recursive: true });
fs.writeFileSync(path.join(skillDst, 'SKILL.md'), fs.readFileSync(skillSrc, 'utf8').replaceAll('suffix', runSuffix), 'utf8');

const expertSrc = path.join(root, '夹具', 'expert-template');
const expertDst = path.join(fixtureRoot, 'expert-import');
fs.mkdirSync(expertDst, { recursive: true });
for (const f of fs.readdirSync(expertSrc)) {
  fs.writeFileSync(path.join(expertDst, f), fs.readFileSync(path.join(expertSrc, f), 'utf8').replaceAll('suffix', runSuffix), 'utf8');
}

// bad packages from base fixtures (not in 扩展)
for (const d of ['expert-missing-agent', 'expert-bad-json']) {
  const src = path.join(root, '夹具', d);
  const dst = path.join(fixtureRoot, d);
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) fs.writeFileSync(path.join(dst, f), fs.readFileSync(path.join(src, f)));
}
console.log('prepared skill-import and expert-import');
console.log(fs.readFileSync(path.join(skillDst, 'SKILL.md'), 'utf8'));
