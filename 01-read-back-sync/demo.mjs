// Demo: sync three accounts into a fake CRM that silently drops one write the first time.
// The read-back catches it, and the second run fixes it.
import { syncWithReadBack, revertPlan } from './sync.mjs';

const source = [
  { id: 'acc-1', arr: 12000, seats: 25, health: 'green' },
  { id: 'acc-2', arr: 8000.4, seats: '', health: '#ERROR!' }, // blank and error: must not overwrite
  { id: 'acc-3', arr: 15000, seats: 40, health: 'amber' },
];
const crm = [
  { id: 'acc-1', arr: 11000, seats: 25, health: 'green', notes: 'typed by a person, never synced' },
  { id: 'acc-2', arr: 8000, seats: 12, health: 'green' },
  { id: 'acc-3', arr: 15000, seats: 35, health: 'green' },
];

let dropOnce = true;
const io = {
  key: 'id', fields: ['arr', 'seats', 'health'], tolerance: 1,
  readSource: async () => source,
  readTarget: async () => crm.map((r) => ({ ...r })),
  write: async (key, values) => {
    if (key === 'acc-3' && dropOnce) { dropOnce = false; return; } // the CRM "accepts" but does not save
    Object.assign(crm.find((r) => r.id === key), values);
  },
};

const first = await syncWithReadBack(io);
console.log('Run 1 planned:', first.planned);
console.log('Run 1 verified by read-back?', first.verified, '| still different:', first.remaining);
const second = await syncWithReadBack(io);
console.log('Run 2 planned:', second.planned, '| verified?', second.verified);
console.log('To undo run 1:', revertPlan(first.applied));
console.log('CRM now:', crm);
