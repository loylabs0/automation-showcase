import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWebClient } from './client.mjs';

const long = 'x'.repeat(1000);

test('fails over past errors and thin pages to a full read', async () => {
  const c = createWebClient({ readers: [
    { name: 'a', read: async () => { throw new Error('down'); } },
    { name: 'b', read: async () => ({ text: 'thin' }) },
    { name: 'c', read: async () => ({ text: long }) }] });
  const r = await c.read('https://example.com');
  assert.equal(r.coverage, 'full');
  assert.equal(r.reader, 'c');
  assert.equal(r.attempts.length, 3);
});

test('an error is never returned as page text', async () => {
  const c = createWebClient({ readers: [{ name: 'a', read: async () => { throw new Error('rate limited'); } }] });
  const r = await c.read('https://example.com');
  assert.equal(r.coverage, 'none');
  assert.equal(r.text, '');
});

test('stops reading when the daily budget is spent', async () => {
  let calls = 0;
  const c = createWebClient({ dailyBudget: 0.002, readers: [
    { name: 'a', read: async () => { calls++; return { text: 'thin', cost: 0.002 }; } },
    { name: 'b', read: async () => { calls++; return { text: long, cost: 0.002 }; } }] });
  const r = await c.read('https://example.com');
  assert.equal(calls, 1);
  assert.equal(r.coverage, 'thin');
});

test('aggregators are not citable', () => {
  const c = createWebClient({ readers: [] });
  assert.equal(c.isCitable('https://www.crunchbase.com/organization/x'), false);
  assert.equal(c.isCitable('https://company.com/news'), true);
});
