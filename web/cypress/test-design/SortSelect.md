# SortSelect — component test design

Component: `web/src/components/SortSelect.tsx`  
Props: `value` (`Sort`: `featured` | `price-asc` | `price-desc` | `name` | `rating`), `onChange` (`(value: Sort) => void`).

Controlled select. Options are fixed in the component (not a prop). No disabled, loading, empty, or error state. Browse passes `filters.sort` (URL `sort`, default `featured`) and writes the callback result back into the URL. Do not assert CSS module classes or the focus outline (see `.cursor/rules/cypress-tests.mdc`). Plant order for a chosen sort is the catalog request, not this control.

| ID | kind | given (props) | the user does | expected | source | technique |
| --- | --- | --- | --- | --- | --- | --- |
| SS-01 | render | `value="featured"` | mounts | The select lists, in this order: Featured, Price: low to high, Price: high to low, Name: A to Z, Best rated | PRODUCT.md L25 — Sort by: Featured, Price: low to high, Price: high to low, Name: A to Z, Best rated | equivalence class — the option set |
| SS-02 | state | `value="featured"` | mounts | Featured is the selected option | PRODUCT.md L25 — Featured; APP-MAP L19 — Browse defaults `sort` to `featured` | equivalence class — `value` `featured` |
| SS-03 | state | `value="price-asc"` | mounts | Price: low to high is the selected option | PRODUCT.md L25 — Price: low to high | equivalence class — `value` `price-asc` |
| SS-04 | state | `value="price-desc"` | mounts | Price: high to low is the selected option | PRODUCT.md L25 — Price: high to low | equivalence class — `value` `price-desc` |
| SS-05 | state | `value="name"` | mounts | Name: A to Z is the selected option | PRODUCT.md L25 — Name: A to Z | equivalence class — `value` `name` |
| SS-06 | state | `value="rating"` | mounts | Best rated is the selected option | PRODUCT.md L25 — Best rated | equivalence class — `value` `rating` |
| SS-07 | boundary | `value="featured"` | mounts | Featured is the first listed option | PRODUCT.md L25 — Featured first in the Sort by list | boundary — first of five |
| SS-08 | boundary | `value="rating"` | mounts | Best rated is the last listed option | PRODUCT.md L25 — Best rated last in the Sort by list | boundary — last of five |
| SS-09 | boundary | `value="featured"` | mounts | The select exposes exactly five options | APP-MAP L72 — `sort` is one of five values; L44 — five labels in the control | boundary — count at the limit (5) |
| SS-10 | interaction | `value="featured"`, `onChange` spy | chooses Price: low to high | `onChange` is called once with `price-asc`; the select still shows Featured | APP-MAP L44 — parent passes `value` and `onChange`; L70 — Browse wires `sort` from filters | callback — non-default sort id; controlled `value` |
| SS-11 | interaction | `value="price-asc"`, `onChange` spy | chooses Featured | `onChange` is called once with `featured` | PRODUCT.md L25 — Featured; APP-MAP L19 — default sort when the URL omits `sort` | callback — default sort id |
| SS-12 | accessibility | `value="featured"` | mounts | The sort control is a combobox named Sort by | PRODUCT.md L61 — every form field has a name a screen reader can announce | accessibility — role and name |
| SS-13 | accessibility | `value="featured"` | mounts | There are no buttons in the component | PRODUCT.md L61 — every button … has a name (no buttons here); APP-MAP L44 — "Sort by" select only | accessibility — button names (N/A) |
| SS-14 | accessibility | `value="featured"`, `onChange` spy | focuses the select and chooses Name: A to Z with the keyboard | `onChange` is called with `name` | PRODUCT.md L64 — everything works with the keyboard alone | accessibility — keyboard |
| SS-15 | boundary | `value` is not one of the five sorts (e.g. `bogus`) | mounts | — | assumed — ask (PRODUCT.md and APP-MAP do not define an unknown `sort`) | boundary — one past the closed set |

## Test-lead checklist

| Check | Coverage |
| --- | --- |
| Every `value` that changes the selected option | SS-02–SS-06 (all five `Sort` values) |
| `onChange` | SS-10–SS-11 (non-default and default sort ids; same handler for every option) |
| Boundaries | First option SS-07, last option SS-08, count 5 SS-09, invalid value SS-15 |
| Every button has a name | SS-13 (no buttons; only the labeled select) |
| Option labels | SS-01 |

## Notes

- Labels stop at the words in the control. "Most expensive first" and "highest first" in PRODUCT.md describe catalog order. A test that the plant list is actually sorted belongs on Browse, not here.
- SS-10 is the only interaction row that also asserts the select stays on the `value` prop after a choice (controlled component).
- Removed duplicate interaction rows that only repeated the SS-10 callback path for `price-desc`, `name`, and `rating` — one `onChange` code path for all options.
- SS-15 has no expected result until product or APP-MAP defines behavior for an invalid `value`.

## Approval

**Approved** — implemented in `web/cypress/component/SortSelect.cy.tsx` (SS-15 skipped: no expected result).
