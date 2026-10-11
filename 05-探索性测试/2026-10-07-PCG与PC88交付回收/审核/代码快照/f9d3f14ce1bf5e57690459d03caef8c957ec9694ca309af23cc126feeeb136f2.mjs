import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const protectedNames = new Set(['soul.md','agents.md','user.md','memory.md','index.json','audit.jsonl','.reflection-state.json']);
const within = (root, target) => { const rel = path.relative(root, target); return rel && !rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel); };

// Restore a recorded absent baseline, not a general-purpose delete operation.
export async function removeCreatedFile(ctx, args) {
  const target = path.resolve(args.path);
  if (!/^[a-f0-9]{64}$/i.test(args.expectedSha256 || '')) throw Error('Current expectedSha256 required');
  if (protectedNames.has(path.basename(target).toLowerCase())) throw Error('Protected memory file');
  const roots = [ctx.taskRoot, ctx.environment.memory_root, ctx.environment.project_path].filter(Boolean).map(p => path.resolve(p));
  const root = roots.find(p => within(p, target));
  if (!root) throw Error('Target outside task/environment roots');
  // Reject links/junctions along the entire selected path, including its root.
  for (let p = target; ; p = path.dirname(p)) {
    try { if (fs.lstatSync(p).isSymbolicLink()) throw Error('Linked path not allowed'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (p === path.dirname(p)) break;
  }
  const realRoot = fs.realpathSync(root);
  const realParent = fs.realpathSync(path.dirname(target));
  if (realParent !== realRoot && !within(realRoot, realParent)) throw Error('Resolved target outside root');
  const events = fs.readFileSync(path.join(ctx.taskRoot, '运行日志/business.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const baseline = events.find(e => e.event_id === args.absentReadRef);
  if (!baseline || baseline.kind !== 'read' || baseline.environment_id !== ctx.environment.environment_id || baseline.value !== null || baseline.raw?.exists !== false || !baseline.raw?.path || path.resolve(baseline.raw.path) !== target) {
    throw Error('Require this task fixtures.readFile event proving target originally absent');
  }
  if (!fs.existsSync(target)) throw Error('Target already absent; read current state instead');
  if (!fs.lstatSync(target).isFile()) throw Error('Only one regular file can be removed');
  const before = fs.readFileSync(target);
  if (sha(before) !== args.expectedSha256.toLowerCase()) throw Error('File changed since expected hash');
  const action = await ctx.recorder.action('恢复本轮新增文件为不存在', 'removeCreatedFile', {path: target, expectedSha256: args.expectedSha256, absentReadRef: args.absentReadRef}, async () => {
    if (sha(fs.readFileSync(target)) !== args.expectedSha256.toLowerCase()) throw Error('File changed before cleanup');
    fs.unlinkSync(target);
  });
  const read = await ctx.recorder.read('恢复后文件存在性', target, {channel:'file',scope:target,event_refs:[args.absentReadRef]}, async () => ({value:{exists:fs.existsSync(target),path:target,removedSha256:sha(before)},raw:{bytes:before.length}}));
  return {action_refs:[action.event_id], observations:{read}};
}
