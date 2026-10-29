// Demo with fake readers: the first one is rate-limited, the second returns a thin page,
// the third reads the whole page. The caller gets one reply shape either way.
import { createWebClient } from './client.mjs';

const page = 'Full press release. '.repeat(80);
const client = createWebClient({
  minChars: 500,
  dailyBudget: 0.01,
  readers: [
    { name: 'fast-reader', read: async () => { throw new Error('429 rate limited'); } },
    { name: 'cheap-reader', read: async () => ({ text: 'Cookie banner. Subscribe!', cost: 0.001 }) },
    { name: 'full-reader', read: async () => ({ text: page, cost: 0.002 }) },
  ],
});

const r = await client.read('https://example.com/press/acquisition');
console.log({ coverage: r.coverage, reader: r.reader, chars: r.text.length, attempts: r.attempts, budgetLeft: r.budgetLeft });
console.log('cite crunchbase?', client.isCitable('https://www.crunchbase.com/acquisition/x'), '| cite the company site?', client.isCitable('https://example.com/press'));
