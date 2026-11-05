# Fernly findings

One entry per proven issue, ordered by severity: money and privacy first, then broken flows, then everything else. A finding needs evidence: a failing test, or exact steps and requests. Until then it stays under "Suspicions — not yet tested".

The page, component and API map is in [docs/APP-MAP.md](docs/APP-MAP.md).

## Entry format

```markdown
### F-NN: <one-line title: what is wrong>

- **Where:** <page, component, or endpoint>
- **Category:** <Components | Pages | Business rules in the API | The contract | Caching | Authorization | Accessibility>
- **Impact:** <the impact on a customer, in one sentence>
- **Evidence:** <the test that fails (file and test name), or the exact steps and requests>
- **Contradicts:** <the line in docs/PRODUCT.md or the API contract>
- **Suggested fix (optional):** <one line>
```

## Findings

### F-01: The + button stays enabled at the stock limit

- **Where:** `QuantityStepper` (`QuantityStepper.tsx`); used on the plant page and cart lines via `CartLine`.
- **Category:** Components
- **Impact:** When quantity already equals stock, + stays clickable, so the shop looks like it allows more than is available until the API refuses it.
- **Evidence:** `web/cypress/component/QuantityStepper.cy.tsx` — test **disables + at the stock limit** (fails: + is enabled when `value={3}` and `max={3}`).
- **Contradicts:** docs/PRODUCT.md L34 — "Quantity … can never go above the stock left: at the stock limit, the **+** button is disabled."; L41 — "A line can never hold more than the plant's stock."
- **Suggested fix:** Disable + when `value >= max`, not only when `value > max`.

### F-02: Prices are not shown with two decimals

- **Where:** `formatPrice` (`web/src/money.ts`); every `PriceTag` and other callers.
- **Category:** Components
- **Impact:** Customers see `$12.5`, `$22`, and `$50` instead of `$12.50`, `$22.00`, and `$50.00`, which looks inconsistent and contradicts the shop’s stated formatting rule.
- **Evidence:** `web/cypress/component/PriceTag.cy.tsx` — **executed**, 11 failing tests (PT-01, PT-02, PT-04, PT-06, PT-08, PT-09, PT-10, PT-12, PT-13, PT-14, PT-15): DOM shows e.g. `$12.5` when the test expects `$12.50`. `web/cypress/component/SizePicker.cy.tsx` — **executed**, tests **SP-07: Medium option includes +$6.00**, **SP-08: Large option includes +$14.00**, **SP-17: each radio name includes long label and price line** (accessible names show `Medium +$6` and `Large +$14` instead of `+$6.00` / `+$14.00`). `web/cypress/ui/browse.cy.ts` — **executed**, test **shows $0.00 when a plant is priced at zero** (DOM shows `$0`).
- **Contradicts:** docs/PRODUCT.md L31 — "Every price is shown in dollars with **two decimals**, everywhere: `$12.50`, never `$12.5`."
- **Suggested fix:** Format cents with fixed two fractional digits after rounding (e.g. `toFixed(2)` on the rounded dollar amount).

### F-03: A catalog load failure looks like an empty filter result

- **Where:** `BrowsePage` (`BrowsePage.tsx`).
- **Category:** Pages
- **Impact:** When the plant list cannot be loaded, customers see "No plants match your filters" with no way to retry, as if their filters were too strict.
- **Evidence:** `web/cypress/ui/browse.cy.ts` — **executed**, test **shows an error alert with Try again when the catalog request fails** (no `role="alert"` or Try again button; empty-state copy is shown instead).
- **Contradicts:** docs/PRODUCT.md L27 — "If the catalog can't be loaded, the page says so and offers **Try again**. It never pretends there are no plants."
- **Suggested fix:** On `plants.isError`, render `ErrorBanner` with retry (refetch); reserve `EmptyState` for a successful empty `items` list.

## Suspicions — not yet tested

Things that look different from [docs/PRODUCT.md](docs/PRODUCT.md), seen while mapping the app (Nov 3, 2026, seed data). Line numbers refer to `docs/PRODUCT.md`. A suspicion is not a finding until a test proves it.

- **Signing out leaves a viewed order in the data cache:** `signOut` clears the `['cart']` and `['orders']` queries but not `['order', id]` (`AuthContext.tsx`, `queries.ts`), so the next customer on the same device may briefly see the previous customer's order. May contradict L49: "An order is private: only the customer who placed it can see it." and L55: "Signing out forgets the session on this device."
- **The plant page shows the previous plant after a "Likes the same light" link:** from String of Pearls, clicking Fiddle Leaf Fig changed the address to `/plants/pl-fiddle` but the heading still read "String of Pearls" (and quantity stayed at 2); `usePlant` caches under `['plant']` without the id. May contradict L35: "The plant page always shows the plant in the address bar, including after following a 'Likes the same light' link."
- **"Price: high to low" lists the cheapest plant first:** the UI and `GET /api/plants?sort=price-desc` both start Succulent Cutting $0.99, Aloe Vera $9.99, the same as `price-asc`. May contradict L25: "Price: high to low (most expensive first)" and the contract's "price-desc (highest first)".
- **Care level 3 is labelled "Moderate":** the API gives `careLevel: 3` for Fiddle Leaf Fig, Calathea, String of Pearls and the Thai Constellation Monstera, but the badge says "Moderate care" (three dots); `CareLevelBadge` caps the index at `LABELS.length - 1` before subtracting 1. May contradict L32: "Care level has three steps: 1 Easy, 2 Moderate, 3 Expert."
- **The plant page's main image has no alternative text:** the hero `<img>` on `/plants/:plantId` has no `alt` attribute. May contradict L62: "every meaningful image has alternative text".
- **The save (heart) buttons on plant cards have no name:** each is a `<button aria-pressed>` with only an `aria-hidden` SVG, so the accessibility tree shows an unnamed button. May contradict L61: "every button and form field has a name a screen reader can announce".
- **The search field has no name:** the `<input type="search">` has no label or `aria-label`; "Search plants" is a separate visual hint that disappears on typing. `web/cypress/component/SearchBox.cy.tsx` — **executed**, tests **SB-15: search field named Search plants when empty** and **SB-16: search field named Search plants when filled** (accessibility tree: searchbox with Name `""`; visual hint is not associated with the input). Screenshots under `web/cypress/screenshots/SearchBox.cy.tsx/`. May contradict L61: "every button and form field has a name a screen reader can announce".
- **The search field hides its keyboard focus:** `SearchBox.module.css` sets `outline: none` on the input and nothing replaces it. May contradict L64: "everything works with the keyboard alone, and focus is always visible."
- **Prices have low contrast:** the large price on the plant page is `rgb(141, 187, 138)` on `rgb(246, 250, 243)`, about 2.07:1 (measured); other prices use the same green. May contradict L63: "text has enough contrast against its background (4.5:1 for normal text)".
- **PriceTag drops the trailing zeros PRODUCT.md requires:** `web/cypress/component/PriceTag.cy.tsx` — **executed**. Tests **PT-01: shows $12.50 for amount 12.5** (actual `$12.5`), **PT-02: shows $22.00 for whole dollars** (actual `$22`), **PT-04: shows $0.00 for zero** (actual `$0`), **PT-06: shows $50.00 at the free-shipping threshold** (actual `$50`), **PT-09: shows the price with no screen-reader prefix** (actual `$12.5`), **PT-10: includes hidden Price: before $12.50** (actual `Price: $12.5`; the hidden `Price:` prefix is present), **PT-13: shows $12.50 at size sm** (actual `$12.5`), **PT-14: shows $12.50 at the default size** (actual `$12.5`), **PT-15: shows $99.00 at size lg** (actual `$99`). Screenshots are under `web/cypress/screenshots/PriceTag.cy.tsx/`. May contradict L31: "Every price is shown in dollars with **two decimals**, everywhere: `$12.50`, never `$12.5`."

## Questions — neither document answers

- On the cart page in the browser's default narrow tab (627 px wide) the cart line's + button is clipped by its 64 px stepper box (`overflow: hidden`). Is a narrow window in scope, and should a line's quantity be raisable from the cart?
- A paid order (`/orders/:id`, $25 subtotal) still shows "Add $25 more for free shipping." Should the hint appear on a placed order?
- Checkout shows the API's raw validation text (`shippingAddress.fullName: fullName must not be empty; …`) in one banner instead of per field. What message should a customer see?
- ZZ Plant's image is `snake.svg`, the same picture as Snake Plant. Is that intended?
- The contract caps a cart quantity at 20, but some plants have more stock (Succulent Cutting: 40). Which limit should the shop enforce?
- `/login` still shows the form to a signed-in customer. Should it redirect?
- `GET /api/orders` is requested even while signed out (and gets 401). Harmless, or should it wait for sign-in?

## Checked and consistent so far (not tests)

Quick API and browser checks that matched PRODUCT.md, so they are lower priority: search ignores case (`MONSTERA`, `FICUS`); Low + Bright light gives 14 = 6 + 8; pet-safe returns only pet-safe plants; 21 plants in pages of 12 and 9; signed-out Add to cart and `/cart` both go to sign-in; a $25 cart charges $6.95 shipping; placing an order empties the cart and lists the order.
