const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const id = 'AGENT-007';
const attemptId = 'AGENT-007-A01';
const observationId = 'OBS-213';
const time = '2026-10-05T20:24:00.000Z';
const evidenceDir = path.join(root, '\u8bc1\u636e', id, attemptId);
const fixtureDir = path.join(root, '\u5939\u5177', 'agent-variants', 'round-agent-description-en-only-20261006');
const recordPath = path.join(root, '\u6267\u884c\u8bb0\u5f55', id + '.json');
const record = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
const caseSpec = JSON.parse(fs.readFileSync(path.join(root, '\u7528\u4f8b', 'cases.json'), 'utf8')).find(x => x.id === id);
const files = fs.readdirSync(evidenceDir).filter(name => fs.statSync(path.join(evidenceDir, name)).isFile());
const evidence = files.map(name => {
  const buffer = fs.readFileSync(path.join(evidenceDir, name));
  return {
    path: path.posix.join('\u8bc1\u636e', id, attemptId, name), case_id: id, attempt_id: attemptId,
    observation_id: observationId, captured_at: time,
    type: name.endsWith('.png') ? 'screenshot' : 'DOM/readback',
    proves: name.includes('detail') ? 'Expert detail shows English fallback display description in Chinese UI and local/user source.' :
      name.includes('use') ? 'Selected round-owned Expert content was injected and unique marker returned.' :
      name.includes('import') ? 'Directory import result and collection count after UI submit.' :
      'Baseline or selected-folder UI state.',
    redacted: true, sha256: crypto.createHash('sha256').update(buffer).digest('hex')
  };
});
for (const name of ['metadata.json', 'agent.md']) {
  const buffer = fs.readFileSync(path.join(fixtureDir, name));
  evidence.push({
    path: path.posix.join('\u5939\u5177', 'agent-variants', 'round-agent-description-en-only-20261006', name),
    case_id: id, attempt_id: attemptId, observation_id: observationId, captured_at: time,
    type: 'fixture source', proves: 'Round-owned Expert package source imported through the UI.', redacted: true,
    sha256: crypto.createHash('sha256').update(buffer).digest('hex')
  });
}

const observed = 'The package omitted displayDescription.zh and contained the unique en value DISPLAY_EN_ONLY_20261006; the Expert card and detail displayed that value in the Chinese UI, distinguishing it from the internal description. It was used through the Expert detail; Trace contained the round-owned role content and the exact marker answer. Internal-field fallback is not tested by this attempt.';
const status = '\u5df2\u6267\u884c-\u7ed3\u8bba\u4e0d\u786e\u5b9a';
const attempt = {
  attempt_id: attemptId, started_at: '2026-10-05T20:17:00.000Z', ended_at: time, environment_id: 'ENV-001',
  surface: 'Expert management iframe and standard/low conversation via CDP + Playwright',
  actual_preconditions: { account_alias: 'Arthur', workspace: 'tpt-workspace', project: 'Existing workspace; no project created', session_id: 'New Expert-use conversation created from detail', model: 'Standard / low', permission: 'Workspace-edit mode', fixtures: ['round-agent-description-en-only-20261006 (round-owned only)'] },
  input: 'Import the round-owned Expert directory with displayDescription.en set to a unique value and displayDescription.zh absent. In the Chinese UI inspect fallback, then invoke the selected Expert once.',
  actual_steps: [
    'Captured Expert list baseline: 6 items; no matching fallback fixture.',
    'Prepared a two-file round-owned directory package. It omitted displayDescription.zh; displayDescription.en was DISPLAY_EN_ONLY_20261006, with separate internal description wording.',
    'Clicked Expert > Import Expert and used the in-page webkitdirectory input with setInputFiles; no native file chooser was used.',
    'Clicked Submit. Import succeeded; list count increased 6 to 7. The Chinese UI card displayed profession and DISPLAY_EN_ONLY_20261006.',
    'Opened detail and confirmed fallback value, source user-created, runtime local, and fixed safe prompt.',
    'Clicked detail Use; standard/low Trace contained the selected Expert role content and the assistant returned ROUND_AGENT_FALLBACK_20261006_OK.'
  ],
  wait_condition: 'Wait for import result and card/detail to render; wait for the standard/low Expert invocation to finish and inspect Trace.',
  checkpoints: [{ expected_index: 1, expected: caseSpec.expected[0], observed, verdict: '\u672a\u9a8c\u8bc1', evidence: evidence.filter(x => x.type !== 'fixture source').map(x => x.path) }],
  observed_result: observed, status, evidence: evidence.map(x => x.path), difference_ids: [],
  notes: 'The other-language displayDescription.en fallback branch is confirmed on one round-owned local Expert. The internal-field fallback awaits a separate fixture. The imported sample is retained under explicit night-run authorization; no pre-existing user Expert was changed.'
};
record.attempts.push(attempt);
record.latest_attempt_id = attemptId;
record.status = status;
record.blocker = null;
record.product_observations.push({
  observation_id: observationId, feature_id: null, statement: observed, case_ids: [id], attempt_ids: [attemptId],
  environment_id: 'ENV-001', verified_depth: 'UI directory import, Chinese card/detail fallback, and actual standard/low Expert Trace call',
  scope_and_limits: 'One round-owned package with displayDescription.en and no zh; local/user source. Internal-field fallback awaits an independent fixture.',
  evidence: evidence.map(x => x.path), relation_to_design: 'One fallback branch observed; chained fallback remains unverified and pending review.', review_status: '\u5f85\u53cc\u65b9\u5ba1\u6838'
});
record.cleanup.changes.push({ change: 'Imported round-owned directory package round-agent-description-en-only-20261006 through the Expert UI.', restored: false, verification: 'Expert count changed 6 to 7; card/detail showed the round-owned sample. No existing user asset was changed.' });
record.cleanup.remaining.push('round-agent-description-en-only-20261006 remains installed for this round; source remains in fixtures.');
record.audit_history = record.audit_history || [];
record.audit_history.push({ at: time, event: 'Night-run authorization used to import and invoke a round-owned Expert language-fallback sample. A01 confirms English displayDescription fallback only; internal description branch remains open.' });
fs.writeFileSync(recordPath, JSON.stringify(record, null, 2) + '\n');

const indexPath = path.join(root, '\u8bc1\u636e', '\u7d22\u5f15.jsonl');
const index = fs.readFileSync(indexPath, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
index.push(...evidence);
fs.writeFileSync(indexPath, index.map(row => JSON.stringify(row)).join('\n') + '\n');
const observationPath = path.join(root, '\u89c2\u5bdf\u8bb0\u5f55.jsonl');
const observations = fs.readFileSync(observationPath, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
observations.push({ observation_id: observationId, recorded_at: time, related_cases: [id], related_attempts: [attemptId], category: 'Expert localized-description fallback', scope: 'AGENT-007-A01; round-agent-description-en-only-20261006 in Chinese UI', observation: observed, candidate_status: 'Pending bilateral review; this attempt verifies one branch only', evidence });
fs.writeFileSync(observationPath, observations.map(row => JSON.stringify(row)).join('\n') + '\n');
const changePath = path.join(root, '\u53d8\u66f4\u6e05\u5355.md');
fs.appendFileSync(changePath, '\n| CL-24 | ' + time + ' | Imported round-agent-description-en-only-20261006 through the Expert UI as a fallback fixture | Round-owned package retained for further testing; Expert count 6 to 7 | AGENT-007-A01; evidence/AGENT-007/AGENT-007-A01 |\n', 'utf8');
console.log(JSON.stringify({ attemptId, evidence: evidence.length, status }));
