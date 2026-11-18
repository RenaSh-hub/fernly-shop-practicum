# Catalog performance (k6)

Loads the shopper catalog flow against the Fernly API:

- `GET /api/plants` (catalog)
- `GET /api/plants?search=…` (search)
- `GET /api/plants/{plantId}` (plant detail)

Script: [catalog.js](./catalog.js). Paths match [GET /openapi.json](http://localhost:8100/openapi.json).

## Prerequisites

- [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) on your `PATH`
- API running, for example `npm run start:api` (default `http://localhost:8100`)

Optional: `BASE_URL` if the API is not on the default host (passed through to k6 as `--env BASE_URL=…`).

## Commands

From the repo root:

```bash
npm run perf:smoke
npm run perf:load
```

- **Smoke:** 1 virtual user, 10 rounds — quick health check under minimal load.
- **Load:** 20 virtual users for 30 seconds, with a 1 second pause between rounds.

Reports are written under `reports/k6/` (`catalog-<scenario>.md` and `.json`). That folder is gitignored; summaries also print to stdout.

## Baseline and thresholds

p95 limits are a **placeholder** until someone owns a real SLO. They come from [baseline.json](./baseline.json) when present: three times the recorded p95 per endpoint, never below 50 ms and never above 300 ms. If the file is missing, the 300 ms ceiling is used.

Refresh the baseline after an intentional load run on a stable environment:

```bash
npm run perf:load -- --env SAVE_BASELINE=1
```

That overwrites `tests/performance/baseline.json` with the run’s p95 values. Commit baseline updates only when the team agrees the capture is representative (machine, API build, and load profile).

Example for a remote API:

```bash
npm run perf:load -- --env BASE_URL=https://staging.example.com --env SAVE_BASELINE=1
```