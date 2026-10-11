import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { root, runSuffix, fixtureRoot, environmentId, project } from './lib.mjs';

const projectPath = 'D:\\code\\tpt-workspace';
const workDir = path.join(projectPath, '.fast-assert-' + runSuffix);
fs.mkdirSync(workDir, { recursive: true });

const w = (name, content) => fs.writeFileSync(path.join(workDir, name), content, 'utf8');
if (!fs.existsSync(path.join(workDir, 'flow.txt'))) w('flow.txt', 'FAST_FLOW_INPUT\n');
const longLines = [];
for (let i = 1; i <= 200; i++) longLines.push('FAST_LONG_LINE_' + String(i).padStart(3, '0'));
w('long.txt', longLines.join('\n') + '\n');
w('code-on.js', 'module.exports = 0;\n');
w('code-off.js', 'module.exports = 0;\n');
const deliver = path.join(workDir, 'deliver.txt');
if (fs.existsSync(deliver)) fs.unlinkSync(deliver);

const sha256File = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const exe = 'C:\\Users\\Administrator\\AppData\\Local\\Programs\\tpt-work\\tpt-work.exe';
const asar = 'C:\\Users\\Administrator\\AppData\\Local\\Programs\\tpt-work\\resources\\app.asar';
const queue = path.join(root, '用例', 'cases.json');

const env = {
  environment_id: environmentId,
  captured_at: new Date().toISOString(),
  cdp_endpoint: 'http://127.0.0.1:9234',
  project: { name: project, path: projectPath, workspace_id: 'd9870629-a04a-4864-b847-356a0c526304' },
  app_identity: {
    path: exe,
    sha256: sha256File(exe),
    asar_path: asar,
    asar_sha256: sha256File(asar),
    version: '0.2.0-rc.1',
  },
  account_alias: 'Arthur',
  fixture_manifest: path.relative(root, path.join(fixtureRoot, '夹具索引.json')).replaceAll('\\', '/'),
  queue_sha256: sha256File(queue),
  work_dir: workDir,
};
fs.writeFileSync(path.join(root, '环境记录.json'), JSON.stringify(env, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ workDir, env }, null, 2));
