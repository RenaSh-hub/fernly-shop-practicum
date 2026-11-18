# CartLine — component test design

Component: `web/src/components/CartLine.tsx`  
Props: `line` (`CartLine`), `onQuantityChange` (`(lineId, quantity) => void`), `onRemove` (`(lineId) => void`), `busy?` (boolean, default `false`).

One cart row: decorative image, name, size and unit price, `QuantityStepper` (`max` = `line.stock`, `disabled` = `busy`, label `Quantity of {name}`), line total, Remove (`aria-label` `Remove {name}`). Used only on Cart. `CartPage` sets `busy` while a PATCH or DELETE is in flight and disables every line’s controls.

Do not assert CSS module classes, grid layout, or the narrow-viewport overflow FINDINGS question (that belongs on a Cart UI test). Do not re-run the full `PriceTag` two-decimal matrix or the full `QuantityStepper` min/max matrix — spot-check composition (this component’s labels, `max={line.stock}`, and callbacks). Mount the `<li>` inside a `<ul>` so the row is a listitem.

**Default `line` for mount props** (typical in-stock cart row). Rows say only what they change. Always pass `onQuantityChange` and `onRemove` spies.

```ts
const line = {
  id: 'ln-1a2b3c4d',
  plantId: 'pl-monstera',
  name: 'Monstera Deliciosa',
  size: 'M' as const,
  unitPrice: 30.5,
  quantity: 2,
  lineTotal: 61,
  stock: 12,
  imageUrl: '/plants/monstera.svg',
};
```

| ID | kind | given (props) | the user does | expected | source | technique |
| --- | --- | --- | --- | --- | --- | --- |
| CL-01 | render | default `line` | mounts | Visible **Monstera Deliciosa** and **Size M** | APP-MAP L37 — name; "Size S · $x each" | equivalence class — typical line (name + default size M) |
| CL-02 | render | default `line` except `size="S"` | mounts | Visible text includes **Size S** | APP-MAP L37 — size letter | equivalence class — `size` S |
| CL-03 | render | default `line` except `size="L"` | mounts | Visible text includes **Size L** | APP-MAP L37 — size letter | equivalence class — `size` L |
| CL-04 | render | default `line` except `imageUrl="/plants/snake.svg"` | mounts | The image has `src` **/plants/snake.svg** | APP-MAP L37 — image | equivalence class — `imageUrl` |
| CL-05 | render | default `line` (`unitPrice={30.5}`) | mounts | Visible text includes **$30.50** and **each** | PRODUCT.md L31 — two decimals; APP-MAP L37 — "$x each" | boundary — fractional dollars (pad `.00`) |
| CL-06 | render | default `line` except `unitPrice={0.99}` | mounts | Visible text includes **$0.99** | PRODUCT.md L31 — two decimals everywhere | boundary — sub-dollar unit price |
| CL-07 | render | default `line` (`lineTotal={61}`) | mounts | Visible text includes **$61.00** | PRODUCT.md L31 — two decimals everywhere | boundary — whole-dollar line total (pad `.00`) |
| CL-08 | render | default `line` except `unitPrice={24.5}`, `lineTotal={99}` | mounts | Visible **$24.50** (each) and **$99.00** (line total) | APP-MAP L37 — prints the `lineTotal` it is given (does not compute quantity × unit price) | equivalence class — `lineTotal` independent of other fields |
| CL-09 | boundary | default `line` except `unitPrice={0}`, `lineTotal={0}` | mounts | Visible text includes **$0.00** | PRODUCT.md L31 — two decimals everywhere | boundary — zero money |
| CL-10 | render | default `line` (`quantity={2}`) | mounts | Quantity output shows **2** | APP-MAP L37 — stepper `value` = `line.quantity` | equivalence class — typical quantity |
| CL-11 | boundary | default `line` except `quantity={1}` | mounts | Output **1**; Decrease quantity is disabled; Increase quantity is enabled | PRODUCT.md L34 — quantity starts at 1; APP-MAP L35 — stepper `min` defaults to 1 | boundary — minimum quantity (composition) |
| CL-12 | boundary | default `line` except `quantity={3}`, `stock={3}` | mounts | Increase quantity is disabled | PRODUCT.md L34 — at the stock limit, **+** is disabled; L41 — a line can never hold more than the plant’s stock | boundary — at stock (`max={line.stock}`) |
| CL-13 | boundary | default `line` except `quantity={2}`, `stock={3}` | mounts | Increase quantity is enabled | PRODUCT.md L34 — + disabled only at the stock limit | boundary — one below stock |
| CL-14 | boundary | default `line` except `quantity={1}`, `stock={1}` | mounts | Decrease quantity and Increase quantity are disabled; Remove Monstera Deliciosa is enabled | PRODUCT.md L34 — min 1 and stock limit together | boundary — quantity and stock both at 1 |
| CL-15 | boundary | default `line` except `quantity={20}`, `stock={20}` | mounts | Output **20**; Increase quantity is disabled | APP-MAP L73 — cart quantity 1–20; PRODUCT.md L34 — + disabled at stock limit; L41 — line cannot exceed stock | boundary — contract max quantity and stock both 20 |
| CL-16 | boundary | default `line` except `quantity={1}`, `stock={0}` | mounts | Increase quantity is disabled; Decrease quantity is disabled | PRODUCT.md L41 — a line can never hold more than the plant’s stock; L34 — quantity at least 1 | boundary — `stock` 0 with quantity 1 |
| CL-17 | state | default `line` (omit `busy`) | mounts | Decrease quantity, Increase quantity, and Remove Monstera Deliciosa are enabled | APP-MAP L37 — `busy` defaults to false | default prop — `busy` false |
| CL-18 | state | default `line`, `busy={true}` | mounts | Decrease quantity, Increase quantity, and Remove Monstera Deliciosa are disabled | APP-MAP L19 — while a change is saving, all line controls are disabled | state — `busy` true |
| CL-19 | interaction | default `line` | clicks Increase quantity | `onQuantityChange` called once with `'ln-1a2b3c4d', 3`; `onRemove` not called | APP-MAP L37 — `onChange` → `onQuantityChange(line.id, quantity)` | callback — increase |
| CL-20 | interaction | default `line` | clicks Decrease quantity | `onQuantityChange` called once with `'ln-1a2b3c4d', 1`; `onRemove` not called | APP-MAP L37 — decrease passes `line.id` and `value - 1` | callback — decrease |
| CL-21 | interaction | default `line` except `id="ln-other"` | clicks Increase quantity | `onQuantityChange` called once with `'ln-other', 3` | APP-MAP L37 — first callback argument is `line.id` | equivalence class — `line.id` on quantity change |
| CL-22 | interaction | default `line` | clicks Remove Monstera Deliciosa | `onRemove` called once with `'ln-1a2b3c4d'`; `onQuantityChange` not called | APP-MAP L37 — Remove calls `onRemove(line.id)` | callback — remove |
| CL-23 | interaction | default `line` except `id="ln-other"` | clicks Remove Monstera Deliciosa | `onRemove` called once with `'ln-other'` | APP-MAP L37 — Remove uses `line.id` | equivalence class — `line.id` on remove |
| CL-24 | interaction | default `line`, `busy={true}` | clicks Increase quantity and Remove Monstera Deliciosa (both disabled) | `onQuantityChange` and `onRemove` are not called | APP-MAP L19 — busy disables line controls | callback gated by `busy` |
| CL-25 | accessibility | default `line` | mounts inside `<ul>` | The row has role **listitem** | APP-MAP L19 — Cart renders one `CartLine` per line in a list | accessibility — list semantics |
| CL-26 | accessibility | default `line` | mounts | A button named **Decrease quantity** | APP-MAP L35 — "Decrease quantity" −; PRODUCT.md L61 — every button has a name | accessibility — − button name |
| CL-27 | accessibility | default `line` | mounts | A button named **Increase quantity** | APP-MAP L35 — "Increase quantity" +; PRODUCT.md L61 — every button has a name | accessibility — + button name |
| CL-28 | accessibility | default `line` | mounts | A button named **Remove Monstera Deliciosa** | APP-MAP L37 — "Remove {name}"; PRODUCT.md L61 — every button has a name | accessibility — Remove button name |
| CL-29 | accessibility | default `line`, `busy={true}` | mounts | Buttons **Decrease quantity**, **Increase quantity**, and **Remove Monstera Deliciosa** are still present with those names (disabled) | PRODUCT.md L61 — every button has a name (disabled controls keep their name) | accessibility — button names when `busy` |
| CL-30 | accessibility | default `line` | mounts | Exactly three buttons | PRODUCT.md L61 — every button has a name; APP-MAP L37 — stepper (−, +) and Remove | accessibility — button count |
| CL-31 | accessibility | default `line` | mounts | A group named **Quantity of Monstera Deliciosa** | APP-MAP L37 — stepper label "Quantity of {name}"; PRODUCT.md L61 — form field name | accessibility — stepper group name |
| CL-32 | accessibility | default `line` | mounts | Accessible text includes **Price each:** and **Line total:** | APP-MAP L37 — `PriceTag` labels "Price each" and "Line total" | accessibility — price context (composition) |
| CL-33 | accessibility | default `line` | mounts | No `img` role (decorative `alt=""`); the plant is identified by the visible name | APP-MAP L37 — image decorative, `alt=""` | accessibility — decorative image |
| CL-34 | render | default `line` except `name="Snake Plant"` | mounts | Visible **Snake Plant**; button **Remove Snake Plant**; group **Quantity of Snake Plant** | APP-MAP L37 — `line.name` in copy and accessible names | equivalence class — `line.name` |
| CL-35 | accessibility | default `line` | focuses Remove Monstera Deliciosa and activates it with the keyboard | `onRemove` called with `'ln-1a2b3c4d'` | PRODUCT.md L64 — keyboard alone | accessibility — keyboard Remove |
| CL-36 | accessibility | default `line` | focuses Increase quantity and activates it with the keyboard | `onQuantityChange` called with `'ln-1a2b3c4d', 3` | PRODUCT.md L64 — keyboard alone | accessibility — keyboard Increase |
| CL-37 | accessibility | default `line` | focuses Decrease quantity and activates it with the keyboard | `onQuantityChange` called with `'ln-1a2b3c4d', 1` | PRODUCT.md L64 — keyboard alone | accessibility — keyboard Decrease |
| CL-38 | boundary | default `line` except a very long `name` (100+ characters) | mounts | Visible name, Remove name, and Quantity group name all include the full string | APP-MAP L37 — name on the line and in labels | boundary — extreme `name` |
| CL-39 | boundary | default `line` except `unitPrice={999999.99}`, `lineTotal={999999.99}` | mounts | Both amounts formatted with `$` and two decimals; no layout crash | PRODUCT.md L31 — two decimals everywhere | boundary — extreme money |
| CL-40 | boundary | default `line` except `quantity={20}`, `stock={40}` | mounts | — | assumed — ask (APP-MAP L73 — quantity 1–20; CartLine sets `max={line.stock}`; FINDINGS.md — which limit wins?) | boundary — API max 20 vs stock above 20 |

## Test-lead checklist

| Check | Coverage |
| --- | --- |
| Every prop / field that changes the row | **`line.name`** CL-01, CL-28, CL-31, CL-34, CL-38. **`line.size`** CL-01 (M), CL-02 (S), CL-03 (L). **`line.imageUrl`** CL-04 (`src`). **`line.unitPrice`** CL-05, CL-06, CL-08, CL-09, CL-39. **`line.lineTotal`** CL-07, CL-09, CL-39. **`line.quantity`** CL-10, CL-11–CL-16, CL-19–CL-20, CL-36–CL-37. **`line.stock`** CL-12–CL-16, CL-40. **`line.id`** CL-19–CL-23 (callbacks only; not visible). **`busy`** CL-17–CL-18, CL-24, CL-29 (both booleans). **`onQuantityChange` / `onRemove`** CL-19–CL-24, CL-35–CL-37. **`line.plantId`** — not rendered (no row). |
| Boundaries at documented limits | **Money** fractional pad CL-05, sub-dollar CL-06, whole dollars CL-07, zero CL-09, extreme CL-39. **Quantity min 1** CL-11. **Stock limit** at max CL-12, one below CL-13, qty and stock both 1 CL-14, stock 0 CL-16. **API quantity max 20** at stock 20 CL-15; vs higher stock CL-40 (ask). **Name** length CL-38. |
| Every button has a name | **Decrease** CL-26; **Increase** CL-27; **Remove** CL-28; **when disabled (`busy`)** CL-29; **count** CL-30. |
| Stepper / price context | Group CL-31; hidden price labels CL-32. |
| Image | CL-33 (decorative, not a named image). |
| Keyboard | Remove CL-35; Increase CL-36; Decrease CL-37. |
| List semantics | CL-25. |

## Notes

- **CL-05, CL-06, CL-07, CL-09, CL-39** (and CL-32 if asserting formatted amounts) may fail until F-02 (`formatPrice`) is fixed. Keep PRODUCT.md expected copy.
- **CL-12, CL-14, CL-15, CL-16** expect + disabled when `quantity >= stock` (and CL-16 when `stock` is 0). Today `QuantityStepper` disables + only when `value > max` (F-01). Do not weaken expected results.
- **`lineTotal` is not computed here** (CL-08). Parent/API send the total.
- **Cart page concerns** (merge lines, shipping, empty cart, PATCH/DELETE toasts) stay out of scope.
- **Narrow cart overflow** (FINDINGS) is a Cart UI concern, not a component row.
- **CL-33:** APP-MAP documents decorative `alt=""`; visible name satisfies identification (PRODUCT.md L62 applies to meaningful images).
- Use cypress-tests.mdc `.then(($el) => expect...)` for disabled assertions when F-01 makes `.should('be.disabled')` misleading.

## Approval

**Approved** — implemented in `web/cypress/component/CartLine.cy.tsx` (CL-40 skipped: assumed — ask). Seven tests fail until F-02 (`formatPrice` two-decimal padding): CL-05, CL-07, CL-08, CL-09; and until F-01 (+ at stock limit): CL-12, CL-14, CL-15.
