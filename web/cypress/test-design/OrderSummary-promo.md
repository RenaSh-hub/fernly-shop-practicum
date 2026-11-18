# OrderSummary — promo discount rows (T7)

Component: `web/src/components/OrderSummary.tsx`  
New props: `discount?` (number, default 0), `promoCode?` (string | null, default null).

Maps to approved plan row **T7** in `docs/test-plans/feature/promo-codes.md`.  
Append these cases to `web/cypress/component/OrderSummary.cy.tsx` — do **not** remove existing OS-01–OS-23 tests.

Oracle: `docs/features/promo-codes.md` (discount line `Discount (CODE) −$x.xx`); PRODUCT.md two-decimal money.

**With discount:**

```ts
const withDiscount = {
  itemCount: 1,
  subtotal: 40,
  shipping: 6.95,
  discount: 4,
  promoCode: 'LEAFY10',
  total: 42.95,
};
```

| ID | kind | given (props) | the user does | expected | source | technique |
| --- | --- | --- | --- | --- | --- | --- |
| T7-01 | render | `withDiscount` | mounts | Term **Discount (LEAFY10)** and amount **−$4.00** | promo-codes.md:10 | positive — discount > 0 with code |
| T7-02 | render | `charged` (`itemCount: 2, subtotal: 25, shipping: 6.95, total: 31.95`), omit discount/promoCode | mounts | No **Discount** term | promo-codes.md:10; OrderSummary default discount 0 | positive — no discount row when omitted |
| T7-03 | render | `charged` plus `discount={0}`, `promoCode="LEAFY10"` | mounts | No **Discount** term | promo-codes.md:10 | positive — discount === 0 hides row even if code set |
| T7-04 | edge | `itemCount: 1, subtotal: 40, shipping: 6.95, discount: 4, promoCode: null, total: 42.95` | mounts | Term **Discount** without `(code)`; amount **−$4.00** | plan T7 edge; OrderSummary props | edge — null promoCode still shows Discount |
| T7-05 | accessibility | `withDiscount` | mounts | A region named **Order summary**; discount amount text **−$4.00** is visible inside it | PRODUCT.md:61; promo-codes.md:10 | accessibility — labelled region + readable amount |

## Approval

**Approved** — cites approved plan `docs/test-plans/feature/promo-codes.md` (plan-approved; row T7). Parent change-triage authorized implementation.
