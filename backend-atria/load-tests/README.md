# Local load tests (k6)

These scripts hit **localhost only** so you can estimate capacity without extra Fly.io traffic or cost.

## Prerequisites

1. Install [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/).
2. Backend running locally with a reachable database, e.g.:

   ```bash
   cd backend-atria
   K6_LOAD_TEST=1 npm run start:dev
   ```

   `K6_LOAD_TEST=1` disables API throttling in non-production (same idea as Jest’s `JEST_WORKER_ID`). **Do not set this in production.**

3. A valid user for authenticated scenarios (`inbox-browse`). E2E seed users from `test/helpers/constants.ts` work if you have run the e2e seed against your local DB.

## Scripts

| Script | What it measures |
|--------|------------------|
| `smoke-health.js` | Public `GET /health` — quick sanity / max RPS on health |
| `inbox-browse.js` | Login (once) + inbox flow: me, counts, conversations, optional thread/messages |
| `inbox-stress.js` | Same endpoints, short pause — used for capacity probing |
| `find-limit.mjs` | Local Docker Postgres + ramp until SLO break → `limit-report.txt` |

## Run

From `backend-atria`:

```bash
# No auth — backend must be up on PORT (default 3001)
npm run loadtest:health

# WhatsApp inbox–style API usage
K6_EMAIL='you@example.com' K6_PASSWORD='your-password' npm run loadtest:inbox

# Find approximate concurrent-user limit (localhost only, no Fly/Supabase)
npm run loadtest:find-limit
# → see load-tests/limit-report.txt
```

Optional environment variables:

| Variable | Default | Purpose |
|----------|---------|---------|
| `BASE_URL` | `http://127.0.0.1:3001` | API base URL |
| `K6_VUS_MAX` | `10` (inbox), `20` (health) | Peak virtual users |
| `K6_EMAIL` / `K6_PASSWORD` | — | Required for `inbox-browse` unless token is set |
| `K6_ACCESS_TOKEN` | — | Skip login (avoids auth throttle if you test without `K6_LOAD_TEST`) |

Example — heavier health run:

```bash
K6_VUS_MAX=50 npm run loadtest:health
```

## Interpreting results

k6 prints **http_reqs** (throughput), **http_req_duration** (latency percentiles), and **http_req_failed**. Use the summary line:

- Sustainable load: low error rate and stable p95 while VUs are at `K6_VUS_MAX`.
- Approximate concurrent users ≈ `RPS × think_time_seconds` (this script uses ~1–3 s sleep between iterations).

To mimic a single Fly machine (1 shared CPU, 1 GB), run the backend in Docker with matching CPU/memory limits while executing these tests.
