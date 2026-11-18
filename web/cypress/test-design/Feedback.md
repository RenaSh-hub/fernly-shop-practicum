# Feedback — component test design

File: `web/src/components/Feedback.tsx`  
Three exports share this file. Mount the named export for each row. Do not assert CSS module classes, toast/banner colors, or the focus outline (see `.cursor/rules/cypress-tests.mdc`). Page copy and which export a page chooses (for example Browse using `EmptyState` on a catalog 500) belong in UI tests, not here.

**`EmptyState`** `{ title: string; message?: string; action?: ReactNode }` — sprout icon, `h2` title, optional message, optional action. Used on Browse, Plant (404), Cart, Checkout, Orders, one order (404), and Not found. For `action`, pass a `<button type="button">` (stand-in for the page `Link`).

**`ErrorBanner`** `{ message: string; onRetry?: () => void }` — `role="alert"` and the message; **Try again** only when `onRetry` is given. Used on Plant, Cart, Checkout, Orders, one order, Sign in, and Create an account.

**`Toast`** `{ message: string; tone?: 'success' | 'error'; onClose: () => void; duration?: number }` — `role="status"`, the message, and **Dismiss**. Default `tone` is `'success'`; default `duration` is `4000`; `0` keeps it open. Used on Plant (success and error) and Cart (error). Drive timers with `cy.clock()` / `cy.tick()` — never `cy.wait(<ms>)`.

| ID | kind | given (props) | the user does | expected | source | technique |
| --- | --- | --- | --- | --- | --- | --- |
| ES-01 | render | `EmptyState` `title="Page not found"` (omit `message` and `action`) | mounts | Heading **Page not found**; no extra body text; no buttons or links | APP-MAP L39 — `h2` title, optional message and action; L23 — Not found title | equivalence class — title only |
| ES-02 | render | `EmptyState` `title="No plants match your filters"` `message="Try another search or clear a filter."` | mounts | Heading **No plants match your filters** and body **Try another search or clear a filter.**; no buttons or links | APP-MAP L15, L39 — Browse empty: title + message, no action | equivalence class — title + message, no action |
| ES-03 | render | `EmptyState` `title="We couldn't find that plant"` `action={<button type="button">Back to the shop</button>}` | mounts | Heading **We couldn't find that plant**; **Back to the shop** present; no extra body text | APP-MAP L16, L39 — Plant 404: title + action, no message | equivalence class — title + action, no message |
| ES-04 | render | `EmptyState` `title="Your cart is empty"` `message="Plants you add will show up here."` `action={<button type="button">Browse plants</button>}` | mounts | Heading, body, and **Browse plants** are all present | APP-MAP L19, L39 — Cart empty: title + message + action | equivalence class — title + message + action |
| ES-05 | state | `EmptyState` `title="Your cart is empty"` `message="Add a plant before you check out."` (omit `action`) | mounts | Heading and body; no action control | APP-MAP L20 — Checkout empty has no link | equivalence class — title + message, no action (Checkout) |
| ES-06 | state | `EmptyState` `title="No orders yet"` `message=""` | mounts | Heading **No orders yet**; no message paragraph | APP-MAP L39 — `message?` optional (same as omitted when empty) | equivalence class — empty `message` string |
| ES-07 | boundary | `EmptyState` `title="A"` | mounts | Heading is **A** | APP-MAP L39 — `title: string` | boundary — title length 1 |
| ES-08 | boundary | `EmptyState` `title=""` | mounts | — | assumed — ask (PRODUCT.md and APP-MAP do not define an empty title) | boundary — title length 0 |
| ES-09 | accessibility | `EmptyState` `title="No orders yet"` `message="Your orders will show up here."` | mounts | A heading level 2 named **No orders yet** | APP-MAP L39 — an `h2` title; PRODUCT.md L59 — WCAG AA | accessibility — heading role and name |
| ES-10 | accessibility | `EmptyState` `title="Page not found"` | mounts | The sprout is hidden from assistive tech; the heading name is **Page not found** (not prefixed with the sprout) | APP-MAP L39 — sprout icon; same `aria-hidden` pattern as `CareLevelBadge` / `PetSafeTag` | accessibility — decorative icon |
| ES-11 | accessibility | `EmptyState` `title="No orders yet"` (no `action`) | mounts | Exactly zero buttons | PRODUCT.md L61 — every button has a name (none here unless `action` provides one) | accessibility — button names when none |
| ES-12 | accessibility | `EmptyState` `title="We couldn't find that plant"` `action={<button type="button">Back to the shop</button>}` | mounts | A button named **Back to the shop** | PRODUCT.md L61 — every button has a name; APP-MAP L16 — Plant 404 action | accessibility — button names when action present |
| ES-13 | accessibility | `EmptyState` `title="Your cart is empty"` `message="Plants you add will show up here."` `action={<button type="button">Browse plants</button>}` | mounts | A button named **Browse plants** | PRODUCT.md L61 — every button has a name; APP-MAP L19 — Cart empty action | accessibility — button names when action present |
| ES-14 | accessibility | `EmptyState` `title="Order not found"` `action={<button type="button">Back to your orders</button>}` | mounts | A button named **Back to your orders** | PRODUCT.md L61 — every button has a name; APP-MAP L22 — Order not found action | accessibility — button names when action present |
| ES-15 | accessibility | same as ES-14 | focuses the action and activates it with the keyboard | The action is invoked (click/handler runs) | PRODUCT.md L64 — everything works with the keyboard alone | accessibility — keyboard |
| EB-01 | render | `ErrorBanner` `message="Invalid email or password."` (omit `onRetry`) | mounts | **Invalid email or password.** is shown; **Try again** is not | APP-MAP L17, L40 — Sign in banner with the API `detail`, no retry | equivalence class — `onRetry` omitted |
| EB-02 | render | `ErrorBanner` `message="The plant couldn't be loaded."` `onRetry` spy | mounts | **The plant couldn't be loaded.** and **Try again** are shown | APP-MAP L16, L40 — optional **Try again**; PRODUCT.md L27 — offers **Try again** | equivalence class — `onRetry` given |
| EB-03 | interaction | `ErrorBanner` `message="Your orders couldn't be loaded."` `onRetry` spy | mounts (does not click) | `onRetry` is not called | APP-MAP L40 — retry is a button click | callback — not on mount |
| EB-04 | interaction | same as EB-03 | clicks **Try again** | `onRetry` is called once | APP-MAP L40 — `onRetry`; PRODUCT.md L27 — **Try again** | callback — retry |
| EB-05 | boundary | `ErrorBanner` `message="x"` `onRetry` spy | mounts | Message **x** and **Try again** are shown | APP-MAP L40 — `message: string` | boundary — message length 1 |
| EB-06 | boundary | `ErrorBanner` a very long `message` (raw checkout `detail` spanning many fields) | mounts | The full message is shown; no layout crash | APP-MAP L20 — order refused shows the API's raw `detail` | boundary — extreme length |
| EB-07 | boundary | `ErrorBanner` `message=""` | mounts | — | assumed — ask (PRODUCT.md and APP-MAP do not define an empty error message) | boundary — message length 0 |
| EB-08 | accessibility | `ErrorBanner` `message="The order couldn't be loaded."` `onRetry` spy | mounts | An alert named with **The order couldn't be loaded.** | APP-MAP L40 — `role="alert"`; PRODUCT.md L59 — WCAG AA | accessibility — alert role and name |
| EB-09 | accessibility | same as EB-08 | mounts | A button named **Try again** | PRODUCT.md L61 — every button has a name; APP-MAP L40 — **Try again** | accessibility — button names when retry present |
| EB-10 | accessibility | `ErrorBanner` `message="Invalid email or password."` (no `onRetry`) | mounts | Exactly zero buttons; the alert still exposes the message | PRODUCT.md L61 — every button has a name (none here); APP-MAP L17 — no retry | accessibility — button names when none |
| EB-11 | accessibility | `ErrorBanner` `message="The plant couldn't be loaded."` `onRetry` spy | focuses **Try again** and activates it with the keyboard | `onRetry` is called once | PRODUCT.md L64 — keyboard alone | accessibility — keyboard |
| TO-01 | render | `Toast` `message="Added 1 × Monstera to your cart."` `onClose` spy `duration={0}` (omit `tone`) | mounts | **Added 1 × Monstera to your cart.** and **Dismiss** are shown | APP-MAP L16, L41 — success add-to-cart toast; default `tone` `'success'` | equivalence class — default `tone` success |
| TO-02 | render | `Toast` `message="Only 3 left in stock."` `tone="error"` `onClose` spy `duration={0}` | mounts | **Only 3 left in stock.** and **Dismiss** are shown (do not assert color) | APP-MAP L19, L41 — Cart line errors use `tone="error"` | equivalence class — `tone` error |
| TO-03 | interaction | `Toast` `message="Added 2 × Aloe Vera to your cart."` `onClose` spy `duration={0}` | mounts (does not click) | `onClose` is not called | APP-MAP L41 — closes itself only after `duration`; `0` keeps it open | callback — not on mount |
| TO-04 | interaction | same as TO-03 | clicks **Dismiss** | `onClose` is called once | APP-MAP L41 — **Dismiss** × button | callback — dismiss |
| TO-05 | state | `Toast` `message="Added 1 × Monstera to your cart."` `onClose` spy (default `duration`) | clock, mounts, tick **3999** ms | `onClose` is not called; message still shown | APP-MAP L41 — closes after **4000** ms | boundary — one millisecond under the default |
| TO-06 | state | same as TO-05 | clock, mounts, tick **4000** ms | `onClose` is called once | APP-MAP L41 — 4000 ms default | boundary — at the documented default |
| TO-07 | state | `Toast` `message="Saved."` `onClose` spy `duration={0}` | clock, mounts, tick **10000** ms | `onClose` is not called; message still shown | APP-MAP L41 — `0` keeps it open | boundary — `duration` 0 |
| TO-08 | boundary | `Toast` `message="Saved."` `onClose` spy `duration={1}` | clock, mounts, tick **1** ms | `onClose` is called once | APP-MAP L41 — non-zero duration closes itself; JSDoc: milliseconds before close | boundary — one past 0 (`duration` 1) |
| TO-09 | boundary | `Toast` `message="x"` `onClose` spy `duration={0}` | mounts | Message **x** and **Dismiss** are shown | APP-MAP L41 — `message: string` | boundary — message length 1 |
| TO-10 | boundary | `Toast` a very long `message` (API `detail` from a cart line error) `onClose` spy `duration={0}` | mounts | The full message is shown; **Dismiss** still present; no layout crash | APP-MAP L19 — line errors show as a toast with `error.message`; L69 — `{ "detail": "..." }` errors | boundary — extreme length |
| TO-11 | boundary | `Toast` `message=""` `onClose` spy `duration={0}` | mounts | — | assumed — ask (PRODUCT.md and APP-MAP do not define an empty toast message) | boundary — message length 0 |
| TO-12 | boundary | `Toast` `message="Saved."` `onClose` spy `duration={-1}` | mounts | — | assumed — ask (only **4000** and **0** are documented) | boundary — negative `duration` |
| TO-13 | accessibility | `Toast` `message="Added 1 × Monstera to your cart."` `onClose` spy `duration={0}` | mounts | A status named with **Added 1 × Monstera to your cart.** | APP-MAP L41 — `role="status"` | accessibility — status role and name |
| TO-14 | accessibility | `Toast` `message="Only 3 left in stock."` `tone="error"` `onClose` spy `duration={0}` | mounts | Still a **status** (not an alert) named with the message | APP-MAP L41 — Toast is `role="status"` (tone is visual only) | accessibility — error `tone` keeps status |
| TO-15 | accessibility | `Toast` `message="Added 1 × Monstera to your cart."` `onClose` spy `duration={0}` | mounts | Exactly one button, named **Dismiss** | PRODUCT.md L61 — every button has a name; APP-MAP L41 — "Dismiss" | accessibility — button names |
| TO-16 | accessibility | same as TO-15 | focuses **Dismiss** and activates it with the keyboard | `onClose` is called once | PRODUCT.md L64 — keyboard alone | accessibility — keyboard |

## Test-lead checklist

| Check | Coverage |
| --- | --- |
| Every prop value / combination that changes what you see | **EmptyState** `message`: omitted ES-01 / ES-03; present ES-02 / ES-04 / ES-05; empty string ES-06 (no paragraph). **EmptyState** `action`: omitted ES-01 / ES-02 / ES-05 / ES-06; present ES-03 / ES-04. Four UI shapes: title only ES-01; title + message ES-02 / ES-05; title + action ES-03; all three ES-04 |
| **ErrorBanner** `onRetry` | Omitted → no **Try again** EB-01; given → **Try again** EB-02 |
| **Toast** `tone` | `'success'` default TO-01; `'error'` TO-02 (copy and **Dismiss** only — not color) |
| **Toast** `duration` (behavior; visible chrome unchanged) | Default auto-close TO-05–TO-06; `0` TO-07; `1` TO-08 |
| Callbacks | `onRetry` not on mount EB-03, on click EB-04 / keyboard EB-11; `onClose` not on mount TO-03, on **Dismiss** TO-04 / keyboard TO-16, on timer TO-06 / TO-08, not when `duration={0}` TO-07 |
| Boundaries at documented limits | **Toast** `duration`: 0 TO-07, 1 TO-08 (one past 0), 3999 TO-05, 4000 TO-06; negative TO-12 assumed — ask. **Strings**: title length 1 ES-07, title 0 ES-08 assumed — ask; message length 1 EB-05 / TO-09; message 0 EB-07 / TO-11 assumed — ask; extreme message EB-06 / TO-10. No documented max string length — no other length limit rows (same as SearchBox) |
| Empty / error states | `EmptyState` is the empty UI; `ErrorBanner` is the error banner; Toast has no loading or disabled state |
| Every button has a name | **EmptyState** none ES-11; each APP-MAP action label ES-12 / ES-13 / ES-14. **ErrorBanner** none EB-10; **Try again** EB-09. **Toast** **Dismiss** TO-15 |
| Keyboard | EmptyState action ES-15; **Try again** EB-11; **Dismiss** TO-16 |

## Notes

- **F-03** (Browse catalog failure looks like an empty filter result) is a page concern: this table does not ask `EmptyState` to show **Try again**. `ErrorBanner` rows own the retry control PRODUCT.md L27 names.
- Removed the extra **ErrorBanner** row that only re-checked `onRetry` omitted (same class as EB-01). Removed **Toast** unmount-before-auto-close (no APP-MAP or PRODUCT.md source). Removed **EmptyState** extreme-length title/message (no documented max, same as SearchBox).
- Renumbered **ErrorBanner** and **Toast** IDs after those removals.
- `tone` only changes CSS classes. TO-02 / TO-14 assert message, **Dismiss**, and `role="status"` — not success vs error color.
- Auto-close rows need `cy.clock()` **before** `cy.mount`, then `cy.tick`. Do not `cy.wait(4000)`.
- Use `duration={0}` on Toast rows that are not testing the timer so **Dismiss** / a11y assertions do not race the default 4000 ms close.
- Sign-in, checkout validation, and cart PATCH errors pass the API `detail` through as `message`. Assert the string given in props, not a rewritten phrase.

## Approval

**Approved** — implemented in `web/cypress/component/Feedback.cy.tsx` (ES-08, EB-07, TO-11, TO-12 skipped: assumed — ask). Four tests fail until `ErrorBanner` / `Toast` expose message text as the alert/status accessible name: EB-08, EB-10, TO-13, TO-14 (see FINDINGS.md suspicions).
