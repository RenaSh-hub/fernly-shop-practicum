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

### F-01: Prices are not shown with two decimals

- **Where:** `formatPrice` (`web/src/money.ts`); every `PriceTag` and other callers.
- **Category:** Components
- **Impact:** Customers see `$12.5`, `$22`, and `$50` instead of `$12.50`, `$22.00`, and `$50.00`, which looks inconsistent and contradicts the shop’s stated formatting rule.
- **Evidence:** `web/cypress/component/PriceTag.cy.tsx` — **executed**, tests **PT-01: shows $12.50 for amount 12.5**, **PT-02: shows $22.00 for whole dollars**, **PT-04: shows $0.00 for zero**, **PT-06: shows $50.00 at the free-shipping threshold**, **PT-09: shows the price with no screen-reader prefix**, **PT-10: includes hidden Price: before $12.50**, **PT-12: includes hidden Line total:**, **PT-13: shows $12.50 at size sm**, **PT-14: shows $12.50 at the default size**, **PT-15: shows $99.00 at size lg**: DOM shows amounts without required trailing zeros (e.g. `$12.5`). `web/cypress/component/CartLine.cy.tsx` — **executed**, tests **CL-05: unit price $30.50 and each**, **CL-07: line total $61.00**, **CL-08: $24.50 each and $99.00 line total**, **CL-09: zero money shows $0.00**. `web/cypress/component/SizePicker.cy.tsx` — **executed**, tests **SP-07: Medium option includes +$6.00**, **SP-08: Large option includes +$14.00**, **SP-17: each radio name includes long label and price line**. `web/cypress/ui/browse.cy.ts` — **executed**, test **shows $0.00 when a plant is priced at zero**. `web/cypress/ui/plant.cy.ts` — **executed**, test **shows $0.00 when the plant base price is zero**. `web/cypress/ui/cart.cy.ts` — **executed**, test **shows $0.00 when a line unit price and line total are zero**. `web/cypress/ui/orders.cy.ts` — **executed**, test **shows $0.00 when an order total is zero**. `web/cypress/component/PlantCard.cy.tsx` — **executed**, tests **PC-05: price shows $24.50**, **PC-06: whole-dollar price $22.00**, **PC-07: zero price $0.00**. `web/cypress/component/OrderSummary.cy.tsx` — **executed**, tests **OS-06: subtotal amount is $25.00**, **OS-10: empty cart shipping is $0.00, not Free**, **OS-12: hint Add $25.00 more for free shipping**, **OS-13: hint Add $50.00 more for free shipping**, **OS-19: total is $99.00**, **T7-01: shows Discount (LEAFY10) and −$4.00**, **T7-04: Discount without code and −$4.00 when promoCode is null**, **T7-05: Order summary region contains −$4.00** (DOM shows `−$4` not `−$4.00`).
- **Contradicts:** docs/PRODUCT.md L31 — "Every price is shown in dollars with **two decimals**, everywhere: `$12.50`, never `$12.5`."
- **Suggested fix:** Format cents with fixed two fractional digits after rounding (e.g. `toFixed(2)` on the rounded dollar amount).

### F-02: The + button stays enabled at the stock limit

- **Where:** `QuantityStepper` (`QuantityStepper.tsx`); used on the plant page and cart lines via `CartLine`.
- **Category:** Components
- **Impact:** When quantity already equals stock, + stays clickable, so the shop looks like it allows more than is available until the API refuses it.
- **Evidence:** `web/cypress/component/QuantityStepper.cy.tsx` — **executed**, tests **QS-05: + disabled at stock limit**, **QS-08: + disabled when only one unit in stock**, **QS-11: + at max does not call onChange**, **QS-12: readout 20 and + disabled at API max** (+ stays enabled when `value === max`). `web/cypress/component/CartLine.cy.tsx` — **executed**, tests **CL-12: + disabled at stock limit**, **CL-14: quantity and stock both 1 — stepper disabled, Remove enabled**, **CL-15: quantity 20 at stock 20 — output 20 and + disabled** (+ stays enabled when `quantity === stock`).
- **Contradicts:** docs/PRODUCT.md L34 — "Quantity … can never go above the stock left: at the stock limit, the **+** button is disabled."; L41 — "A line can never hold more than the plant's stock."
- **Suggested fix:** Disable + when `value >= max`, not only when `value > max`.

### F-03: A catalog load failure looks like an empty filter result

- **Where:** `BrowsePage` (`BrowsePage.tsx`).
- **Category:** Pages
- **Impact:** When the plant list cannot be loaded, customers see "No plants match your filters" with no way to retry, as if their filters were too strict.
- **Evidence:** `web/cypress/ui/browse.cy.ts` — **executed**, test **shows an error alert with Try again when the catalog request fails** (no `role="alert"` or Try again button; empty-state copy is shown instead). The plant detail page (`PlantPage`) does use **ErrorBanner** with Try again when **GET `/api/plants/{id}`** fails (see `web/cypress/ui/plant.cy.ts`, test **shows an error alert with Try again when the plant request fails**); browse still lacks that behavior on **GET `/api/plants?*`** failure.
- **Contradicts:** docs/PRODUCT.md L27 — "If the catalog can't be loaded, the page says so and offers **Try again**. It never pretends there are no plants."
- **Suggested fix:** On `plants.isError`, render `ErrorBanner` with retry (refetch); reserve `EmptyState` for a successful empty `items` list.

### F-04: Care level 3 is labelled "Moderate" instead of "Expert"

- **Where:** `CareLevelBadge` (`CareLevelBadge.tsx`); surfaced on plant cards and elsewhere.
- **Category:** Components
- **Impact:** Plants that need expert care are labelled moderate, which misleads customers about how hard a plant is to keep.
- **Evidence:** `web/cypress/component/CareLevelBadge.cy.tsx` — **executed**, tests **CLB-03: three dots and Expert care at level 3**, **CLB-06: hides dots from assistive tech; name is Expert care** (DOM shows **Moderate care** with three dots when `level={3}`). `web/cypress/component/PlantCard.cy.tsx` — **executed**, test **PC-19: Expert care** (DOM shows **Moderate care** when `careLevel={3}`).
- **Contradicts:** docs/PRODUCT.md L32 — "Care level has three steps: 1 **Easy**, 2 **Moderate**, 3 **Expert**."
- **Suggested fix:** Map `level={3}` to the Expert label (and three dots) without capping the level index in a way that collapses 3 onto 2.

### F-05: Save (heart) buttons on plant cards have no accessible name

- **Where:** `PlantCard` (`PlantCard.tsx`).
- **Category:** Accessibility
- **Impact:** Screen reader users hear an unnamed control and cannot tell what the heart button does.
- **Evidence:** `web/cypress/component/PlantCard.cy.tsx` — **executed**, tests **PC-23: save button has a name when unsaved**, **PC-24: save button has a name when saved** (accessible role `button` with Name `""`). `tests/a11y/pages.spec.ts` — **executed**, test **Browse (/) @a11y** reports blocking `button-name` on each card’s save control (matches `.PlantCard-module__save`).
- **Contradicts:** docs/PRODUCT.md L61 — "every button and form field has a name a screen reader can announce".
- **Suggested fix:** Add visible text, `aria-label`, or `aria-labelledby` so the button’s accessible name describes save/unsaved state.

### F-06: The search field has no accessible name

- **Where:** `SearchBox` (`SearchBox.tsx`).
- **Category:** Accessibility
- **Impact:** The main browse search is exposed as a searchbox with no name; the visual hint is not programmatically associated with the input.
- **Evidence:** `web/cypress/component/SearchBox.cy.tsx` — **executed**, tests **SB-15: search field named Search plants when empty**, **SB-16: search field named Search plants when filled** (accessibility tree: searchbox with Name `""`). `tests/a11y/pages.spec.ts` — **executed**, test **Browse (/) @a11y** reports blocking `label` on `.SearchBox-module__input`.
- **Contradicts:** docs/PRODUCT.md L61 — "every button and form field has a name a screen reader can announce".
- **Suggested fix:** Use a real `<label htmlFor=…>`, `aria-label`, or `aria-labelledby` tied to the persistent "Search plants" text.

### F-07: ErrorBanner alerts have no accessible name

- **Where:** `ErrorBanner` in `Feedback` components (`Feedback.tsx` or adjacent).
- **Category:** Accessibility
- **Impact:** `role="alert"` regions do not expose the error text as their accessible name, so assistive tech may not announce them usefully.
- **Evidence:** `web/cypress/component/Feedback.cy.tsx` — **executed**, tests **EB-08: alert named with the order load error**, **EB-10: no buttons when onRetry omitted; alert shows message** (accessible `alert` with Name `""`).
- **Contradicts:** docs/PRODUCT.md L59 — "Fernly aims for **WCAG 2.1 level AA** on every page"; L61 — control/region naming expectations for assistive technology.
- **Suggested fix:** Put the message in `aria-labelledby` / `aria-label` on the alert container, or use a pattern where the alert’s accessible name includes the visible message.

### F-08: Toast status regions have no accessible name

- **Where:** `Toast` in `Feedback` components.
- **Category:** Accessibility
- **Impact:** Status toasts use `role="status"` but the live message is not the region’s accessible name.
- **Evidence:** `web/cypress/component/Feedback.cy.tsx` — **executed**, tests **TO-13: status named with the success message**, **TO-14: error tone remains status, not alert** (accessible `status` with Name `""`).
- **Contradicts:** docs/PRODUCT.md L59 — "Fernly aims for **WCAG 2.1 level AA** on every page"; L61 — naming for assistive technology.
- **Suggested fix:** Mirror the ErrorBanner fix: ensure the status region’s accessible name includes the toast text.

### F-09: Plant detail returns `rating` as a string while OpenAPI says number

- **Where:** `GET /api/plants/{plantId}` (`api/src/store.ts`, `getPlant`).
- **Category:** The contract
- **Impact:** Clients and contract checks expect a JSON number; a string breaks strict schema validation and type-aware consumers.
- **Evidence:** `tests/api/plants.spec.ts` — **executed**, test **Plants API › a plant matches the Plant schema @api** fails: `Body does not match schema Plant:\n/rating must be number` (from `tests/helpers/schema.ts` → AJV), because `getPlant` returns `rating` from `plant.rating.toFixed(1)` (string).
- **Contradicts:** `GET /openapi.json` — `Plant` / `PlantSummary` define `rating` as `number`; same shape in `api/src/schemas.ts`.
- **Suggested fix:** Return the numeric `rating` from `summary()` in detail responses; format for display only in the web UI.

### F-10: `sort=price-desc` orders ascending like `price-asc`

- **Where:** `GET /api/plants` (`api/src/store.ts`, `listPlants`).
- **Category:** Business rules in the API
- **Impact:** “Price: high to low” in the API returns cheapest-first order, contradicting product and OpenAPI text.
- **Evidence:** `tests/api/plants.spec.ts` — **executed**, test **Plants API › "price-desc" returns the most expensive first @api** fails: `items[0].price should be >= items[1].price` with `Received: 0.99`, `Expected: >= 9.99` for adjacent items, because `listPlants` uses the same ascending sort for `price-desc` as for `price-asc`.
- **Contradicts:** docs/PRODUCT.md L25 — "Price: high to low **(most expensive first)**"; OpenAPI `/api/plants` description — "price-desc (highest first)".
- **Suggested fix:** Sort `price-desc` by `b.price - a.price` separately from `price-asc`.

### F-11: Browse shows the cheapest plant first when `price-desc` is broken

- **Where:** Browse page `/` with **Sort by → Price: high to low** (`web/src` + `GET /api/plants?sort=price-desc`).
- **Category:** Pages
- **Impact:** Customers believe they sorted most-expensive-first but see the opposite order on the first row.
- **Evidence:** `tests/e2e/browse.spec.ts` — **executed**, test **Browse › choosing "Price: high to low" shows the most expensive plant first @e2e** fails: first card heading is not the most expensive plant (oracle: last item of `GET …/api/plants?sort=price-asc&pageSize=48`) when the API keeps `price-desc` in ascending order.
- **Contradicts:** docs/PRODUCT.md L25 — "Price: high to low **(most expensive first)**".
- **Suggested fix:** Fix API ordering for `price-desc` (see F-10).

### F-12: Price text fails WCAG color contrast (axe `color-contrast`)

- **Where:** `PriceTag` and pages that render it (browse grid, plant detail, cart, checkout).
- **Category:** Accessibility
- **Impact:** Price text may fall below the minimum contrast ratio for normal text, so some users cannot read amounts reliably.
- **Evidence:** `tests/a11y/pages.spec.ts` — **executed**, Playwright project **a11y** (`@axe-core/playwright`, tags wcag2a, wcag2aa, wcag21a, wcag21aa): **Browse (/)**, **Plant (/plants/pl-monstera)**, **Cart with one plant in cart**, and **Checkout with one plant in cart** each fail with blocking `color-contrast` (serious) on `PriceTag` nodes; each test attaches `axe-results` (JSON).
- **Contradicts:** docs/PRODUCT.md L63 — "text has enough contrast against its background (4.5:1 for normal text)".
- **Suggested fix:** Raise contrast (darker price color or different surface) until ratio meets 4.5:1; re-run `npx playwright test --project=a11y`.

### F-13: Plant detail hero image has no alternative text

- **Where:** `PlantPage` hero `<img>` (`web/src/pages/PlantPage.tsx`).
- **Category:** Accessibility
- **Impact:** Screen reader users hear no description of the main product photo.
- **Evidence:** `tests/a11y/pages.spec.ts` — **executed**, test **Plant (/plants/pl-monstera) @a11y** reports blocking `image-alt` (critical) on the hero `img` (see `axe-results` attachment).
- **Contradicts:** docs/PRODUCT.md L62 — "every meaningful image has alternative text".
- **Suggested fix:** Add a descriptive `alt` (e.g. plant name + product image), or mark decorative images with `alt=""` if appropriate.

### F-14: Percent promo discount includes shipping in the base

- **Where:** `GET /api/cart` after `POST /api/cart/promo` with a percent code (`api/src/store.ts`, `cart()`).
- **Category:** Business rules in the API
- **Impact:** Customers pay less than documented because the discount is computed on plants plus shipping, so totals and stored order amounts are wrong.
- **Evidence:** Hand-reproduced (Nov 9, 2026): sign in as Ava, add Peace Lily ($19.99), `POST /api/cart/promo` `{ "code": "LEAFY10" }` → `discount` **2.69** (oracle **2.00** = 10% of $19.99 only). `tests/api/promo-codes.spec.ts` — **executed**, tests **T1**, **T3** (soft), **T6** (soft); `tests/e2e/promo-codes.spec.ts` — **T11** (soft: discount vs plant subtotal).
- **Contradicts:** docs/features/promo-codes.md L10 — "A **percentage code takes that percentage off the subtotal of the plants — never off shipping.**"; OpenAPI `/api/cart/promo` description (percentage off plants, never shipping).
- **Suggested fix:** Compute percent promos from `subtotal` only, not `subtotal + shipping`.

### F-15: Expired promo code SPRING5 is accepted

- **Where:** `POST /api/cart/promo` (`api/src/promos.ts`, `findPromo`; no expiry check).
- **Category:** Business rules in the API
- **Impact:** Customers can use an expired spring deal and see a discount the shop should refuse.
- **Evidence:** Hand-reproduced: add any plant, `POST /api/cart/promo` `{ "code": "SPRING5" }` → **200**, `promoCode: "SPRING5"` (valid until 30 Apr 2026; today is after that). `tests/api/promo-codes.spec.ts` — **executed**, test **T4** (Expected **400**, Received **200**); `tests/e2e/promo-codes.spec.ts` — **T11** (soft: code sticks; no expired copy).
- **Contradicts:** docs/features/promo-codes.md L13–24 — "**Expired codes are refused**, with a message that says the code has expired."; table row `SPRING5` expired 30 Apr 2026.
- **Suggested fix:** Reject codes whose `expiresAt` is before today and return `promo_invalid` with an expired message.

### F-16: Free shipping uses strict greater-than at $50.00

- **Where:** Cart shipping rule in `api/src/store.ts` (`subtotal > FREE_SHIPPING_FROM`).
- **Category:** Business rules in the API
- **Impact:** A cart at exactly $50.00 is charged $6.95 shipping, and a percent promo at that threshold can wrongly keep shipping charged.
- **Evidence:** Hand-reproduced: Bird of Paradise alone → `subtotal` **50**, `shipping` **6.95** (oracle **0**). `tests/api/promo-codes.spec.ts` — **executed**, test **T2** (soft: shipping at $50; soft: shipping after LEAFY10 on $50 cart).
- **Contradicts:** docs/PRODUCT.md L42 — "Shipping … is **free when the subtotal is $50.00 or more.**"; docs/features/promo-codes.md L12 — free shipping from $50 decided on subtotal **before** the discount.
- **Suggested fix:** Use `subtotal >= FREE_SHIPPING_FROM` for the threshold.

### F-17: Promo code input has no accessible name

- **Where:** `PromoCodeInput` (`web/src/components/PromoCodeInput.tsx`); cart and checkout promo field.
- **Category:** Accessibility
- **Impact:** Screen reader users cannot identify the promo code field; only the visual "Have a promo code?" prompt is shown.
- **Evidence:** `web/cypress/component/PromoCodeInput.cy.tsx` — **executed**, test **T8-09: code field has accessible name Promo code** (no textbox named `/promo code/i`). `tests/a11y/pages.spec.ts` — **executed**, test **T12: Cart with promo field visible** (blocking axe `label` on promo input; soft `getByLabel(/promo code/i)` fails).
- **Contradicts:** docs/features/promo-codes.md L15 — "The code field has a visible label."; docs/PRODUCT.md L61 — "every button and form field has a name a screen reader can announce".
- **Suggested fix:** Associate a `<label htmlFor=…>`, `aria-label="Promo code"`, or equivalent with the input.

### F-18: Promo refusal message is not announced to assistive tech

- **Where:** `PromoCodeInput` error line (`web/src/components/PromoCodeInput.tsx`).
- **Category:** Accessibility
- **Impact:** When a code is refused, sighted users see the message but screen reader users may not hear it when it appears.
- **Evidence:** `web/cypress/component/PromoCodeInput.cy.tsx` — **executed**, test **T8-10: refused message is in a live region** (message not inside `[role="alert"]` or `[aria-live]`).
- **Contradicts:** docs/features/promo-codes.md L14 — "When a code is refused, the message is **announced to screen-reader users** as soon as it appears."; docs/PRODUCT.md L59–61.
- **Suggested fix:** Wrap the error in `role="alert"` or an `aria-live="assertive"` region.

### F-19: QA report publish smoke probe (P78; close PR without merging)

- **Where:** CI only (`scripts/qa-report.mjs` publish path).
- **Category:** The contract
- **Impact:** None — documents that new findings on a PR branch file a `qa-finding` issue once.
- **Evidence:** This entry exists only on branch `qa-report/smoke-p78`, not on `init`.
- **Contradicts:** _n/a_
- **Suggested fix:** Remove this finding and close the smoke PR after verification.

## Suspicions — not yet tested

Things that look different from [docs/PRODUCT.md](docs/PRODUCT.md), seen while mapping the app (Nov 3, 2026, seed data). Line numbers refer to `docs/PRODUCT.md`. A suspicion is not a finding until a test proves it.

- **Plant review list does not refresh after a successful POST:** Reviews slot invalidates `['review', plantId]` while the list query key is `['reviews', plantId]` (`web/src/slots/plant-page/reviews.tsx`). After POST 201 the toast **Thanks for your review!** appears, but the new review text does not show in the list without a full reload. **Evidence (executed):** `web/cypress/ui/plant-reviews.cy.ts` — **PR-10-02: toast Thanks for your review! and new review appears without reload** (fails: unable to find `This plant fills the room with jungle vibes.`). Also `tests/e2e/plant-reviews.spec.ts` — **PR-11** (soft fail: new review text not visible after toast; API list already contains the review). Contradicts `docs/features/plant-reviews.md` L12 — after posting, the review appears in the list right away. Suggested fix: invalidate `['reviews', plant.id]`.
- **Review average rounds down (4.6) instead of halves-up (4.7):** `GET /api/plants/pl-snake/reviews` for seed ratings 5+4+5 returns `average: 4.6` (`Math.floor(...*10)/10` in `api/src/features/plant-reviews.ts`). **Evidence (executed):** `tests/api/reviews.spec.ts` — **PR-05** (Expected 4.7, Received 4.6); `tests/e2e/plant-reviews.spec.ts` — **PR-11** (UI shows `4.6 out of 5 · 3 reviews`). Contradicts `docs/features/plant-reviews.md` L8 and OpenAPI ReviewList average description (halves round up → **4.7**).
- **DELETE /api/reviews/{id} is not author-only:** any signed-in customer can delete another customer's review (204). **Evidence (executed):** `tests/api/reviews.spec.ts` — **PR-01** (Ben deleting Ava's review → 204; review gone from list; expected 404 “not found”). Contradicts `docs/features/plant-reviews.md` L14 and OpenAPI delete description (only the author; anyone else gets 404).
- **StarRatingInput does not announce the selected star:** `role="radio"` stars omit `aria-checked`, so with `value={3}` nothing is exposed as checked. **Evidence (executed):** `web/cypress/component/StarRatingInput.cy.tsx` — **PR-07-05: radiogroup Your rating; five radios; 3 stars checked** (fails: expected `aria-checked="true"` on **3 stars**). `tests/a11y/pages.spec.ts` — **Plant Reviews signed-in** reports blocking `aria-required-attr` on each star radio. May contradict `docs/features/plant-reviews.md` L11 (selected star announced).
- **StarRatingInput is click-only (no radio keyboard):** star radios have no `tabIndex`, so the group cannot be Tabbed into and arrow keys cannot change the rating. **Evidence (executed):** `web/cypress/component/StarRatingInput.cy.tsx` — **PR-07-06: Tab into group; arrows raise rating via onChange** (fails: zero focusable star radios). May contradict `docs/features/plant-reviews.md` L11 (Tab into group, arrows change rating).
- **Signing out leaves a viewed order in the data cache:** `signOut` clears the `['cart']` and `['orders']` queries but not `['order', id]` (`AuthContext.tsx`, `queries.ts`), so the next customer on the same device may briefly see the previous customer's order. May contradict L49: "An order is private: only the customer who placed it can see it." and L55: "Signing out forgets the session on this device."
- **The plant page shows the previous plant after a "Likes the same light" link:** from String of Pearls, clicking Fiddle Leaf Fig changed the address to `/plants/pl-fiddle` but the heading still read "String of Pearls" (and quantity stayed at 2); `usePlant` caches under `['plant']` without the id. May contradict L35: "The plant page always shows the plant in the address bar, including after following a 'Likes the same light' link."
- **The search field hides its keyboard focus:** `SearchBox.module.css` sets `outline: none` on the input and nothing replaces it. May contradict L64: "everything works with the keyboard alone, and focus is always visible."

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
