# Plant Reviews — page / UI test design

Page: plant detail `/plants/:plantId` with Reviews slot (`web/src/slots/plant-page/reviews.tsx`).  
Cypress UI with mocked `/api/*`. Spec: `web/cypress/ui/plant-reviews.cy.ts`.

Oracle: `docs/features/plant-reviews.md`; sign-in pattern from PRODUCT.md / plant page.

Maps to plan rows **PR-03** (sign-in gate) and **PR-10** (slot UI: load, post, toast, errors).

Use plant id `pl-test-detail` with fixture `plants/plant-detail-positive.json` (and empty similar list via `plants/plant-detail-all-empty.json`) plus dedicated reviews fixtures under `web/cypress/fixtures/reviews/`.

Signed-in visits set `localStorage.fernly_token` and intercept `GET /api/auth/me` (reuse `cart/auth-me.json` or a reviews auth fixture).

| ID | kind | given (API answers) | the user does | expected | source | technique |
| --- | --- | --- | --- | --- | --- | --- |
| PR-03-01 | auth | signed-in; plant + reviews list OK | visits plant page | Sees **Write a review** form heading | plant-reviews.md:10 | positive — signed-in gate |
| PR-03-02 | auth | signed-out; plant + reviews list OK | visits plant page | Sees **Sign in** link to `/login?next=/plants/pl-test-detail`; no **Write a review** form | plant-reviews.md:10; PRODUCT.md Accounts | positive — guest CTA |
| PR-03-03 | auth | signed-out; plant + reviews list OK | visits plant page | **Post review** / rating radiogroup not shown | plant-reviews.md:10 | negative — form hidden when signed out |
| PR-10-01 | load | signed-out; reviews list with average 4.7, count 2, two items | visits plant page | **Reviews** heading; average line and both review authors visible | plant-reviews.md:7–8 | positive — list load |
| PR-10-02 | post | signed-in; GET reviews then POST 201; subsequent GET includes new review | chooses rating, types ≥10 chars, posts | Toast **Thanks for your review!**; new review appears in the list without full reload | plant-reviews.md:12 | positive — post + toast + refresh |
| PR-10-03 | error | signed-out; GET reviews 500 | visits plant page | Error banner **Reviews couldn't be loaded.** with **Try again** | plant-reviews.md / slot ErrorBanner | negative — GET failure |
| PR-10-04 | error | signed-in; GET reviews OK; POST 409 already_reviewed | submits a valid review | Form `role="alert"` surfaces the API error detail | plant-reviews.md:12–13 | negative — POST error |
| PR-10-05 | edge | signed-out; empty reviews (`average` 0, `count` 0) | visits plant page | Empty invite copy for first review | plant-reviews.md:9 | edge — empty plant |
| PR-10-06 | load | signed-out; GET reviews delayed | visits plant page | Shows **Loading reviews…** before list arrives | plant-reviews.md slot | edge — loading |

## Test-lead checklist

| Check | Coverage |
| --- | --- |
| Sign-in gate | PR-03-01, PR-03-02, PR-03-03 |
| List / empty / loading | PR-10-01, PR-10-05, PR-10-06 |
| Post + toast + list refresh | PR-10-02 |
| GET / POST errors | PR-10-03, PR-10-04 |

## Notes

- PR-10-02 must fail if the new review does not appear after POST (e.g. query-key mismatch invalidating `['review', id]` instead of `['reviews', id]`). Record a suspicion; do not weaken the assertion.
- Intercept only `/api/*`; one fixture file per scenario under `fixtures/reviews/` (and reuse plant fixtures).

## Approval

**Approved** — cites approved plan `docs/test-plans/feature/plant-reviews.md` (plan-approved; rows PR-03, PR-10). Parent change-triage authorized implementation Nov 10, 2026.
