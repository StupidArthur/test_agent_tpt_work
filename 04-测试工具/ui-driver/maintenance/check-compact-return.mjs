// Offline checks: no product connection or UI lock needed.
import assert from 'node:assert/strict';
import path from 'node:path';
import { compactReturn } from '../automation/compact-return.mjs';

const full = {
  call_id: 'CALL-offline', status: 'error',
  error: { type: 'ReadError', message: 'Could not read target' },
  observations: {
    actual: null, empty: [], enabled: false, count: 0,
    exactReply: 'SMK-03', text: 'x'.repeat(2001),
    items: Array.from({ length: 11 }, (_, index) => ({ index, raw: 'evidence' })),
    raw: { body: 'original evidence' }
  }
};
const before = JSON.stringify(full);
const shown = compactReturn(full, path.resolve('offline-task'));
assert.equal(shown.status, 'error');
assert.deepEqual(shown.error, full.error);
assert.equal(shown.observations.actual, null);
assert.deepEqual(shown.observations.empty, []);
assert.equal(shown.observations.enabled, false);
assert.equal(shown.observations.count, 0);
assert.equal(shown.observations.exactReply, 'SMK-03');
assert.deepEqual(shown.observations.text, { preview: 'x'.repeat(2000), length: 2001, truncated: true });
assert.equal(shown.observations.items.total, 11);
assert.equal(shown.observations.items.truncated, true);
assert.equal(shown.observations.items.items.length, 10);
assert.equal('raw' in shown.observations, false);
assert.equal(shown.presentation.omittedRaw, 11);
assert.equal(shown.presentation.truncated, 2);
assert.equal(shown.presentation.fullReturnPath, path.resolve('offline-task', '审核/函数调用/CALL-offline/return.json'));
assert.equal(JSON.stringify(full), before, 'Presentation must not mutate full evidence');
const boundary = compactReturn({ call_id: 'boundary', observations: { text: 'x'.repeat(2000), list: Array(10).fill(null) } }, '.');
assert.equal(typeof boundary.observations.text, 'string');
assert.ok(Array.isArray(boundary.observations.list));
assert.equal(boundary.presentation.truncated, 0);
console.log(JSON.stringify({ passed: true, scope: 'compact presentation, evidence immutability, error/null/empty preservation, truncation boundaries' }));
