// Write-then-verify: one AI writes a record from a source document, a fresh AI checks it against the
// same source, code checks what models get wrong, and a person keeps the final call.
//
// The model is injected (llm: async (system, user) => string), so any provider works.
// Nothing here publishes: the output is a record plus a review status and a findings list
// that is kept OFF the record.

const WRITER_PROMPT = `You extract one deal record from a press release.
Return JSON only: {"target": string, "acquirer": string, "amount": string|null, "date": string|null, "people": string[], "summary": string}.
Use only facts stated in the text. Use null when the text does not say.`;

const CHECKER_PROMPT = `You are checking a record someone else extracted from the press release below.
You did not write it. Compare every field with the text.
Return JSON only: {"corrections": [{"field": string, "value": any, "quote": string}]}
Only correct a field when the text settles it, and include the exact quote that settles it.`;

function parseJson(text) {
  const m = String(text).match(/\{[\s\S]*\}/);
  if (!m) throw new Error('model did not return JSON');
  return JSON.parse(m[0]);
}

/** Code checks for the mistakes models make most often. Returns findings (never edits the record). */
export function codeChecks(record, source) {
  const findings = [];
  const text = source.toLowerCase();
  for (const name of record.people || []) {
    if (!text.includes(String(name).toLowerCase())) findings.push({ field: 'people', issue: `"${name}" is not in the source word for word` });
  }
  for (const field of ['target', 'acquirer']) {
    if (!record[field]) findings.push({ field, issue: 'missing' });
    else if (!text.includes(String(record[field]).toLowerCase())) findings.push({ field, issue: `"${record[field]}" is not in the source` });
  }
  if (record.amount && !/\d/.test(record.amount)) findings.push({ field: 'amount', issue: 'amount has no number' });
  return findings;
}

/**
 * @param {{ source: string, llm: (system: string, user: string) => Promise<string> }} input
 * @returns {Promise<{ record: object, status: 'ready_for_review'|'needs_attention', findings: object[], applied: object[] }>}
 */
export async function writeThenVerify({ source, llm }) {
  // 1. Writer: sees only this document, so one bad source cannot leak into another record.
  let record = parseJson(await llm(WRITER_PROMPT, source));

  // 2. Fresh checker: a separate call that never saw the writer's reasoning.
  const { corrections = [] } = parseJson(await llm(CHECKER_PROMPT, `PRESS RELEASE:\n${source}\n\nRECORD:\n${JSON.stringify(record)}`));

  // 3. Apply only corrections whose quote really is in the source.
  const applied = [];
  for (const c of corrections) {
    if (c.quote && source.includes(c.quote) && c.field in record) {
      applied.push({ field: c.field, from: record[c.field], to: c.value, quote: c.quote });
      record = { ...record, [c.field]: c.value };
    }
  }

  // 4. Code checks; findings go to a separate log for the reviewer, never into the record.
  const findings = codeChecks(record, source);
  return { record, status: findings.length ? 'needs_attention' : 'ready_for_review', findings, applied };
}
