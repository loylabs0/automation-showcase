// Read-back sync: copy calculated fields from a source system to a target (e.g. a CRM),
// sending only real changes, and prove the data landed by reading it back.
//
// Rules this enforces:
//   - only fields you list are synced (fields people type in the target are never touched)
//   - a blank, null or formula error in the source never overwrites a value in the target
//   - small numeric differences (rounding) are not changes
//   - every planned write carries the value it replaces, so any run can be reverted
//   - after writing, the target is read again and re-planned: zero planned changes = proof

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
const isError = (v) => typeof v === 'string' && /^#(ERROR|N\/A|REF|VALUE|DIV\/0|NAME)!?/i.test(v.trim());

function same(a, b, tolerance) {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= tolerance;
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Work out which field values must change in the target.
 * @param {object[]} source  records from the system that calculates the numbers
 * @param {object[]} target  records currently in the target system
 * @param {{ key: string, fields: string[], tolerance?: number }} opts
 * @returns {{ key: string, field: string, from: any, to: any }[]}
 */
export function plan(source, target, { key, fields, tolerance = 0 }) {
  const byKey = new Map(target.map((r) => [r[key], r]));
  const changes = [];
  for (const s of source) {
    const t = byKey.get(s[key]);
    if (!t) continue; // matching (and creating) records is a separate, deliberate step
    for (const field of fields) {
      const to = s[field];
      if (isBlank(to) || isError(to)) continue; // never write a blank or an error over a value
      if (!same(t[field], to, tolerance)) changes.push({ key: s[key], field, from: t[field] ?? null, to });
    }
  }
  return changes;
}

/** The changes that would undo a run, built from the run's own report. */
export function revertPlan(applied) {
  return applied.map(({ key, field, from, to }) => ({ key, field, from: to, to: from }));
}

/**
 * Plan, write, read back, re-plan. Writes are grouped per record.
 * A record the target refuses is reported, and the other records are still written.
 * @param {{ readSource: () => Promise<object[]>, readTarget: () => Promise<object[]>,
 *           write: (key: string, values: object) => Promise<void>,
 *           key: string, fields: string[], tolerance?: number, dryRun?: boolean }} io
 */
export async function syncWithReadBack(io) {
  const opts = { key: io.key, fields: io.fields, tolerance: io.tolerance ?? 0 };
  const source = await io.readSource();
  const changes = plan(source, await io.readTarget(), opts);
  if (io.dryRun) return { planned: changes, applied: [], refused: [], remaining: changes, verified: false };

  const byRecord = Map.groupBy ? Map.groupBy(changes, (c) => c.key) : groupBy(changes);
  const applied = [], refused = [];
  for (const [key, list] of byRecord) {
    try {
      await io.write(key, Object.fromEntries(list.map((c) => [c.field, c.to])));
      applied.push(...list);
    } catch (err) {
      refused.push({ key, reason: String(err.message || err) });
    }
  }
  const remaining = plan(source, await io.readTarget(), opts); // the read-back
  return { planned: changes, applied, refused, remaining, verified: remaining.length === 0 && refused.length === 0 };
}

function groupBy(list) {
  const m = new Map();
  for (const c of list) m.set(c.key, [...(m.get(c.key) || []), c]);
  return m;
}
