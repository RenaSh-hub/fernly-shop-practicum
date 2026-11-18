# Checkout & order pages — promo display UI (T10)

Pages: `/checkout` (`CheckoutPage`) and `/orders/:id` (`OrdersPage` paid summary).  
Display-only discount via `OrderSummary` — no apply/remove on these pages (plan assumed #5; docs put the field on cart only).

Cypress UI with mocked `/api/*`. Spec: `web/cypress/ui/checkout-order-promo.cy.ts`.

Maps to approved plan row **T10** in `docs/test-plans/feature/promo-codes.md`.

Oracle: `docs/features/promo-codes.md` L10, L16.

Signed-in: `localStorage.fernly_token` + `GET /api/auth/me` (`orders/auth-me.json` or `cart/auth-me.json`).

Fixtures (one file per scenario under `web/cypress/fixtures/`):

- `cart/cart-promo-leafy10.json` — cart with discount/promo for checkout
- `cart/cart-positive.json` — cart with `discount: 0` / `promoCode: null` (update if needed)
- `orders/order-promo-leafy10.json` — single order with discount/promoCode
- `orders/order-no-promo.json` — order with discount 0 / promoCode null

| ID | kind | given (API answers) | the user does | expected | source | technique |
| --- | --- | --- | --- | --- | --- | --- |
| T10-01 | render | signed-in; GET cart with LEAFY10 discount | visits `/checkout` | Order summary shows **Discount (LEAFY10)** and −$ amount; no promo Apply field | promo-codes.md:10, 16 | positive — checkout shows discount |
| T10-02 | render | signed-in; GET order with LEAFY10 | visits `/orders/<id>` | **Paid** summary shows **Discount (LEAFY10)** | promo-codes.md:16 | positive — paid order keeps code |
| T10-03 | render | signed-in; GET cart with discount 0 | visits `/checkout` | No **Discount** row | promo-codes.md:10 | negative — no discount row when 0 |
| T10-04 | render | signed-in; GET order with discount 0 | visits `/orders/<id>` | No **Discount** row in **Paid** | promo-codes.md:16 | negative — paid without promo |

## Approval

**Approved** — cites approved plan `docs/test-plans/feature/promo-codes.md` (plan-approved; row T10). Parent change-triage authorized implementation.
