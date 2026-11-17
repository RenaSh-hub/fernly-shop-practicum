# Results: feature/popular-plants

Plan: `docs/test-plans/feature/popular-plants.md` (approved).  
Oracle: `docs/features/popular-plants.md` + `docs/PRODUCT.md` + OpenAPI; product docs win over code.  
App code unchanged (`web/src`, `api/src`); `tests/a11y/a11y-baseline.json` not edited.

## Summary

| row | test | result | possible finding |
| --- | --- | --- | --- |
| T1 | `tests/api/popular.spec.ts` — units sold ranking (workshop tray ×40) | **fail** — top item `pl-monstera`, not `pl-cutting` / 8000 | **F-19** |
| T2 | `tests/api/popular.spec.ts` — out-of-stock excluded | **fail** — `pl-pilea` (stock 0) returned | **F-20** |
| T3 | `tests/api/popular.spec.ts` — limit 1–12 / 400 validation_error | **pass** | — |
| T4 | `tests/performance/popular-plants.js` — smoke (1 VU) + load (20 VU) mixed browse | **fail** — target **300 ms** p95; **1 shopper:** popular **124.97 ms**, catalog **0.73 ms**; **20 shoppers:** popular **952.71 ms**, catalog **612.82 ms** | **F-21** |
| T5 | `web/cypress/component/PopularList.cy.tsx` — omit currentId, ≤4, order | **pass** | — |
| T6 | `web/cypress/ui/plant-popular.cy.ts` — ≥2 pages, mock popular | **pass** | — |
| T7 | `tests/e2e/popular-plants.spec.ts` — journey + omit current + no OOS | **fail** — first link is `pl-pilea`; after nav, current still linked | **F-20**, **F-22** |
| T8 | `tests/a11y/pages.spec.ts` — plant page with Popular visible | **known bug** `@known-bug` + `FINDING-12` / `FINDING-13` — blocking PriceTag contrast + hero `image-alt`; Popular heading/links/`sold` present; no `.sold` contrast flagged | **F-12**, **F-13** |

## Specs / fixtures written

### Playwright (change-triage)
- `tests/api/popular.spec.ts`
- `tests/e2e/popular-plants.spec.ts`
- `tests/pages/PlantPage.ts` (popular locators)
- `tests/a11y/pages.spec.ts` (T8 added; baseline untouched)
- `tests/performance/popular-plants.js`

### Cypress (cypress-test-writer)
- `web/cypress/component/PopularList.cy.tsx`
- `web/cypress/ui/plant-popular.cy.ts`
- `web/cypress/fixtures/popular/popular-five.json`
- `web/cypress/fixtures/plants/plant-detail-monstera.json`
- `web/cypress/fixtures/plants/plant-detail-snake.json`

## Run notes

- Playwright API: `CI= npm run test:pw -- --project=api tests/api/popular.spec.ts --retries=0`
- Playwright e2e: `CI= npm run test:pw -- --project=e2e tests/e2e/popular-plants.spec.ts --retries=0`
- Playwright a11y: `CI= npm run test:pw -- --project=a11y -g T8: --retries=0`
- k6 smoke: `k6 run --env SCENARIO=smoke tests/performance/popular-plants.js` → `reports/k6/popular-plants-smoke.md`
- k6 load: `k6 run --env SCENARIO=load tests/performance/popular-plants.js` → `reports/k6/popular-plants-load.md`
- Cypress component: `npm run cy:component -- --spec web/cypress/component/PopularList.cy.tsx`
- Cypress UI: `npm run cy:ui -- --spec web/cypress/ui/plant-popular.cy.ts`

## Findings (from results)

| row | finding | expected | actual | evidence |
| --- | --- | --- | --- | --- |
| T1 | **F-19** | Top `pl-cutting`, `unitsSold` **8000** (200×40) | Top `pl-monstera` (~1762) | `tests/api/popular.spec.ts` T1 |
| T2 | **F-20** | No stock-0 plants; `pl-pilea` absent | `pl-pilea` with `stock: 0` | `tests/api/popular.spec.ts` T2 |
| T4 | **F-21** | p95 &lt; **300 ms** at 20 VU; 0% popular failures | Target **300 ms**; 1 VU: popular **124.97**, catalog **0.73**; 20 VU: popular **952.71**, catalog **612.82** | `reports/k6/popular-plants-smoke.md`, `reports/k6/popular-plants-load.md` |
| T7 | **F-20**, **F-22** | In-stock links only; current id omitted after follow | Link to `pl-pilea`; after nav, `/plants/pl-pilea` still in list | `tests/e2e/popular-plants.spec.ts` T7 |
| T8 | **F-12**, **F-13** | No new blocking axe on plant page with Popular | **known bug** `@known-bug`; PriceTag contrast; hero `image-alt` | `tests/a11y/pages.spec.ts` T8 |
