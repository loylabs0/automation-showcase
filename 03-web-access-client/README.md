# 03 · Web-access client with failover

**Problem.** Each routine reached the web its own way, mostly through a free search tool whose quota the whole account shared. One day it ran out mid-run, and a rate-limit message was written into a record as if it were data.

**Design.**

1. **One client, one reply shape.** Every routine calls the same client. Whichever reader answers, the reply looks the same (`text`, `coverage`, `reader`, `attempts`), so swapping a provider changes no caller.
2. **Fail over, never fail open.** An error moves on to the next reader. A thin page (cookie banners, paywalls) is re-read by the next reader. An error message is never returned as page text: with nothing readable, `coverage` is `none` and `text` is empty.
3. **Coverage verdict.** Callers know whether they got the whole page or a fragment, and decide accordingly.
4. **Daily spend cap.** Each read reports its cost. When the day's budget is spent, reads stop instead of overspending.
5. **Aggregators never get cited.** Databases and aggregators can point a run to a fact, but `isCitable()` keeps them out of a record's source link.

**Result (production version).** Readable pages went from 83% to 98%, at about $0.001 per page.

```bash
node 03-web-access-client/demo.mjs
node --test 03-web-access-client/*.test.mjs
```

This folder is a generic rebuild for this portfolio. It contains no client data and no production code.
