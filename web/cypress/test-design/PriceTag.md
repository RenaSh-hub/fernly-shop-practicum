# PriceTag — component test design

Component: `web/src/components/PriceTag.tsx`  
Props: `amount` (number), `size?` (`'sm' | 'md' | 'lg'`, default `'md'`), `label?` (screen-reader-only prefix).

No callbacks or user interactions — tests mount props and assert visible (and, where relevant, hidden) output. Do not assert CSS module classes or font sizes (see `.cursor/rules/cypress-tests.mdc`).

| ID | kind | given (props) | the user does | expected | source | technique |
| --- | --- | --- | --- | --- | --- | --- |
| PT-01 | boundary | `amount={12.5}` | mounts | Visible text is `$12.50` | PRODUCT.md — every price in dollars with **two decimals** (`$12.50`, never `$12.5`) | boundary — one decimal place in input (pad trailing zero) |
| PT-02 | boundary | `amount={22}` | mounts | Visible text is `$22.00` | PRODUCT.md — two decimals everywhere | boundary — whole dollars (pad `.00`) |
| PT-03 | boundary | `amount={0.99}` | mounts | Visible text is `$0.99` | PRODUCT.md — two decimals everywhere | boundary — sub-dollar, already two fractional digits |
| PT-04 | boundary | `amount={0}` | mounts | Visible text is `$0.00` | PRODUCT.md — two decimals everywhere | boundary — zero |
| PT-05 | render | `amount={6.95}` | mounts | Visible text is `$6.95` | PRODUCT.md — shipping costs $6.95 | equivalence class — typical two-cent display |
| PT-06 | boundary | `amount={50}` | mounts | Visible text is `$50.00` | PRODUCT.md — free shipping when subtotal is $50.00 or more | boundary — threshold named in product copy |
| PT-07 | boundary | `amount={12.005}` | mounts | Visible text is `$12.01` (half-up to cents) | assumed — ask (PRODUCT.md does not define rounding; `formatPrice` uses `Math.round(amount * 100)`) | boundary — sub-cent input |
| PT-08 | boundary | `amount={12.999}` | mounts | Visible text is `$13.00` | same as PT-07 | boundary — just below next cent |
| PT-09 | render | `amount={12.5}` (no `label`) | mounts | Price text is visible; no screen-reader prefix for a generic tag | APP-MAP — `label` optional; `PlantCard` uses bare `PriceTag` | equivalence class — label omitted |
| PT-10 | accessibility | `amount={12.5}`, `label="Price"` | mounts | Hidden text includes `Price:` before the formatted amount; visible text is `$12.50` | APP-MAP — `label` read by screen readers only; `PlantPage` uses `label="Price"` | accessibility — context for assistive tech |
| PT-11 | accessibility | `amount={6.95}`, `label="Price each"` | mounts | Hidden prefix `Price each:` present | `CartLine.tsx` usage | equivalence class — cart line label |
| PT-12 | accessibility | `amount={42}`, `label="Line total"` | mounts | Hidden prefix `Line total:` present | `CartLine.tsx`, `OrdersPage.tsx` | equivalence class — line total label |
| PT-13 | render | `amount={12.5}`, `size="sm"` | mounts | Visible text is `$12.50` (same as PT-01) | APP-MAP — `size` on cart unit prices | equivalence class — `size` prop (sm); no CSS assertion |
| PT-14 | render | `amount={12.5}` (default size) | mounts | Visible text is `$12.50` | APP-MAP — default `'md'`; `PlantCard`, subtotal | default prop |
| PT-15 | render | `amount={99}`, `size="lg"` | mounts | Visible text is `$99.00` | APP-MAP — `size="lg"` on plant page and order total | equivalence class — `size` prop (lg); no CSS assertion |
| PT-16 | boundary | `amount={-1}` | mounts | — | assumed — ask (negative prices not described in PRODUCT.md) | boundary — invalid/unused domain |
| PT-17 | boundary | very large `amount` (e.g. `999999.99`) | mounts | Formatted with `$` and two decimals, no layout crash | the component’s purpose (order totals) | boundary — extreme value |

## Notes

- **Two-decimal boundaries (PT-01–PT-04)** are the core PRODUCT.md formatting contract; PT-15 also uses that source via whole-dollar `$99.00`.
- Display formatting is delegated to `formatPrice` (`web/src/money.ts`). If PT-01–PT-04 fail, record a finding against money formatting rather than weakening the test (see cypress rule §7).

## Approval

**Approved** — implemented in `web/cypress/component/PriceTag.cy.tsx` (PT-16 skipped: no expected result). Eleven tests fail until F-02 (`formatPrice` two-decimal padding) is fixed.
