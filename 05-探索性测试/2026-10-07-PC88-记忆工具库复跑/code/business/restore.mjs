// 任务函数：删除本轮新增的夹具/副产物文件（仅限 memory_root 内、非核心记忆文件）。
// 主库 fixtures 只有 backup/read/write/restore，没有删除能力；恢复“本轮新增文件”需要本函数。
// 调用者必须先独立读到该文件真实 SHA-256，并在 args.expectedSha256 传入，删除前再次核对。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const sha = (data) => crypto.createHash('sha256').update(data).digest('hex');
const PROTECTED = new Set(['SOUL.md', 'AGENTS.md', 'USER.md', 'MEMORY.md', 'index.json', 'audit.jsonl', '.reflection-state.json']);

export async function deleteNewFile(ctx, args = {}) {
  const root = path.resolve(ctx.environment.memory_root);
  const p = path.resolve(args.path);
  const rel = path.relative(root, p);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('Refuse to delete outside memory_root: ' + p);
  if (PROTECTED.has(path.basename(p))) throw new Error('Refuse to delete protected memory file: ' + path.basename(p));
  if (!fs.existsSync(p)) return { observations: { read: await ctx.recorder.read('待删除文件不存在', p, { channel: 'file', scope: p }, async () => ({ value: { exists: false, path: p }, raw: {} })) } };
  const before = fs.readFileSync(p);
  const beforeSha = sha(before);
  if (args.expectedSha256 && args.expectedSha256 !== beforeSha) throw new Error('File hash differs from expected before delete: ' + beforeSha);
  const action = await ctx.recorder.action('删除本轮新增文件', 'deleteNewFile', { path: p, sha256: beforeSha }, async () => { fs.unlinkSync(p); });
  const read = await ctx.recorder.read('删除后存在性', p, { channel: 'file', scope: p }, async () => ({ value: { exists: fs.existsSync(p), path: p, deletedSha256: beforeSha, bytes: before.length }, raw: {} }));
  return { action_refs: [action.event_id], observations: { read } };
}
