# OrderSummary — component test design

Component: `web/src/components/OrderSummary.tsx`  
Props: `itemCount` (number), `subtotal` (number), `shipping` (number), `total` (number), `title?` (string, default `'Order summary'`). Also exports `FREE_SHIPPING_FROM = 50`.

Display-only. No callbacks. Cart and Checkout omit `title`; the one-order page passes `title="Paid"`. The component **does not compute** shipping or total — it prints the numbers it is given. "Free" is shown only when `shipping === 0` **and** `itemCount > 0`. The free-shipping hint is shown only when `itemCount > 0` **and** the amount still needed to reach $50 is greater than 0. Do not assert CSS module classes or font sizes (see `.cursor/rules/cypress-tests.mdc`). PriceTag size/`label` coverage stays in `PriceTag.md`.

**Typical charged cart** (PRODUCT.md: a cart under $50 pays $6.95; FINDINGS: $25 cart):

```ts
const charged = { itemCount: 2, subtotal: 25, shipping: 6.95, total: 31.95 };
```

**At the free-shipping threshold** (parent already passed `shipping={0}`):

```ts
const atThreshold = { itemCount: 1, subtotal: 50, shipping: 0, total: 50 };
```

| ID | kind | given (props) | the user does | expected | source | technique |
| --- | --- | --- | --- | --- | --- | --- |
| OS-01 | render | `charged` (omit `title`) | mounts | Heading **Order summary**; terms Subtotal, Shipping, Total | APP-MAP L38 — default title `'Order summary'`; Cart and Checkout omit `title` | default prop — `title` |
| OS-02 | render | `charged`, `title="Paid"` | mounts | Heading **Paid** (not Order summary) | APP-MAP L38 — One order passes `title="Paid"` | equivalence class — custom `title` |
| OS-03 | boundary | `itemCount={1}`, `subtotal={12.5}`, `shipping={6.95}`, `total={19.45}` | mounts | Subtotal term includes **1 item** (not "items") | APP-MAP L38 — Subtotal (n items) | boundary — `itemCount` 1 (singular) |
| OS-04 | boundary | `itemCount={2}`, `subtotal={25}`, `shipping={6.95}`, `total={31.95}` | mounts | Subtotal term includes **2 items** (not "item") | APP-MAP L38 — Subtotal (n items) | boundary — one past singular (`itemCount` 2) |
| OS-05 | boundary | `itemCount={0}`, `subtotal={0}`, `shipping={0}`, `total={0}` | mounts | Subtotal term includes **0 items** | APP-MAP L38 — Subtotal (n items); PRODUCT.md L42 — empty cart | boundary — `itemCount` 0 |
| OS-06 | render | `charged` | mounts | Subtotal amount is **$25.00** | PRODUCT.md L31 — two decimals everywhere | equivalence class — `subtotal` display |
| OS-07 | render | `charged` | mounts | Shipping amount is **$6.95** (not Free) | PRODUCT.md L42 — shipping costs **$6.95** when the subtotal is under $50 | equivalence class — `shipping` > 0 |
| OS-08 | render | `charged` | mounts | Total amount is **$31.95** | APP-MAP L38 — displays the `total` it is given | equivalence class — `total` display |
| OS-09 | state | `atThreshold` | mounts | Shipping shows **Free** (not `$0.00`) | APP-MAP L38 — "Free" when shipping is 0 and there are items; PRODUCT.md L42 — free at $50.00 or more | state — `shipping` 0 with items |
| OS-10 | state | `itemCount={0}`, `subtotal={0}`, `shipping={0}`, `total={0}` | mounts | Shipping shows **$0.00**, not Free | PRODUCT.md L42 — an empty cart has no shipping; APP-MAP L38 — "Free" only when there are items | boundary — `shipping` 0 with `itemCount` 0 |
| OS-11 | render | `itemCount={1}`, `subtotal={60}`, `shipping={6.95}`, `total={66.95}` | mounts | Shipping shows **$6.95**, not Free | APP-MAP L38 — displays the numbers it is given; it does not compute shipping | equivalence class — `shipping` unchanged when subtotal ≥ $50 |
| OS-12 | render | `charged` | mounts | Hint **Add $25.00 more for free shipping.** | APP-MAP L38 — hint when the subtotal is under $50; PRODUCT.md L31 — two decimals | equivalence class — hint when under threshold |
| OS-13 | render | `itemCount={1}`, `subtotal={0}`, `shipping={6.95}`, `total={6.95}` | mounts | Hint **Add $50.00 more for free shipping.** | PRODUCT.md L42 — free from **$50.00**; L31 — two decimals | boundary — remaining equals full threshold ($50) |
| OS-14 | boundary | `itemCount={1}`, `subtotal={49.99}`, `shipping={6.95}`, `total={56.94}` | mounts | Hint **Add $0.01 more for free shipping.** | PRODUCT.md L42 — free when the subtotal is **$50.00 or more** | boundary — one cent below $50 |
| OS-15 | boundary | `atThreshold` | mounts | No free-shipping hint | PRODUCT.md L42 — free at **$50.00 or more** (`missing` is 0) | boundary — at $50 limit (hint off) |
| OS-16 | boundary | `itemCount={1}`, `subtotal={50.01}`, `shipping={0}`, `total={50.01}` | mounts | No free-shipping hint | PRODUCT.md L42 — $50.00 or more | boundary — one cent past $50 |
| OS-17 | boundary | `itemCount={0}`, `subtotal={0}`, `shipping={0}`, `total={0}` | mounts | No free-shipping hint | APP-MAP L38 — hint when there are items and the subtotal is under $50; PRODUCT.md L42 — empty cart | boundary — `itemCount` 0 (hint off) |
| OS-18 | boundary | `itemCount={0}`, `subtotal={40}`, `shipping={6.95}`, `total={46.95}` | mounts | No free-shipping hint | APP-MAP L38 — hint requires items (`itemCount > 0`) | boundary — `itemCount` 0 even when `subtotal` < $50 |
| OS-19 | render | `itemCount={1}`, `subtotal={25}`, `shipping={6.95}`, `total={99}` | mounts | Total amount is **$99.00** (not subtotal + shipping) | APP-MAP L38 — displays the `total` it is given (does not add subtotal + shipping) | equivalence class — `total` independent of other props |
| OS-20 | accessibility | `charged` (omit `title`) | mounts | A region named **Order summary** (heading labels the section) | PRODUCT.md L61 — every button and form field has a name; APP-MAP L38 — `aria-labelledby` on the section | accessibility — region name |
| OS-21 | accessibility | `charged`, `title="Paid"` | mounts | A region named **Paid** | PRODUCT.md L61; APP-MAP L38 — One order title **Paid** | accessibility — custom region name |
| OS-22 | accessibility | `charged` | mounts | There are no buttons in the component | PRODUCT.md L61 — every button … has a name (none here); APP-MAP L38 — summary rows only | accessibility — button names (N/A) |
| OS-23 | boundary | `itemCount={20}`, `subtotal={999999.99}`, `shipping={0}`, `total={999999.99}` | mounts | Subtotal and total formatted with `$` and two decimals; Shipping **Free**; no layout crash | PRODUCT.md L31 — two decimals; APP-MAP L73 — cart line quantity 1–20 (aggregate `itemCount` can reach 20) | boundary — extreme money and `itemCount` at contract max |

## Test-lead checklist

| Check | Coverage |
| --- | --- |
| Every prop that changes visible copy | `title` OS-01–OS-02; `itemCount` label OS-03–OS-05; `subtotal` OS-06 + hint math OS-12–OS-16; `shipping` OS-07, OS-09–OS-11; `total` OS-08, OS-19 |
| `itemCount` limits | Singular OS-03; first plural OS-04; zero OS-05; gates hint off OS-17–OS-18; min positive for Free/hint OS-09, OS-13 |
| `$50` free-shipping limit | Full remaining OS-13; $0.01 below OS-14; at limit OS-15; one cent past OS-16; typical under OS-12 |
| `shipping === 0` vs charged | Free with items OS-09; `$0.00` without items OS-10; charged OS-07; does not infer from subtotal OS-11 |
| Does not compute money | Total OS-19; shipping OS-11 |
| Every button has a name | OS-22 (no buttons) |
| Named region | OS-20–OS-21 |

## Notes

- **Two-decimal copy (OS-06, OS-08, OS-10, OS-12–OS-14, OS-19, OS-23)** may fail until F-02 (`formatPrice`) is fixed. The hint uses `formatPrice` directly — keep those assertions.
- Cart and Checkout do not mount this on an empty cart; OS-05, OS-10, OS-17 still match PRODUCT.md L42 for empty props.
- Paid orders with a subtotal under $50 still get the hint today (FINDINGS open question); no row until PRODUCT.md or APP-MAP defines expected behavior.
- Parent/API sending `shipping={0}` with a subtotal under $50 is out of scope here; OS-11 asserts the component does not upgrade that to **Free** from subtotal alone.

## Approval

**Approved** — implemented in `web/cypress/component/OrderSummary.cy.tsx`. Five tests fail until F-02 (`formatPrice` two-decimal padding): OS-06, OS-10, OS-12, OS-13, OS-19.
