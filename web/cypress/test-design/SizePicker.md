# SizePicker — component test design

Component: `web/src/components/SizePicker.tsx`  
Props: `sizes` (`{ label: SizeLabel; priceDelta: number }[]`), `value` (`'S' | 'M' | 'L'`), `onChange` (`(size: SizeLabel) => void`), `name?` (radio group name, default `'size'`).

Controlled radio group inside a fieldset. Each option shows the long size name (Small / Medium / Large), plus either **Base price** when `priceDelta` is not greater than zero, or **+$delta** via `formatPrice` when `priceDelta > 0`. Used only on Plant (`PlantPage` passes API `sizes`, current option label, and `setSize`; it does not pass `name`). Do not assert CSS module classes or checked styling (see `.cursor/rules/cypress-tests.mdc`).

**Fixture-shaped `sizes` for mount props** (typical catalog shape: S base, M/L add-ons):

```ts
const threeSizes = [
  { label: 'S' as const, priceDelta: 0 },
  { label: 'M' as const, priceDelta: 6 },
  { label: 'L' as const, priceDelta: 14 },
];
```

| ID | kind | given (props) | the user does | expected | source | technique |
| --- | --- | --- | --- | --- | --- | --- |
| SP-01 | render | `sizes={threeSizes}`, `value="S"` | mounts | Legend **Size**; radios for **Small**, **Medium**, and **Large** | APP-MAP L36 — fieldset "Size", radio card per size; PRODUCT.md L33 — Small / Medium / Large | equivalence class — full S/M/L labels |
| SP-02 | state | `sizes={threeSizes}`, `value="S"` | mounts | Small is checked; Medium and Large are not | PRODUCT.md L33 — Small is the base price | equivalence class — `value` `S` |
| SP-03 | state | `sizes={threeSizes}`, `value="M"` | mounts | Medium is checked; Small and Large are not | PRODUCT.md L33 — Medium adds the amount shown | equivalence class — `value` `M` |
| SP-04 | state | `sizes={threeSizes}`, `value="L"` | mounts | Large is checked; Small and Medium are not | PRODUCT.md L33 — Large adds the amount shown | equivalence class — `value` `L` |
| SP-05 | render | `sizes={threeSizes}`, `value="S"` | mounts | Small’s option includes **Base price** | APP-MAP L36 — "Base price" or "+$delta"; PRODUCT.md L33 — Small is the base price | equivalence class — `priceDelta` 0 on S |
| SP-06 | render | `sizes={[{ label: 'M', priceDelta: 0 }]}`, `value="M"` | mounts | Medium’s option includes **Base price** (not a plus line) | APP-MAP L36 — "Base price" when not `+$delta` | equivalence class — `priceDelta` 0 on M |
| SP-07 | render | `sizes={threeSizes}`, `value="M"` | mounts | Medium’s option includes **+$6.00** | PRODUCT.md L31 — two decimals everywhere; APP-MAP L76 — `priceDelta` is money, two decimals | equivalence class — whole-dollar add-on |
| SP-08 | render | `sizes={threeSizes}`, `value="L"` | mounts | Large’s option includes **+$14.00** | same as SP-07 | equivalence class — larger add-on |
| SP-09 | boundary | `sizes={[{ label: 'M', priceDelta: 0.01 }]}`, `value="M"` | mounts | Medium shows **+$0.01** | PRODUCT.md L31 — two decimals everywhere | boundary — smallest positive `priceDelta` (`> 0`) |
| SP-10 | boundary | `sizes={threeSizes}`, `value="S"` | mounts | Exactly three size radios | APP-MAP L36 — one radio card per size; `SizeLabel` is S, M, L only (three values) | boundary — count at limit (3) |
| SP-11 | boundary | `sizes={[{ label: 'S', priceDelta: 0 }, { label: 'M', priceDelta: 4 }]}`, `value="S"` | mounts | Exactly two radios (Small, Medium); no Large | APP-MAP L36 — one card per entry in `sizes` | boundary — count 2 |
| SP-12 | boundary | `sizes={[{ label: 'S', priceDelta: 0 }]}`, `value="S"` | mounts | Exactly one radio (Small) | APP-MAP L36 — one card per entry in `sizes` | boundary — count 1 |
| SP-13 | boundary | `sizes={threeSizes}`, `value="S"` | mounts | Small is the first radio; Large is the last | PRODUCT.md L33 — Small, then Medium, then Large | boundary — first and last of three |
| SP-14 | interaction | `sizes={threeSizes}`, `value="S"`, `onChange` spy | chooses Medium | `onChange` called once with `'M'`; Small stays checked until the parent updates `value` | APP-MAP L16 — Plant keeps selected size in state; L36 — controlled `value` / `onChange` | callback + controlled component |
| SP-15 | interaction | `sizes={threeSizes}`, `value="M"`, `onChange` spy | chooses Small | `onChange` called once with `'S'` | PRODUCT.md L33 — Small is the base price | callback — return to `S` |
| SP-16 | accessibility | `sizes={threeSizes}`, `value="S"` | mounts | The size control is a group named **Size** (fieldset legend) | PRODUCT.md L61 — every form field has a name a screen reader can announce; APP-MAP L36 | accessibility — fieldset name |
| SP-17 | accessibility | `sizes={threeSizes}`, `value="S"` | mounts | Each size radio has an accessible name that includes its long label and its price line (e.g. Small with Base price; Medium with +$6.00) | PRODUCT.md L61 — form fields named for screen readers | accessibility — radio names |
| SP-18 | accessibility | `sizes={threeSizes}`, `value="S"` | mounts | There are no buttons in the component | PRODUCT.md L61 — every button has a name (none here); APP-MAP L36 — radio cards only | accessibility — button names (N/A) |
| SP-19 | accessibility | `sizes={threeSizes}`, `value="S"`, `onChange` spy | focuses Medium and activates it with the keyboard | `onChange` called with `'M'` | PRODUCT.md L64 — keyboard alone | accessibility — keyboard |
| SP-20 | render | `sizes={threeSizes}`, `value="S"` (omit `name`) | mounts | All radios share the group name **size** (default) | APP-MAP L36 — `name?` on props; L16 — `PlantPage` uses `SizePicker` without `name` | default prop — `name` |
| SP-21 | render | `sizes={threeSizes}`, `value="S"`, `name="plant-size"` | mounts | All radios share the group name **plant-size** | APP-MAP L36 — `name?` on `SizePickerProps` | equivalence class — custom `name` |

## Test-lead checklist

| Check | Coverage |
| --- | --- |
| Every `value` that changes the checked radio | SP-02–SP-04 (`S`, `M`, `L`) |
| Every `sizes` shape that changes visible options | SP-01 (three labels); SP-10–SP-12 (counts 3, 2, 1) |
| Every `priceDelta` class that changes the price line | SP-05–SP-06 (`≤ 0` → Base price); SP-07–SP-09 (`> 0` → +$…) |
| `name` default vs custom (DOM group name) | SP-20–SP-21 |
| `onChange` | SP-14–SP-15 (non-base and base size; same handler for every radio) |
| Boundaries | Option count SP-10–SP-12; first/last SP-13; `priceDelta` threshold SP-05 vs SP-09 |
| Every button has a name | SP-18 (no buttons) |
| Form control names | SP-16–SP-17 (group + each radio) |

## Notes

- **Plant page unit price** (`base + priceDelta`) is computed on `PlantPage`, not in `SizePicker`. Assert only **Base price** / **+$…** copy here.
- Delta display uses `formatPrice` (`web/src/money.ts`). If SP-07–SP-09 fail on padding, record a finding against money formatting (cypress rule §7), same as PriceTag.
- Query radios with `findByRole('radio', { name: /Medium.*\$6\.00/ })` (label text bundles name + delta).
- Dropped rows with no product/app source (empty `sizes`, invalid `value`, negative `priceDelta`, sub-cent rounding). Dropped SP-15-style duplicate interactions that only re-hit the same `onChange` path as SP-14.

## Approval

**Approved** — implemented in `web/cypress/component/SizePicker.cy.tsx`. Three tests fail until F-02 (`formatPrice` two-decimal padding): SP-07, SP-08, SP-17.
