# QuantityStepper — component test design

Component: `web/src/components/QuantityStepper.tsx`  
Props: `value` (number), `onChange`, `min?` (default `1`), `max` (stock left), `disabled?` (default `false`), `label?` (default `"Quantity"`).

Used on Plant (`PlantPage`) and inside `CartLine` (label `"Quantity of {name}"`, `max = line.stock`). API contract caps cart line quantity at 20 (`docs/APP-MAP.md`).

| ID | kind | given (props) | the user does | expected | source | technique |
| --- | --- | --- | --- | --- | --- | --- |
| QS-01 | render | `value={3}`, `max={10}` | mounts | Live quantity readout shows **3** | APP-MAP L35 — value in live output | equivalence class — mid range |
| QS-02 | render | `value={1}`, `max={5}` (defaults) | mounts | Group is named **Quantity** | APP-MAP L35 — default `label` | default prop |
| QS-03 | render | `value={2}`, `max={8}`, `label="Quantity of Monstera Deliciosa"` | mounts | Group is named **Quantity of Monstera Deliciosa** | APP-MAP L37 — `CartLine` label | equivalence class — custom label |
| QS-04 | state | `value={1}`, `max={5}` | mounts | **Decrease quantity** is disabled; **Increase quantity** is enabled | PRODUCT.md L34 — quantity starts at 1 | boundary — minimum |
| QS-05 | state | `value={3}`, `max={3}` | mounts | **Increase quantity** is disabled | PRODUCT.md L34 — at the stock limit, **+** is disabled | boundary — at max stock |
| QS-06 | state | `disabled={true}`, `value={2}`, `max={5}` | mounts | Both **Decrease quantity** and **Increase quantity** are disabled | APP-MAP — out-of-stock / busy disables stepper on plant and cart | state — `disabled` |
| QS-07 | state | `value={2}`, `min={2}`, `max={5}` | mounts | **Decrease quantity** is disabled | boundary — custom `min` at floor | boundary — non-default min |
| QS-08 | state | `value={1}`, `max={1}` | mounts | **Increase quantity** is disabled (single unit in stock) | PRODUCT.md L34 — never above stock left | boundary — max equals min quantity |
| QS-09 | interaction | `value={2}`, `max={5}` | clicks **Increase quantity** | `onChange` called once with **3** | the component's purpose | callback — increment |
| QS-10 | interaction | `value={2}`, `max={5}` | clicks **Decrease quantity** | `onChange` called once with **1** | the component's purpose | callback — decrement |
| QS-11 | interaction | `value={3}`, `max={3}` | clicks **Increase quantity** | **Increase quantity** is disabled; `onChange` is not called | PRODUCT.md L34 — cannot go above stock | boundary — no increment at max |
| QS-12 | boundary | `value={20}`, `max={20}` | mounts | Readout **20**; **Increase quantity** disabled | APP-MAP L73 — quantity 1–20 | boundary — API max |
| QS-13 | boundary | `value={1}`, `max={0}` | mounts | Both buttons disabled (nothing left to add or remove below 1) | PRODUCT.md L34 — out-of-stock plants; APP-MAP plant **Out of stock** | boundary — zero stock |
| QS-14 | accessibility | `value={2}`, `max={5}` | mounts | Controls named **Decrease quantity** and **Increase quantity** | APP-MAP L35 | accessibility — control names |
| QS-15 | accessibility | `value={2}`, `max={5}` | mounts | Polite live region contains **2** | APP-MAP L35 — `aria-live="polite"` on output | accessibility — live region |
| QS-16 | accessibility | `value={2}`, `max={5}` | activates **Increase quantity** from the keyboard | `onChange` called with **3** | PRODUCT.md L64 — keyboard alone | accessibility — keyboard |

## Test-lead checklist

| Check | Coverage |
| --- | --- |
| `min`, `max`, `value` boundaries | QS-04, QS-05, QS-07, QS-08, QS-11, QS-12, QS-13 |
| `disabled` | QS-06 |
| `label` | QS-02, QS-03 |
| Callbacks | QS-09, QS-10, QS-11, QS-16 |
| Control names and live output | QS-14, QS-15 |

## Notes

- QS-05, QS-08, QS-11, and QS-12 encode PRODUCT.md’s “+ disabled at stock limit.” If they fail with + enabled when `value === max`, record or update **F-01** (disable when `value >= max`).
- QS-13 models `max={0}` with `value={1}` as the plant page might still mount before parent disables the whole control; both stepper buttons should be inactive.

## Approval

**Approved** — user requested implementation in chat (Nov 5, 2026). Implemented in `web/cypress/component/QuantityStepper.cy.tsx`. Four tests fail until **F-01** is fixed (QS-05, QS-08, QS-11, QS-12).
