# PetSafeTag — component test design

Component: `web/src/components/PetSafeTag.tsx`  
Props: `petSafe` (`boolean`).

Display-only tag. No callbacks, no user interactions, and no disabled, loading, empty, or error state. Used on Plant (`PlantPage` passes `data.petSafe`) and through `PlantCard` on Browse. Do not assert CSS module classes or the safe/unsafe colors (see `.cursor/rules/cypress-tests.mdc`). The Browse checkbox **Pet-safe plants only** is a catalog filter, not this component.

Query the exact label. **Pet safe** is a substring of **Not pet safe**.

| ID | kind | given (props) | the user does | expected | source | technique |
| --- | --- | --- | --- | --- | --- | --- |
| PST-01 | render | `petSafe={true}` | mounts | Visible text is exactly **Pet safe**; **Not pet safe** is not shown | APP-MAP L34 — "🐾 Pet safe" | equivalence class — `petSafe` true |
| PST-02 | render | `petSafe={false}` | mounts | Visible text is exactly **Not pet safe** | APP-MAP L34 — "⚠ Not pet safe" | equivalence class — `petSafe` false |
| PST-03 | accessibility | `petSafe={true}` | mounts | The decorative prefix is hidden from assistive tech; the accessible name is **Pet safe** (not doubled with the paw mark) | APP-MAP L34 — emoji in visible copy only; PRODUCT.md L59–L61 — WCAG AA; same pattern as `CareLevelBadge` (dots `aria-hidden`) | accessibility — decorative prefix |
| PST-04 | accessibility | `petSafe={false}` | mounts | The decorative prefix is hidden from assistive tech; the accessible name is **Not pet safe** (not doubled with the warning mark) | APP-MAP L34 — emoji in visible copy only; PRODUCT.md L59–L61 — WCAG AA | accessibility — decorative prefix |
| PST-05 | accessibility | `petSafe={true}` | mounts | Exactly zero buttons; exactly zero form fields | PRODUCT.md L61 — every button and form field has a name (none here); APP-MAP L34 — tag is text in a `span` only | accessibility — button and field names (N/A) |

## Test-lead checklist

| Check | Coverage |
| --- | --- |
| Every `petSafe` value that changes the label | PST-01 (`true`), PST-02 (`false`) — only two values in the type; both covered |
| Callbacks | none — display only |
| Boundaries at documented limits | Boolean prop: the closed set is `{ true, false }` with no other limits in PRODUCT.md or APP-MAP — PST-01 and PST-02 are the two classes (no numeric or length limits). Invalid or omitted `petSafe` is undefined in product docs — no row |
| Every button has a name | PST-05 — zero buttons (N/A). No form fields on this component |
| Decorative vs announced copy | PST-03 (`true`), PST-04 (`false`) |

## Notes

- PRODUCT.md L24 (**Pet-safe plants only** / safe for cats and dogs) is the Browse filter. This tag’s copy is APP-MAP L34.
- PlantCard already asserts the same visible copy (PC-20, PC-21). These rows own the tag in isolation and decorative-prefix hiding that PlantCard does not cover.
- PST-03 and PST-04 assert behavior (hidden prefix, words announced), not CSS module classes.

## Approval

**Approved** — implemented in `web/cypress/component/PetSafeTag.cy.tsx`.
