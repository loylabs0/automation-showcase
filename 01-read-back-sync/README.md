# 01 · Read-back sync

**Problem.** A CRM held a one-off copy of each account's numbers. Within 3 weeks, 75% of accounts had drifted from the source, and keeping them current meant copying by hand. A first sync had also quietly stopped writing, and nobody noticed.

**Design.** Copy only calculated fields, in one direction, and prove every run:

1. **Plan.** Compare source and target field by field. Only real changes leave. A blank or a formula error in the source never overwrites a value, and differences under a tolerance count as rounding.
2. **Write.** Writes are grouped per record. A record the target refuses is reported, and the rest are still written.
3. **Read back.** Read the target again and re-plan. Zero planned changes is the proof the data landed as sent.
4. **Reversible.** Every write carries the value it replaced, so `revertPlan()` can undo any run from its own report.

Fields that people type in the target are never in the field list, so a sync cannot overwrite their edits.

**Result (production version).** A CRM migration of 65,000+ rows with 24,000+ values written and read back, and 0 mismatches. Then a daily sync of 60+ fields for 100+ accounts.

```bash
node 01-read-back-sync/demo.mjs   # a fake CRM drops one write; the read-back catches it
node --test 01-read-back-sync/*.test.mjs   # tests
```

This folder is a generic rebuild for this portfolio. It contains no client data and no production code.
