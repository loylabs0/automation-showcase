// Demo with a scripted model, so it runs offline and shows each safeguard firing.
// To use a real model, pass an llm function that calls your provider and returns the text reply.
import { writeThenVerify } from './pipeline.mjs';

const source = `Northwind Software today announced it has acquired Bluefin Analytics for $40 million.
"Bluefin fits our data strategy," said Maria Santos, CEO of Northwind. The deal closed on March 3, 2026.`;

// The "writer" gets the amount wrong and invents a person; the "checker" fixes the amount with a quote.
const scripted = async (system) => system.startsWith('You extract')
  ? JSON.stringify({ target: 'Bluefin Analytics', acquirer: 'Northwind Software', amount: '$4 million', date: 'March 3, 2026',
      people: ['Maria Santos', 'John Doe'], summary: 'Northwind Software acquired Bluefin Analytics.' })
  : JSON.stringify({ corrections: [
      { field: 'amount', value: '$40 million', quote: 'acquired Bluefin Analytics for $40 million' },
      { field: 'date', value: 'March 4, 2026', quote: 'closed on March 4' }, // quote not in the source: ignored
    ] });

const out = await writeThenVerify({ source, llm: scripted });
console.log(JSON.stringify(out, null, 2));
