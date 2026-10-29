# Automation showcase · Loy Laborte

I design, build and govern AI systems that do the work of whole teams. I own the automation layer of a 470+ person B2B tech and software due-diligence firm: 140+ builds, 100+ live, across n8n, Claude, Airtable and hand-built API integrations.

This repo holds **generic, runnable rebuilds** of the patterns behind those systems. It contains no client data and no production code, and each folder says what the real version achieved. The full write-ups, with diagrams, are at **[loy-labs.vercel.app](https://loy-labs.vercel.app)**.

| # | Pattern | What it shows | Production result |
|---|---|---|---|
| 01 | [Read-back sync](01-read-back-sync) | Plan only real changes, never write a blank over a value, read back to prove it landed, revert any run | 65,000+ rows migrated, 0 mismatches; daily sync of 60+ fields |
| 02 | [Write-then-verify loop](02-write-then-verify) | One AI writes, a fresh AI checks with quotes, code checks the model, a person decides | 500+ records a week, up from ~110 by hand |
| 03 | [Web-access client](03-web-access-client) | Reader failover, coverage verdicts, a daily spend cap, no aggregator citations | Readable pages 83% → 98% at ~$0.001 a page |
| 04 | [n8n shared stages](04-n8n-shared-stages) | One stage library for every ingest lane; duplicates and off-scope rows exit before paid steps | 70%+ of rows dropped before any AI cost |

## Principles these share
- **Every system answers one question: what did it return?** Each run is measured, logged and checkable.
- **Fail closed.** An error becomes a logged skip, never a wrong record.
- **Code checks the model.** Models draft; deterministic checks and people decide.
- **Cheap first.** Filter and dedupe before anything that costs money, and cap the spend.
- **Ship in shadow.** A new version runs next to the old one and replaces it only at 90%+ agreement.

## Run it
Needs Node.js 20+. No dependencies.

```bash
npm test                              # all tests
node 01-read-back-sync/demo.mjs
node 02-write-then-verify/demo.mjs
node 03-web-access-client/demo.mjs
```

The n8n workflow in `04-n8n-shared-stages` imports into n8n through Workflows → Import from File.

## Contact
[linkedin.com/in/loyl](https://linkedin.com/in/loyl) · [loy-labs.vercel.app](https://loy-labs.vercel.app)
