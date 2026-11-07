# SearchBox — component test design

Component: `web/src/components/SearchBox.tsx`  
Props: `value` (string — the committed query from Browse / the URL), `onSearch` (`(value: string) => void`).

Local `draft` while the customer types; `onSearch` runs on submit (trimmed) or on **Clear search**. No disabled, loading, or error state. Matching a plant’s name or Latin name, and ignoring case, is the catalog request — not this control. Do not assert CSS module classes or the focus outline (see `.cursor/rules/cypress-tests.mdc`).

| ID | kind | given (props) | the user does | expected | source | technique |
| --- | --- | --- | --- | --- | --- | --- |
| SB-01 | render | `value=""` | mounts | Visible hint **Search plants**; **Search** button; field empty; no **Clear search** | APP-MAP L42 — hint, Search button, × when there is text | equivalence class — `value` empty |
| SB-02 | state | `value="monstera"` | mounts | Field shows `monstera`; hint gone; **Clear search** present | APP-MAP L42 — Browse passes `filters.search`; × when there is text | equivalence class — `value` non-empty |
| SB-03 | boundary | `value="a"` | mounts | Field shows `a`; **Clear search** present | APP-MAP L42 — × when there is text | boundary — 1 character (minimum non-empty) |
| SB-04 | boundary | `value="   "` | mounts | Field shows whitespace; hint gone; **Clear search** present | APP-MAP L42 — × when there is text (committed non-empty string) | boundary — whitespace-only `value` |
| SB-05 | boundary | `value=""` | mounts | Exactly one button (**Search**) | APP-MAP L42 — Clear only when there is text | boundary — button count 1 |
| SB-06 | boundary | `value="x"` | mounts | Exactly two buttons (**Search**, **Clear search**) | APP-MAP L42 — × when there is text | boundary — button count 2 |
| SB-07 | interaction | `value=""`, `onSearch` spy | types `Monstera` (does not submit) | `onSearch` not called; field shows `Monstera`; hint gone; **Clear search** present | APP-MAP L42 — searches on submit | local draft — no live search |
| SB-08 | interaction | `value=""`, `onSearch` spy | types `Monstera`, clicks **Search** | `onSearch` called once with `Monstera` | APP-MAP L42 — searches on submit | callback — typical query |
| SB-09 | interaction | `value=""`, `onSearch` spy | types `  monstera  `, clicks **Search** | `onSearch` called once with `monstera` | APP-MAP L42 — trimmed | boundary — trim leading/trailing space |
| SB-10 | interaction | `value=""`, `onSearch` spy | types `   `, clicks **Search** | `onSearch` called once with `''` | APP-MAP L42 — trimmed | boundary — whitespace-only draft → empty |
| SB-11 | interaction | `value="fern"`, `onSearch` spy | clicks **Search** (no edit) | `onSearch` called once with `fern` | APP-MAP L42 — searches on submit, trimmed | callback — re-submit committed `value` |
| SB-12 | interaction | `value="monstera"`, `onSearch` spy | clicks **Clear search** | `onSearch` called once with `''`; field empty; hint **Search plants** returns; **Clear search** gone | APP-MAP L42 — Clear × | callback — clear |
| SB-13 | state | `value="fern"`, then parent sets `value="aloe"` | remount or update props | Field shows `aloe` | APP-MAP L42 — `value` is the committed query; L15 — URL `search` | parent-driven `value` sync |
| SB-14 | accessibility | `value=""` | mounts | A search landmark (role `search`) | APP-MAP L42 — `role="search"` form | accessibility — landmark |
| SB-15 | accessibility | `value=""` | mounts | The search field has an accessible name **Search plants** | PRODUCT.md L61 — every form field has a name; APP-MAP L42 — "Search plants" hint copy | accessibility — field name (empty) |
| SB-16 | accessibility | `value="monstera"` | mounts | The search field has an accessible name **Search plants** | PRODUCT.md L61 — name required when the visual hint is not shown | accessibility — field name (filled) |
| SB-17 | accessibility | `value=""` | mounts | The only button is named **Search** | PRODUCT.md L61 — every button has a name | accessibility — button names (empty) |
| SB-18 | accessibility | `value="monstera"` | mounts | **Search** and **Clear search** are both present and named | PRODUCT.md L61; APP-MAP L42 — "Clear search" | accessibility — button names (non-empty) |
| SB-19 | accessibility | `value=""`, `onSearch` spy | types `pothos`, submits with Enter | `onSearch` called with `pothos` | PRODUCT.md L64 — keyboard alone | accessibility — keyboard submit |

## Test-lead checklist

| Check | Coverage |
| --- | --- |
| Every `value` class that changes the UI | SB-01 empty (hint, no Clear); SB-02 non-empty (text, Clear); SB-04 whitespace-only `value` (same chrome as non-empty, different field content) |
| `onSearch` | SB-08 submit; SB-09–SB-10 trim; SB-11 re-submit; SB-12 clear; SB-07 not on type alone; SB-19 Enter |
| Boundaries | Length: 0 SB-01, 1 SB-03; trim empty SB-10, trim edges SB-09; whitespace `value` SB-04; buttons 1 SB-05 / 2 SB-06 |
| Every button has a name | SB-17 when only **Search** exists; SB-18 when **Search** and **Clear search** both exist |
| Form field has a name | SB-15–SB-16 (empty vs filled `value`) |
| Keyboard | SB-19 |

## Notes

- **Name / Latin / case-insensitive matching** is `GET /api/plants?search=` on Browse. Do not assert plant results here.
- No documented max length on `search` in APP-MAP or the contract — no extreme-length row.
- Until SB-15/SB-16 pass, query the field with `findByRole('searchbox')` without a name. FINDINGS lists missing field name as a suspicion; failing SB-15/SB-16 promotes it — do not change `web/src` to green the test (cypress rule §7).
- After submit, the input keeps the untrimmed `draft` until the parent passes a new `value`. Assert `onSearch` arguments, not a trimmed field, except when testing SB-13.
- Focus-visible on the input is out of scope (same as SortSelect).

## Approval

**Approved** — implemented in `web/cypress/component/SearchBox.cy.tsx` (SB-15, SB-16 fail until the search input has an accessible name).
