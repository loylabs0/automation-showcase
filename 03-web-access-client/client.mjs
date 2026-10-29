// One web-access client for every routine: readers tried in order, thin pages re-read by the next
// reader, one reply shape whatever answered, a daily spend cap, and aggregators kept out of citations.
// Readers are injected: async (url) => ({ text, cost? }). Swap providers without touching callers.

const DEFAULT_BLOCKLIST = [/crunchbase\.com/i, /pitchbook\.com/i, /cbinsights\.com/i, /tracxn\.com/i, /linkedin\.com\/jobs/i];

/**
 * @param {{ readers: { name: string, read: (url: string) => Promise<{ text: string, cost?: number }> }[],
 *           minChars?: number, dailyBudget?: number, blocklist?: RegExp[], now?: () => Date }} opts
 */
export function createWebClient({ readers, minChars = 800, dailyBudget = Infinity, blocklist = DEFAULT_BLOCKLIST, now = () => new Date() }) {
  let day = '', spent = 0;
  const budgetLeft = () => {
    const today = now().toISOString().slice(0, 10);
    if (today !== day) { day = today; spent = 0; }
    return dailyBudget - spent;
  };

  /** Read a page. Never returns an error message as if it were page text. */
  async function read(url) {
    const attempts = [];
    let best = null;
    for (const r of readers) {
      if (budgetLeft() <= 0) { attempts.push({ reader: r.name, error: 'daily budget spent' }); break; }
      try {
        const { text = '', cost = 0 } = await r.read(url);
        spent += cost;
        const clean = String(text).trim();
        attempts.push({ reader: r.name, chars: clean.length });
        if (!best || clean.length > best.text.length) best = { text: clean, reader: r.name };
        if (clean.length >= minChars) break; // whole enough: stop here
      } catch (err) {
        attempts.push({ reader: r.name, error: String(err.message || err) }); // fail over to the next reader
      }
    }
    const coverage = !best || !best.text ? 'none' : best.text.length >= minChars ? 'full' : 'thin';
    return { url, text: coverage === 'none' ? '' : best.text, reader: best?.reader ?? null, coverage, attempts, budgetLeft: budgetLeft() };
  }

  /** Aggregators can point to a fact, but are never cited as its source. */
  const isCitable = (url) => !blocklist.some((re) => re.test(url));

  return { read, isCitable, spentToday: () => (budgetLeft(), spent) };
}
