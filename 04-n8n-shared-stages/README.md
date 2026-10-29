# 04 · n8n ingest lanes on shared stages

**Problem.** Each data source had its own n8n flow with its own copy of the dedupe and write rules. A fix in one flow left the others wrong, and incoming rows paid for a web search before anyone checked whether they were duplicates.

**Design.**

```
lane A (daily feed) ─┐
lane B (news)       ─┼─▶ shared stages: Normalize → Dedupe + scope → Keep? ─▶ enrichment (paid) → write
backfill lanes      ─┘                                                 └──▶ log skip (every row leaves a log line)
```

1. **One stage library for every lane.** Each source only parses its own rows into one shared shape, then calls the same sub-workflow (Execute Workflow). A rule fixed once is fixed for every lane.
2. **Exit before the paid steps.** Duplicates and out-of-scope rows leave right after the dedupe and scope stages, before any paid search or model call.
3. **Every row gets a log line,** including the ones that exit early, so nothing disappears silently.
4. In production, the later stages fail closed. A search that errors turns its row into a logged skip, so it never creates a misattributed record. A dead provider stops the run before any row is charged.

**Result (production version).** 70%+ of incoming rows exit before any AI cost. Two daily lanes and three backfills share 7 stages.

**Try it.** In n8n: Workflows → Import from File → `shared-stages.workflow.json`. Call it from another workflow with an Execute Workflow node, passing items like `{ "company": "Acme", "website": "acme.com", "sector": "B2B SaaS", "known_websites": ["beta.io"] }`.

This is a trimmed, generic version of the first stages for this portfolio. It contains no client data and no production code.
