import path from 'node:path';
// CLI presentation only: invoke(), return.json and recorder evidence stay complete.
export function compactReturn(result, taskRoot) {
  let omittedRaw = 0, truncated = 0;
  const walk = (v) => {
    if (typeof v === 'string' && v.length > 2000) { truncated++; return { preview: v.slice(0, 2000), length: v.length, truncated: true }; }
    if (Array.isArray(v)) { const values = v.slice(0, 10).map(walk); if (v.length > 10) { truncated++; return { items: values, total: v.length, truncated: true }; } return values; }
    if (!v || typeof v !== 'object') return v;
    return Object.fromEntries(Object.entries(v).filter(([key]) => { if (key === 'raw') { omittedRaw++; return false; } return true; }).map(([key, value]) => [key, walk(value)]));
  };
  const shown = walk(result);
  return { ...shown, presentation: { mode: 'compact', omittedRaw, truncated, fullReturnPath: path.join(taskRoot, '审核/函数调用', result.call_id, 'return.json'), notice: 'Truncated values are previews, not complete assertion inputs; read fullReturnPath when needed.' } };
}
