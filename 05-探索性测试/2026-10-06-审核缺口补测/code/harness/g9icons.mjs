import { saveResult, callEvents } from './results.mjs';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', '..');
const calls = fs.readFileSync(path.join(root, '运行日志', '业务调用.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
const call = calls.find((c) => c.call_id === 'CALL-3ddc3c4b-fde7-46b6-a627-f789ccc339be');
const ev = callEvents(call.call_id);
const byTarget = (t) => ev.filter((e) => e.target === t);
const ENV = 'env-20261006-agent2';

const richIcon = byTarget('rich包图标加载')[0];
const richSrc = byTarget('rich图标资源来自该安装包')[0];
const miExists = byTarget('缺图标包存在')[0];
const miFallback = byTarget('缺图标包降级图标')[0];
const bpValid = byTarget('伪PNG被作为有效图像')[0];
const bpFallback = byTarget('伪PNG默认图标降级')[0];
const acts = (t) => byTarget(t).filter((e) => e.kind === 'action').map((e) => e.event_id);

saveResult('G9-12', {
  environment_id: ENV, attempt_id: 'G9-12-A02', started_at: call.started_at, ended_at: call.ended_at,
  object_identity: 'fast-assert-rich-20261006-agent2 卡片图标',
  inputs: ['zips/rich.zip'], action_refs: acts('导入rich.zip'),
  actual_steps: ['导入rich.zip', '按内部名定位本轮卡片', '读取该卡片图标img的complete/naturalWidth与src', '核对src资源是否属于本轮安装包'],
  assertions: [
    { id: 'G9-12-A1', actual: richIcon.value, read_refs: [richIcon.event_id] },
    { id: 'G9-12-A2', actual: richSrc.value, read_refs: [richSrc.event_id] },
  ],
  cleanup: { status: 'retained', description: '本轮导入对象保留待审', read_refs: [] },
  business_call_refs: [call.call_id],
  notes: '原问题：显示img仍是默认SVG，安装目录存在文件不证明自定义PNG被展示。本轮按内部名定位卡片读取img：complete=true且naturalWidth=48(A1通过)，但src为data:image/svg+xml默认SVG而非安装包assets/icon.png(A2=false)。',
});

saveResult('G9-13', {
  environment_id: ENV, attempt_id: 'G9-13-A02', started_at: call.started_at, ended_at: call.ended_at,
  object_identity: 'fast-assert-missing-icon-20261006-agent2 卡片图标',
  inputs: ['zips/missing-icon.zip'], action_refs: acts('导入missing-icon.zip'),
  actual_steps: ['导入missing-icon.zip', '按内部名定位本轮卡片', '读取图标节点资源URI与加载状态'],
  assertions: [
    { id: 'G9-13-A1', actual: miExists.value, read_refs: [miExists.event_id] },
    { id: 'G9-13-A2', actual: miFallback.value, read_refs: [miFallback.event_id] },
  ],
  cleanup: { status: 'retained', description: '本轮导入对象保留待审', read_refs: [] },
  business_call_refs: [call.call_id],
  notes: '原问题：hasSVG可能来自其他图标。本轮按内部名定位卡片图标节点：产品默认SVG图标显示且无broken img。raw含src。',
});

saveResult('G9-14', {
  environment_id: ENV, attempt_id: 'G9-14-A02', started_at: call.started_at, ended_at: call.ended_at,
  object_identity: 'fast-assert-bad-png-20261006-agent2 卡片图标',
  inputs: ['zips/bad-png.zip'], action_refs: acts('导入bad-png.zip'),
  actual_steps: ['导入bad-png.zip', '按内部名定位本轮卡片', '读取图标src/资源身份判断是否为本轮伪PNG', '读取默认图标降级'],
  assertions: [
    { id: 'G9-14-A1', actual: bpValid.value, read_refs: [bpValid.event_id] },
    { id: 'G9-14-A2', actual: bpFallback.value, read_refs: [bpFallback.event_id] },
  ],
  cleanup: { status: 'retained', description: '本轮导入对象保留待审', read_refs: [] },
  business_call_refs: [call.call_id],
  notes: '原问题：原始img是已加载默认SVG被误判为坏PNG渲染。本轮核对src：图标为产品默认SVG(data:image/svg+xml)，src不指向安装包伪PNG，A1=false(未被当有效图像)，A2=true(默认降级)。',
});

console.log('g9 icons results written');
