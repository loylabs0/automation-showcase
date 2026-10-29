# 02 · Write-then-verify loop

**Problem.** Analysts wrote up and checked every deal by hand, from the investors to the summary. The weekly count stopped at about 110, however many came in.

**Design.**

1. **One writer per document.** Each record is written by its own model call that sees only that document, so one bad source cannot leak into another record.
2. **A fresh checker.** A writer cannot catch its own misreads, because its checks share the context that made them. The checker is a separate call that never saw the writer's reasoning. It may only correct a field when it can quote the sentence that settles it.
3. **Code checks the model.** Corrections apply only if the quote is really in the source. A person the model extracts is kept only if the name appears word for word, and missing or numberless fields are flagged.
4. **Findings stay off the record.** Flags go to a separate list for the reviewer, never into a field. The record stays clean.
5. **A person keeps the final call.** The output is `ready_for_review` or `needs_attention`; nothing publishes itself.

In production, reviewers still sent back about half of what the AI cleared, and that was planned for. Each correction is tagged with the gap it shows, and the most common ones were turned into checks in code instead of more prompt rules.

**Result (production version).** 500+ records filled a week, up from about 110 by hand (350%+), with no people added. Daily reporting went from about 8 hours to 1.

The model is passed in as a function, so the same loop works with Claude, GPT or a local model.

```bash
node 02-write-then-verify/demo.mjs                  # scripted model: a wrong amount gets fixed, an invented name gets flagged
node --test 02-write-then-verify/*.test.mjs
```

This folder is a generic rebuild for this portfolio. It contains no client data and no production code.
