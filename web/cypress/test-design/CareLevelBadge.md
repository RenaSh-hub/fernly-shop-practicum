# CareLevelBadge — component test design

Component: `web/src/components/CareLevelBadge.tsx`  
Props: `level` (`1 | 2 | 3`).

Display-only badge. No callbacks, no user interactions, and no disabled, loading, empty, or error state. Used on Plant (`PlantPage` passes `data.careLevel`) and through `PlantCard` on Browse. Do not assert CSS module classes or the level colors (see `.cursor/rules/cypress-tests.mdc`).

Visible copy is a run of dots plus the words. The dots sit in an `aria-hidden` span, so the accessible name is the words only.

| ID | kind | given (props) | the user does | expected | source | technique |
| --- | --- | --- | --- | --- | --- | --- |
| CLB-01 | render | `level={1}` | mounts | Visible text is one dot and **Easy care** | PRODUCT.md L32 — 1 **Easy**; APP-MAP L33 — one to three dots and "Easy / Moderate / Expert care" | equivalence class — `level` 1; boundary — minimum |
| CLB-02 | render | `level={2}` | mounts | Visible text is two dots and **Moderate care** | PRODUCT.md L32 — 2 **Moderate**; APP-MAP L33 | equivalence class — `level` 2 |
| CLB-03 | render | `level={3}` | mounts | Visible text is three dots and **Expert care** | PRODUCT.md L32 — 3 **Expert**; APP-MAP L33 | equivalence class — `level` 3; boundary — maximum |
| CLB-04 | accessibility | `level={1}` | mounts | The dots are hidden from assistive tech; the accessible name is **Easy care** (not doubled with the dots) | APP-MAP L33 — dots hidden from screen readers; PRODUCT.md L59–L61 — WCAG AA | accessibility — decorative dots |
| CLB-05 | accessibility | `level={2}` | mounts | The dots are hidden from assistive tech; the accessible name is **Moderate care** | APP-MAP L33; PRODUCT.md L59–L61 | accessibility — decorative dots |
| CLB-06 | accessibility | `level={3}` | mounts | The dots are hidden from assistive tech; the accessible name is **Expert care** | APP-MAP L33; PRODUCT.md L59–L61 | accessibility — decorative dots |
| CLB-07 | accessibility | `level={1}` | mounts | Exactly zero buttons; exactly zero form fields | PRODUCT.md L61 — every button and form field has a name (none here); APP-MAP L33 — badge is text in a `span` only | accessibility — button and field names (N/A) |

## Test-lead checklist

| Check | Coverage |
| --- | --- |
| Every `level` that changes the label and the dot count | CLB-01 (`1` Easy, one dot), CLB-02 (`2` Moderate, two dots), CLB-03 (`3` Expert, three dots) — only three values in the type; all covered |
| Callbacks | none — display only |
| Boundaries at documented limits | PRODUCT.md L32 and the API contract cap care level at 1–3. Minimum **1** is CLB-01; maximum **3** is CLB-03. Values outside that set are not described in PRODUCT.md or APP-MAP — no row |
| States (disabled, loading, empty, error) | none on this component |
| Every button has a name | CLB-07 — zero buttons (N/A). No form fields |
| Decorative vs announced copy | CLB-04, CLB-05, CLB-06 — one row per `level` that changes the announced label (same three values as render) |

## Notes

- PlantCard already asserts the words (PC-17 Easy, PC-18 Moderate, PC-19 Expert). These rows own the badge in isolation: dot count and hiding the dots from assistive tech, which PlantCard does not cover.
- **CLB-03** expects **Expert care** from PRODUCT.md L32. FINDINGS records that today’s badge can show **Moderate care** for level 3 (same failure as PC-19). Do not weaken the expected result.
- Do not assert CSS module classes or the green / amber / red level colors. The `title` tooltip is implementation detail with no PRODUCT.md or APP-MAP requirement — not in the table.

## Approval

**Approved** — implemented in `web/cypress/component/CareLevelBadge.cy.tsx` (CLB-03 and CLB-06 fail until level 3 shows Expert care).
