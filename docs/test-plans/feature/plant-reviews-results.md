# Results: feature/plant-reviews

Plan: `docs/test-plans/feature/plant-reviews.md` (approved).  
Oracle: `docs/features/plant-reviews.md` + OpenAPI; PRODUCT.md a11y baseline still applies.  
App code unchanged (`web/src`, `api/src`); `tests/a11y/a11y-baseline.json` not edited.

## Summary

| row | test | result | possible finding |
| --- | --- | --- | --- |
| PR-01 | `tests/api/reviews.spec.ts` — DELETE author-only; unsigned 401; unknown 404 | **fail** (author self-delete 204, unsigned 401, unknown 404 pass; non-author delete returns **204**) | Non-author DELETE allowed (expected 404). See FINDINGS Suspicions. |
| PR-02 | `tests/api/reviews.spec.ts` — POST auth (201 / 401 / 404) | **pass** | — |
| PR-03 | Cypress UI `web/cypress/ui/plant-reviews.cy.ts` — PR-03-01..03 sign-in gate | **pass** | — |
| PR-04 | `tests/api/reviews.spec.ts` — one review per customer; other plant allowed | **pass** | — |
| PR-05 | `tests/api/reviews.spec.ts` — GET list order/count/average; unknown 404; empty 0; 5+4+5→4.7 | **fail** (order/count/empty/404 pass; average **4.6** ≠ **4.7**) | Average rounds with floor → 4.6. See FINDINGS Suspicions. |
| PR-06 | `tests/api/reviews.spec.ts` — POST validation boundaries | **pass** | — |
| PR-07 | `web/cypress/component/StarRatingInput.cy.tsx` — PR-07-01..06 | **fail** (4 pass / 2 fail: PR-07-05, PR-07-06) | Missing `aria-checked`; no keyboard radio behavior. See FINDINGS Suspicions. |
| PR-08 | `web/cypress/component/ReviewForm.cy.tsx` — PR-08-01..06 | **pass** (6/6) | — |
| PR-09 | `web/cypress/component/ReviewList.cy.tsx` — PR-09-01..04 | **pass** (4/4) | — |
| PR-10 | `web/cypress/ui/plant-reviews.cy.ts` — PR-10-01..06 | **fail** (8 pass / 1 fail: PR-10-02 list refresh) | Query-key mismatch; list does not update after POST. See FINDINGS Suspicions. |
| PR-11 | `tests/e2e/plant-reviews.spec.ts` — guest + Sign in; post + toast; second post error; average 4.7 | **fail** (guest Sign in, toast, API newest-first, second-post error pass; soft fails: UI average 4.6; list not refreshed) | Same average + list-refresh issues. See FINDINGS Suspicions. |
| PR-12 | `tests/a11y/pages.spec.ts` — Plant Reviews signed-out / signed-in | **fail** | Signed-out: known `color-contrast`, `image-alt` (F-12/F-13 class). Signed-in: **new** `aria-required-attr` on star radios (missing `aria-checked`) + same plant-page issues. See FINDINGS Suspicions. |

## Specs / fixtures written

### Playwright (change-triage)
- `tests/api/reviews.spec.ts`
- `tests/e2e/plant-reviews.spec.ts`
- `tests/a11y/pages.spec.ts` (extended; baseline untouched)

### Cypress (cypress-test-writer)
- `web/cypress/test-design/StarRatingInput.md`, `ReviewForm.md`, `ReviewList.md`, `PlantReviews.md`
- `web/cypress/component/StarRatingInput.cy.tsx`
- `web/cypress/component/ReviewForm.cy.tsx`
- `web/cypress/component/ReviewList.cy.tsx`
- `web/cypress/ui/plant-reviews.cy.ts`
- `web/cypress/fixtures/reviews/*`

## Run notes

- Playwright: `npm run test:pw` (reviews API + e2e + Plant Reviews a11y); `--retries=0` for final evidence pass.
- Cypress component: StarRatingInput / ReviewForm / ReviewList via `npm run cy:component` (writers).
- Cypress UI: `npm run cy:ui` for `plant-reviews.cy.ts` (writer).
