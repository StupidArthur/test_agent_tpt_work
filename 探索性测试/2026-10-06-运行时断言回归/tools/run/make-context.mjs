import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { root, fixtureRoot, runSuffix, environmentId, project, withApp, sleep } from './lib.mjs';

const require = createRequire(import.meta.url);
const { createRecorder } = require(path.join(root, 'tools', 'record.cjs'));

const reads = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'run', 'scratch', 'context-reads.json'), 'utf8'));
const extraPath = path.join(root, 'tools', 'run', 'scratch', 'context-extra.json');
const extra = fs.existsSync(extraPath) ? JSON.parse(fs.readFileSync(extraPath, 'utf8')) : {};
const fixture = JSON.parse(fs.readFileSync(path.join(fixtureRoot, '预期绑定.json'), 'utf8'));

const chosenAt = new Date().toISOString();
const fixturePath = path.relative(root, path.join(fixtureRoot, '预期绑定.json')).replaceAll('\\', '/');

// read the currently selected project name from the sidebar (real read event)
const log = createRecorder(root, { environment_id: environmentId, group: 'CTX' });
let projectReadEvent = null;
await withApp(async (page) => {
  const name = await page.evaluate(() => {
    const el = [...document.querySelectorAll('.YDXeBa_title')].find(e => (e.textContent || '').trim());
    return el ? el.textContent.trim() : null;
  });
  const e = await log.read('侧栏当前项目名', 'project.tpt-workspace', { channel: 'dom', scope: '左侧栏项目树/项目标题', locator: '.YDXeBa_projectRow .YDXeBa_title' }, async () => ({ value: name, raw: { title: name }, derivation: 'selected project row title text' }));
  projectReadEvent = e.event_id;
  console.log('project read =', name, e.event_id);
});

const ctx = {
  project: 'tpt-workspace',
  skill_name: 'fast-assert-skill-' + runSuffix,
  expert_resource: 'agent-fast-assert-expert-' + runSuffix,
  theme_initial: reads.theme.value,
  theme_changed: '深色',
  language_initial: reads.language.value,
  font_initial: reads.font.value,
  font_changed: 16,
  permission_initial: reads.permission.value,
  scene_initial: reads.scene.value,
  extension_run: runSuffix,
  extension_fixture_root: fixtureRoot,
  attachment_long_name: fixture.attachment_long_name,
  variant_cn_tech_name: fixture.variant_cn_tech_name,
  collection_expected_names: fixture.collection_expected_names,
  mixed_expected_status: fixture.mixed_expected_status,
  work_steps_initial: reads.work_steps.value,
  work_steps_changed: '详细',
  usage_initial: reads.usage.value,
  memory_initial: reads.memory.value,
  memory_changed: true,
  evolution_initial: reads.evolution.value,
  evolution_changed: true,
  experimental_initial: reads.experimental.value,
  experimental_changed: true,
  developer_initial: reads.developer.value,
  developer_changed: true,
  code_tools_initial: reads.code_tools.value,
  busy_initial: reads.busy.value,
  link_initial: reads.link.value,
  flow_file: 'FAST_FLOW_INPUT',
};

const sources = {
  project: { kind: 'read', event_id: projectReadEvent },
  skill_name: { kind: 'fixture', path: fixturePath },
  expert_resource: { kind: 'fixture', path: fixturePath },
  theme_initial: { kind: 'read', event_id: reads.theme.event },
  theme_changed: { kind: 'chosen', chosen_at: chosenAt, reason: '预先选择与初值不同的深色，用于验证保存与恢复' },
  language_initial: { kind: 'read', event_id: reads.language.event },
  font_initial: { kind: 'read', event_id: reads.font.event },
  font_changed: { kind: 'chosen', chosen_at: chosenAt, reason: '预先选择不同字号16用于保存/行为/恢复' },
  permission_initial: { kind: 'read', event_id: reads.permission.event },
  scene_initial: { kind: 'read', event_id: reads.scene.event },
  extension_run: { kind: 'fixture', path: fixturePath },
  extension_fixture_root: { kind: 'fixture', path: fixturePath },
  attachment_long_name: { kind: 'fixture', path: fixturePath },
  variant_cn_tech_name: { kind: 'fixture', path: fixturePath },
  collection_expected_names: { kind: 'fixture', path: fixturePath },
  mixed_expected_status: { kind: 'fixture', path: fixturePath },
  work_steps_initial: { kind: 'read', event_id: reads.work_steps.event },
  work_steps_changed: { kind: 'chosen', chosen_at: chosenAt, reason: '预先选择与标准不同的详细步骤展示' },
  usage_initial: { kind: 'read', event_id: reads.usage.event },
  memory_initial: { kind: 'read', event_id: reads.memory.event },
  memory_changed: { kind: 'chosen', chosen_at: chosenAt, reason: '预先选择与初值相反的内存开关值' },
  evolution_initial: { kind: 'read', event_id: reads.evolution.event },
  evolution_changed: { kind: 'chosen', chosen_at: chosenAt, reason: '预先选择与初值相反的沉淀开关值' },
  experimental_initial: { kind: 'read', event_id: reads.experimental.event },
  experimental_changed: { kind: 'chosen', chosen_at: chosenAt, reason: '预先选择与初值相反的实验总开关值' },
  developer_initial: { kind: 'read', event_id: reads.developer.event },
  developer_changed: { kind: 'chosen', chosen_at: chosenAt, reason: '预先选择与初值相反的开发者模式值' },
  code_tools_initial: { kind: 'read', event_id: reads.code_tools.event },
  busy_initial: { kind: 'read', event_id: reads.busy.event },
  link_initial: { kind: 'read', event_id: reads.link.event },
  flow_file: { kind: 'fixture', path: fixturePath },
};

for (const [k, v] of Object.entries(extra.values || {})) ctx[k] = v;
for (const [k, v] of Object.entries(extra.sources || {})) sources[k] = v;

const out = { ...ctx, binding_sources: sources };
fs.writeFileSync(path.join(root, '运行上下文.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(out, null, 2));
