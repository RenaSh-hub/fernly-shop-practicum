# Cart page + promo-code slot — UI test design (T9)

Page: `/cart` with `cart-summary/promo-code` slot (`web/src/slots/cart-summary/promo-code.tsx`) and `OrderSummary`.  
Cypress UI with mocked `/api/*`. Spec: `web/cypress/ui/cart-promo.cy.ts`.

Maps to approved plan row **T9** in `docs/test-plans/feature/promo-codes.md`.

Oracle: `docs/features/promo-codes.md`; `docs/APP-MAP.md` cart row.

Signed-in visits set `localStorage.fernly_token` and intercept `GET /api/auth/me` (reuse `cart/auth-me.json`).

Fixtures under `web/cypress/fixtures/cart/` (add promo variants; do not inline API bodies):

- `cart-positive.json` — baseline cart without promo (extend with `discount: 0`, `promoCode: null` if missing)
- `cart-promo-leafy10.json` — same lines with LEAFY10 discount applied
- `cart-promo-freeship.json` — FREESHIP applied (shipping 0)
- `cart-promo-invalid.json` — 400 body `{ detail, rule: "promo_invalid" }`

| ID | kind | given (API answers) | the user does | expected | source | technique |
| --- | --- | --- | --- | --- | --- | --- |
| T9-01 | render | signed-in; GET cart without promo | visits `/cart` | Under order summary: promo field + **Apply**; no discount row | promo-codes.md:7–10 | positive — empty promo UI |
| T9-02 | apply | GET cart; POST `/api/cart/promo` 200 → leafy10 cart | types `LEAFY10`, clicks **Apply** | Summary shows **Discount (LEAFY10)** and updated total; applied state **Code LEAFY10 applied** | promo-codes.md:7–10 | positive — apply updates summary |
| T9-03 | remove | GET cart already with LEAFY10; DELETE `/api/cart/promo` 200 → cart without promo | clicks **Remove** | Discount row gone; promo field returns | promo-codes.md:8 | positive — remove clears discount |
| T9-04 | error | GET cart; POST promo 400 `promo_invalid` | types `BADCODE`, clicks **Apply** | API error detail shown on the control; totals unchanged | promo-codes.md:13 | negative — refused code |
| T9-05 | edge | GET cart with LEAFY10; POST promo 200 → FREESHIP cart | (replace) apply `FREESHIP` after leafy applied — start from leafy applied fixture then intercept POST | Only FREESHIP applied; shipping **Free** | promo-codes.md:8, 11 | edge — replace code |
| T9-06 | edge | GET cart; POST promo 200 leafy10 (accept lowercase body) | types `leafy10`, clicks **Apply** | Applied as LEAFY10 in UI / summary | promo-codes.md:9 | edge — lowercase input |

## Approval

**Approved** — cites approved plan `docs/test-plans/feature/promo-codes.md` (plan-approved; row T9). Parent change-triage authorized implementation.
