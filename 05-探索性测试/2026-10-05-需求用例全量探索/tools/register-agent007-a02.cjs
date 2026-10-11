const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const id = 'AGENT-007';
const attemptId = 'AGENT-007-A02';
const observationId = 'OBS-214';
const time = '2026-10-05T20:28:00.000Z';
const evidenceDir = path.join(root, '\u8bc1\u636e', id, attemptId);
const fixtureDir = path.join(root, '\u5939\u5177', 'agent-variants', 'round-agent-internal-fallback-20261006');
const recordPath = path.join(root, '\u6267\u884c\u8bb0\u5f55', id + '.json');
const record = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
const caseSpec = JSON.parse(fs.readFileSync(path.join(root, '\u7528\u4f8b', 'cases.json'), 'utf8')).find(x => x.id === id);
const files = fs.readdirSync(evidenceDir).filter(name => fs.statSync(path.join(evidenceDir, name)).isFile());
const evidence = files.map(name => ({
  path: path.posix.join('\u8bc1\u636e', id, attemptId, name), case_id: id, attempt_id: attemptId,
  observation_id: observationId, captured_at: time,
  type: name.endsWith('.png') ? 'screenshot' : 'DOM/fixture/readback',
  proves: name.includes('a01-') ? 'Copied evidence from A01 establishes the other-language displayDescription fallback branch.' :
    name.includes('detail') ? 'Chinese Expert detail displays the internal description when displayDescription has no language values.' :
    name.includes('use') ? 'Selected Expert content is injected and the exact round-owned marker is returned.' :
    name.includes('import') ? 'UI import result and collection count after submitting the round-owned package.' :
    name.includes('fixture-source') ? 'Round-owned package source used for the internal-field fallback branch.' : 'Baseline or folder selection state for the second round-owned sample.',
  redacted: true, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(evidenceDir, name))).digest('hex')
}));
const observed = 'A01 confirmed that with displayDescription.zh absent and a unique displayDescription.en value present, the Chinese card/detail used the English displayDescription. A02 imported a second round-owned package with displayDescription={} and a unique internal description INTERNAL_DESC_FALLBACK_20261006; the Chinese card/detail displayed the internal value. The selected Expert was actually invoked: Trace contained its role content and the exact marker response. Together these two UI attempts demonstrate the observed fallback chain on round-owned local samples.';
const status = '\u5df2\u6267\u884c-\u7b26\u5408\u9884\u671f';
const attempt = {
  attempt_id: attemptId, started_at: '2026-10-05T20:25:00.000Z', ended_at: time, environment_id: 'ENV-001',
  surface: 'Expert management iframe and standard/low conversation via CDP + Playwright',
  actual_preconditions: { account_alias: 'Arthur', workspace: 'tpt-workspace', project: 'Existing workspace; no project created', session_id: 'New Expert-use conversation created from detail', model: 'Standard / low', permission: 'Workspace-edit mode', fixtures: ['round-agent-internal-fallback-20261006 (round-owned only)', 'A01 English-fallback sample as comparison'] },
  input: 'Import a second round-owned Expert package with no zh/en displayDescription values but a unique internal description. In the Chinese UI inspect fallback and invoke the selected Expert once.',
  actual_steps: [
    'Copied A01 detail and fixture metadata into this attempt evidence folder so the complete chain has independently owned evidence while preserving A01 originals.',
    'Captured baseline Expert list count 7. Prepared a two-file round-owned directory with displayDescription={} and description INTERNAL_DESC_FALLBACK_20261006.',
    'Clicked Expert > Import Expert; populated the visible in-page webkitdirectory input with the round-owned package and clicked Submit.',
    'Import succeeded; Expert count increased 7 to 8. The Chinese card displayed 本轮内部描述回退 and INTERNAL_DESC_FALLBACK_20261006.',
    'Opened detail; confirmed the internal description remained visible, source user-created, runtime local, and the harmless round-owned prompt.',
    'Clicked detail Use and sent one explicit standard/low request. Trace contained the selected Expert role content and the exact ROUND_AGENT_INTERNAL_FALLBACK_20261006_OK response.'
  ],
  wait_condition: 'Wait for directory import result, card/detail rendering, and stable standard/low Expert Trace response.',
  checkpoints: [{ expected_index: 1, expected: caseSpec.expected[0], observed, verdict: '\u7b26\u5408', evidence: evidence.map(x => x.path) }],
  observed_result: observed, status, evidence: evidence.map(x => x.path), difference_ids: [],
  notes: 'This attempt completes the second fallback branch and links the earlier A01 other-language branch using copies in the current evidence folder. Both samples are local, round-owned and imported through visible UI; no existing user Expert was changed.'
};
record.attempts.push(attempt);
record.latest_attempt_id = attemptId;
record.status = status;
record.blocker = null;
record.product_observations.push({
  observation_id: observationId, feature_id: null, statement: observed, case_ids: [id], attempt_ids: ['AGENT-007-A01', attemptId],
  environment_id: 'ENV-001', verified_depth: 'Two round-owned UI imports, Chinese card/detail fallback, and one explicit actual Expert call per sample',
  scope_and_limits: 'Only two round-owned local package shapes. Does not establish every package validator or cloud/market import behavior.',
  evidence: evidence.map(x => x.path), relation_to_design: 'Both branches in the case fallback chain were observed; pending bilateral review.', review_status: '\u5f85\u53cc\u65b9\u5ba1\u6838'
});
record.cleanup.changes.push({ change: 'Imported round-agent-internal-fallback-20261006 through the Expert UI.', restored: false, verification: 'Expert count changed 7 to 8; card/detail show the round-owned sample. Retained for this round; no existing user Expert was changed.' });
record.cleanup.remaining.push('round-agent-internal-fallback-20261006 remains installed for this round; source remains in fixtures.');
record.audit_history.push({ at: time, event: 'A02 tested internal-description fallback after A01 tested the other-language displayDescription branch. Both round-owned samples were actually invoked and retained under user authorization.' });
fs.writeFileSync(recordPath, JSON.stringify(record, null, 2) + '\n');

const indexPath = path.join(root, '\u8bc1\u636e', '\u7d22\u5f15.jsonl');
const index = fs.readFileSync(indexPath, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
index.push(...evidence);
fs.writeFileSync(indexPath, index.map(row => JSON.stringify(row)).join('\n') + '\n');
const observationPath = path.join(root, '\u89c2\u5bdf\u8bb0\u5f55.jsonl');
const observations = fs.readFileSync(observationPath, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
observations.push({ observation_id: observationId, recorded_at: time, related_cases: [id], related_attempts: ['AGENT-007-A01', attemptId], category: 'Expert localized-description fallback chain', scope: 'AGENT-007 A01/A02; two round-owned local Experts shown in Chinese UI', observation: observed, candidate_status: 'Pending bilateral review; no formal library promotion', evidence });
fs.writeFileSync(observationPath, observations.map(row => JSON.stringify(row)).join('\n') + '\n');
const changePath = path.join(root, '\u53d8\u66f4\u6e05\u5355.md');
fs.appendFileSync(changePath, '\n| CL-25 | ' + time + ' | Imported round-agent-internal-fallback-20261006 through the Expert UI as a second fallback fixture | Round-owned package retained for further testing; my Experts count 7 to 8 | AGENT-007-A02; evidence/AGENT-007/AGENT-007-A02 |\n', 'utf8');
console.log(JSON.stringify({ attemptId, evidence: evidence.length, status }));
