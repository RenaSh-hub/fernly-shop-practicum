# Results: feature/promo-codes

Plan: `docs/test-plans/feature/promo-codes.md` (approved).  
Oracle: `docs/features/promo-codes.md` + `docs/PRODUCT.md` + OpenAPI; product docs win over code.  
App code unchanged (`web/src`, `api/src`); `tests/a11y/a11y-baseline.json` not edited.

## Summary

| row | test | result | possible finding |
| --- | --- | --- | --- |
| T1 | `tests/api/promo-codes.spec.ts` — LEAFY10 plants-only discount; validation; shipping unchanged | **known bug** `@known-bug` + `FINDING-14` (hand repro: discount **2.69** ≠ **2.00**) | **F-14** |
| T2 | `tests/api/promo-codes.spec.ts` — FREESHIP; $50 pre-discount rule; percent keeps free shipping | **known bug** `@known-bug` + `FINDING-16` (+ F-14 soft on percent at $50) | **F-16**, **F-14** |
| T3 | `tests/api/promo-codes.spec.ts` — case-insensitive; replace; DELETE; unknown | **known bug** `@known-bug` + `FINDING-14` (soft discount only) | **F-14** |
| T4 | `tests/api/promo-codes.spec.ts` — expired SPRING5; empty cart | **known bug** `@known-bug` + `FINDING-15` (**SPRING5 → 200**) | **F-15** |
| T5 | `tests/api/promo-codes.spec.ts` — auth on promo routes | **pass** | — |
| T6 | `tests/api/promo-codes.spec.ts` — order keeps promo; cart clears | **known bug** `@known-bug` + `FINDING-14` (soft discount on cart) | **F-14** |
| T7 | `web/cypress/component/OrderSummary.cy.tsx` — T7-01..05 | **known bug** T7-01/04/05 `@known-bug` (discount `−$4` not `−$4.00`) | **F-01** |
| T8 | `web/cypress/component/PromoCodeInput.cy.tsx` — T8-01..10 | **known bug** T8-09/10 `@known-bug` | **F-17**, **F-18** |
| T9 | `web/cypress/ui/cart-promo.cy.ts` — T9-01..06 | **pass** (6/6) when app + proxy up | — |
| T10 | `web/cypress/ui/checkout-order-promo.cy.ts` — T10-01..04 | **pass** (4/4) when app + proxy up | — |
| T11 | `tests/e2e/promo-codes.spec.ts` — cart → checkout → order; FREESHIP; refusals | **known bug** `@known-bug` + `FINDING-15` (also soft **F-14** on discount) | **F-15**, **F-14** |
| T12 | `tests/a11y/pages.spec.ts` — Cart promo field / applied; Checkout with discount | **known bug** `@known-bug` + `FINDING-17` / `FINDING-12` | **F-17**, **F-12** |

## Specs / fixtures written

### Playwright (change-triage)
- `tests/api/promo-codes.spec.ts`
- `tests/e2e/promo-codes.spec.ts`
- `tests/a11y/pages.spec.ts` (extended with T12; baseline untouched)

### Cypress (cypress-test-writer)
- `web/cypress/test-design/OrderSummary-promo.md`, `PromoCodeInput.md`, `CartPromo.md`, `CheckoutOrderPromo.md`
- `web/cypress/component/OrderSummary.cy.tsx` (T7 rows appended)
- `web/cypress/component/PromoCodeInput.cy.tsx`
- `web/cypress/ui/cart-promo.cy.ts`
- `web/cypress/ui/checkout-order-promo.cy.ts`
- `web/cypress/fixtures/cart/cart-promo-*.json`; `cart-positive.json` gained `discount`/`promoCode`
- `web/cypress/fixtures/orders/order-promo-leafy10.json`, `order-no-promo.json`

## Run notes

- Playwright API: `npm run test:pw -- --project=api tests/api/promo-codes.spec.ts --retries=0`
- Playwright e2e: `npm run test:pw -- --project=e2e tests/e2e/promo-codes.spec.ts --retries=0`
- Playwright a11y: `npm run test:pw -- --project=a11y -g T12 --retries=0`
- Cypress component: OrderSummary (writer) + `npx cypress run --component --spec cypress/component/PromoCodeInput.cy.tsx` (8/10)
- Cypress UI: `npm run cy:ui` for `cart-promo.cy.ts` and `checkout-order-promo.cy.ts` (writers; 6/6 and 4/4)
