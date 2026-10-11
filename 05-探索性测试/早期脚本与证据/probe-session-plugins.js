(() => {
  const vis = e => e.getClientRects().length > 0;
  const t = e => ((e && e.innerText) || '').replace(/\s+/g, ' ').trim();
  const dlg = [...document.querySelectorAll('[role="dialog"]')].filter(vis)[0];
  if (!dlg) return { open: false };
  const s = t(dlg);
  const i = s.indexOf('会话插件');
  const j = s.indexOf('全局插件');
  const seg = (j > i) ? s.slice(i, j) : s.slice(i);

  // plugin cards: text starts with a plugin id token; detect id + 已停用 marker
  const out = [];
  const known = ['persona','agent-instructions','tool-bash','tool-pwsh','tool-fs','tool-fs-search','tool-jobs',
    'command-goal','tool-goal','tool-ask-user','tool-todo','tool-web','tool-cordis','skill-filesystem','tool-skill',
    'tool-present','plugin-manager/tools','plan-mode','compaction-basic','command-compact',
    'compaction-tool-result-pruner','tool-result-pruner','tool-subagent-control',
    'tool-subagent-control/list-agents','tool-subagent-list-agents','tool-subagent','tool-subagent-fork',
    'tool-subagent-codex','tool-subagent-claude-code','workflow-ptc','tool-workflow','tool-ralph'];
  for (const id of known) {
    const idx = seg.indexOf(id);
    if (idx < 0) { out.push({ id, present: false }); continue; }
    const after = seg.slice(idx + id.length, idx + id.length + 12);
    out.push({ id, present: true, disabled: after.includes('已停用') });
  }
  return { open: true, header: seg.slice(0, 40), plugins: out };
})()
