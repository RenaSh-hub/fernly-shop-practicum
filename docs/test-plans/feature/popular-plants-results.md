# Results: feature/popular-plants

Plan: `docs/test-plans/feature/popular-plants.md` (approved).  
Oracle: `docs/features/popular-plants.md` + `docs/PRODUCT.md` + OpenAPI; product docs win over code.  
App code unchanged (`web/src`, `api/src`); `tests/a11y/a11y-baseline.json` not edited.

## Summary

| row | test | result | possible finding |
| --- | --- | --- | --- |
| T1 | `tests/api/popular.spec.ts` — units sold ranking (workshop tray ×40) | **fail** — top item `pl-monstera`, not `pl-cutting` / 8000 | counts **orders**, not units |
| T2 | `tests/api/popular.spec.ts` — out-of-stock excluded | **fail** — `pl-pilea` (stock 0) returned | out-of-stock in popular |
| T3 | `tests/api/popular.spec.ts` — limit 1–12 / 400 validation_error | **pass** | — |
| T4 | `tests/performance/popular-plants.js` — 20 VU mixed browse | **fail** — popular p95 **952.71 ms**, catalog p95 **612.82 ms** (limit 300); thresholds crossed | browse latency SLO miss |
| T5 | `web/cypress/component/PopularList.cy.tsx` — omit currentId, ≤4, order | **pass** | — |
| T6 | `web/cypress/ui/plant-popular.cy.ts` — ≥2 pages, mock popular | **pass** | — |
| T7 | `tests/e2e/popular-plants.spec.ts` — journey + omit current + no OOS | **fail** — first link is `pl-pilea`; after nav, current still linked | OOS link + current not omitted |
| T8 | `tests/a11y/pages.spec.ts` — plant page with Popular visible | **known bug** `@known-bug` — blocking PriceTag contrast + hero `image-alt` (F-12, F-13); Popular heading/links/`sold` present; no `.sold` contrast flagged | **F-12**, **F-13** |

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
- k6 load: `k6 run --env SCENARIO=load tests/performance/popular-plants.js` → `reports/k6/popular-plants-load.md`
- Cypress component: `npm run cy:component -- --spec web/cypress/component/PopularList.cy.tsx`
- Cypress UI: `npm run cy:ui -- --spec web/cypress/ui/plant-popular.cy.ts`

## Possible findings (detail)

| row | expected | actual | evidence |
| --- | --- | --- | --- |
| T1 | Top popular plant is Succulent Cutting with `unitsSold` **8000** (200×40) | Top is `pl-monstera` (~1762); `pl-cutting` not in top 12 | `tests/api/popular.spec.ts` T1 |
| T2 | No stock-0 plants; `pl-pilea` absent | `pl-pilea` returned with `stock: 0` | `tests/api/popular.spec.ts` T2 |
| T4 | popular & catalog p95 &lt; 300 ms; 0% popular failures | popular p95 952.71; catalog p95 612.82 | `reports/k6/popular-plants-load.md` |
| T7 | Popular links in-stock only; after follow, current id omitted | Link to `pl-pilea`; after nav, `/plants/pl-pilea` still in list | `tests/e2e/popular-plants.spec.ts` T7 |
| T8 | No blocking axe on plant page with Popular visible | F-12 PriceTag contrast; F-13 hero `image-alt` (pre-existing) | `tests/a11y/pages.spec.ts` T8 |
