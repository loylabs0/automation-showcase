import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeThenVerify, codeChecks } from './pipeline.mjs';

const source = 'Acme Corp acquired Beta Labs for $10 million, said Jane Roe.';
const record = { target: 'Beta Labs', acquirer: 'Acme Corp', amount: '$10 million', people: ['Jane Roe'] };

test('a clean record passes the code checks', () => {
  assert.deepEqual(codeChecks(record, source), []);
});

test('a person not named in the source is flagged, not silently kept', () => {
  const f = codeChecks({ ...record, people: ['Jane Roe', 'Ghost Person'] }, source);
  assert.equal(f.length, 1);
  assert.match(f[0].issue, /Ghost Person/);
});

test('checker corrections apply only when their quote is in the source', async () => {
  const llm = async (system) => system.startsWith('You extract')
    ? JSON.stringify({ ...record, amount: '$1 million' })
    : JSON.stringify({ corrections: [
        { field: 'amount', value: '$10 million', quote: 'Beta Labs for $10 million' },
        { field: 'target', value: 'Gamma', quote: 'not in the text' }] });
  const out = await writeThenVerify({ source, llm });
  assert.equal(out.record.amount, '$10 million');
  assert.equal(out.record.target, 'Beta Labs');
  assert.equal(out.applied.length, 1);
  assert.equal(out.status, 'ready_for_review');
});
