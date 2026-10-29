import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plan, revertPlan, syncWithReadBack } from './sync.mjs';

const opts = { key: 'id', fields: ['a', 'b'], tolerance: 0.5 };

test('only real changes are planned', () => {
  const changes = plan([{ id: 1, a: 10, b: 'x' }], [{ id: 1, a: 10.2, b: 'y' }], opts);
  assert.deepEqual(changes, [{ key: 1, field: 'b', from: 'y', to: 'x' }]);
});

test('a blank or an error never overwrites a value', () => {
  const changes = plan([{ id: 1, a: '', b: '#ERROR!' }], [{ id: 1, a: 5, b: 'kept' }], opts);
  assert.equal(changes.length, 0);
});

test('fields that are not listed are never touched', () => {
  const changes = plan([{ id: 1, a: 1, b: 1, notes: 'new' }], [{ id: 1, a: 1, b: 1, notes: 'old' }], opts);
  assert.equal(changes.length, 0);
});

test('revert plan swaps every change back', () => {
  assert.deepEqual(revertPlan([{ key: 1, field: 'a', from: 1, to: 2 }]), [{ key: 1, field: 'a', from: 2, to: 1 }]);
});

test('read-back reports a write the target did not keep', async () => {
  const target = [{ id: 1, a: 0, b: 0 }];
  const r = await syncWithReadBack({ ...opts, readSource: async () => [{ id: 1, a: 1, b: 2 }],
    readTarget: async () => target.map((x) => ({ ...x })), write: async () => {} });
  assert.equal(r.verified, false);
  assert.equal(r.remaining.length, 2);
});

test('a refused record does not stop the others', async () => {
  const target = [{ id: 1, a: 0, b: 0 }, { id: 2, a: 0, b: 0 }];
  const r = await syncWithReadBack({ ...opts,
    readSource: async () => [{ id: 1, a: 1, b: 1 }, { id: 2, a: 2, b: 2 }],
    readTarget: async () => target.map((x) => ({ ...x })),
    write: async (key, values) => { if (key === 1) throw new Error('missing owner'); Object.assign(target.find((x) => x.id === key), values); } });
  assert.deepEqual(r.refused, [{ key: 1, reason: 'missing owner' }]);
  assert.deepEqual(target[1], { id: 2, a: 2, b: 2 });
});
