# Results: feature/promo-codes

Plan: `docs/test-plans/feature/promo-codes.md` (approved).  
Oracle: `docs/features/promo-codes.md` + `docs/PRODUCT.md` + OpenAPI; product docs win over code.  
App code unchanged (`web/src`, `api/src`); `tests/a11y/a11y-baseline.json` not edited.

## Summary

| row | test | result | possible finding |
| --- | --- | --- | --- |
| T1 | `tests/api/promo-codes.spec.ts` — LEAFY10 plants-only discount; validation; shipping unchanged | **fail** (schema, `promoCode`, shipping, validation, total math vs returned discount pass; soft: discount **2.69** ≠ **2.00**) | Percent off includes shipping. See FINDINGS Suspicions. |
| T2 | `tests/api/promo-codes.spec.ts` — FREESHIP; $50 pre-discount rule; percent keeps free shipping | **fail** (FREESHIP → shipping 0 pass; under-$50 after percent keeps shipping pass; soft: $50 cart still **6.95**; leafy discount includes shipping; shipping not free after leafy at $50) | `$50` uses `>`; percent base wrong. See FINDINGS Suspicions. |
| T3 | `tests/api/promo-codes.spec.ts` — case-insensitive; replace; DELETE; unknown | **fail** (`leafy10`→LEAFY10, replace FREESHIP, DELETE clear, unknown `promo_invalid` pass; soft: discount **1.95** ≠ **1.25**) | Same percent-base bug. See FINDINGS Suspicions. |
| T4 | `tests/api/promo-codes.spec.ts` — expired SPRING5; empty cart | **fail** (empty cart `empty_cart` + “Add a plant…” pass; unknown `promo_invalid` pass; **SPRING5 → 200**) | Expired code accepted. See FINDINGS Suspicions. |
| T5 | `tests/api/promo-codes.spec.ts` — auth on promo routes | **pass** | — |
| T6 | `tests/api/promo-codes.spec.ts` — order keeps promo; cart clears | **fail** (order copies `promoCode`/`discount`/`total`; new cart null/0 pass; soft: cart discount wrong vs plants-only oracle) | Same percent-base bug on stored order amounts. See FINDINGS Suspicions. |
| T7 | `web/cypress/component/OrderSummary.cy.tsx` — T7-01..05 | **fail** (2 pass / 3 fail: T7-01, T7-04, T7-05) | Discount shows `−$4` not `−$4.00` (F-01 family). See FINDINGS Suspicions. |
| T8 | `web/cypress/component/PromoCodeInput.cy.tsx` — T8-01..10 | **fail** (8 pass / 2 fail: T8-09, T8-10) | Missing accessible name; error not in live region. See FINDINGS Suspicions. |
| T9 | `web/cypress/ui/cart-promo.cy.ts` — T9-01..06 | **pass** (6/6) | — |
| T10 | `web/cypress/ui/checkout-order-promo.cy.ts` — T10-01..04 | **pass** (4/4) | — |
| T11 | `tests/e2e/promo-codes.spec.ts` — cart → checkout → order; FREESHIP; refusals | **fail** (LEAFY10 + order page + cart clear + FREESHIP through checkout pass; soft: SPRING5 accepted / no expired copy; discount plants-only) | Expired + percent-base. See FINDINGS Suspicions. |
| T12 | `tests/a11y/pages.spec.ts` — Cart promo field / applied; Checkout with discount | **fail** | New axe `label` on promo input; `color-contrast` on PriceTag (F-12 class) on new scan names. See FINDINGS Suspicions. |

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
