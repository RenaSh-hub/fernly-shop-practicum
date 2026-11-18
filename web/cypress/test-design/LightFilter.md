# LightFilter — component test design

Component: `web/src/components/LightFilter.tsx`  
Props: `value` (`Light[]`: `low` | `medium` | `bright`), `onChange` (`(value: Light[]) => void`).

Controlled checkbox group. Options are fixed in the component (not a prop): **Low light**, **Medium light**, **Bright light**. Checking appends that light; unchecking removes it. No disabled, loading, or error state. Empty selection is `value={[]}`. Browse passes `filters.light` (URL `light`, omitted when empty) and writes the callback array back into the URL. Which plants match is the catalog request, not this control. Do not assert CSS module classes or the focus outline (see `.cursor/rules/cypress-tests.mdc`).

| ID | kind | given (props) | the user does | expected | source | technique |
| --- | --- | --- | --- | --- | --- | --- |
| LF-01 | render | `value={[]}` | mounts | A group labeled **Light** lists, in this order: Low light, Medium light, Bright light | APP-MAP L43 — fieldset "Light" with checkboxes Low / Medium / Bright light | equivalence class — the option set |
| LF-02 | state | `value={[]}` | mounts | None of the three checkboxes are checked | APP-MAP L15 — Browse omits `light` when none are chosen; L43 — `value` is the checked set | equivalence class — `value` empty (0 checked) |
| LF-03 | state | `value={['low']}` | mounts | Low light is checked; Medium light and Bright light are not | APP-MAP L43 — Low light | equivalence class — `value` `low` (1 checked) |
| LF-04 | state | `value={['medium']}` | mounts | Medium light is checked; Low light and Bright light are not | APP-MAP L43 — Medium light | equivalence class — `value` `medium` (1 checked) |
| LF-05 | state | `value={['bright']}` | mounts | Bright light is checked; Low light and Medium light are not | APP-MAP L43 — Bright light | equivalence class — `value` `bright` (1 checked) |
| LF-06 | state | `value={['low', 'bright']}` | mounts | Low light and Bright light are checked; Medium light is not | PRODUCT.md L23 — Light filters can be combined: Low and Bright | equivalence class — two lights (product example) |
| LF-07 | state | `value={['low', 'medium']}` | mounts | Low light and Medium light are checked; Bright light is not | APP-MAP L72 — `light` is comma-separated | equivalence class — two lights |
| LF-08 | state | `value={['medium', 'bright']}` | mounts | Medium light and Bright light are checked; Low light is not | APP-MAP L72 — `light` is comma-separated | equivalence class — two lights |
| LF-09 | state | `value={['low', 'medium', 'bright']}` | mounts | All three checkboxes are checked | PRODUCT.md L23 — filters can be combined; APP-MAP L72 — comma-separated `light` | equivalence class — all three (3 checked) |
| LF-10 | boundary | `value={[]}` | mounts | Exactly three checkboxes | APP-MAP L43 — three labels; L72 — `Light` levels low, medium, bright | boundary — option count at the limit (3) |
| LF-11 | boundary | `value={[]}` | mounts | Low light is the first checkbox; Bright light is the last | APP-MAP L43 — Low, then Medium, then Bright | boundary — first and last of three |
| LF-12 | interaction | `value={[]}`, `onChange` spy | checks Low light | `onChange` is called once with `['low']`; Low light stays unchecked | APP-MAP L43 — parent passes `value` and `onChange` | callback — add from empty; controlled `value` |
| LF-13 | interaction | `value={['low']}`, `onChange` spy | checks Bright light | `onChange` is called once with `['low', 'bright']` | PRODUCT.md L23 — Low and Bright together; APP-MAP L15 — URL example `light=low,bright` | callback — append onto an existing selection |
| LF-14 | interaction | `value={['medium']}`, `onChange` spy | unchecks Medium light | `onChange` is called once with `[]` | APP-MAP L15 — empty `light` is omitted from the URL; L43 — `onChange` updates the checked set | callback — remove the only selection (1 → 0) |
| LF-15 | interaction | `value={['low', 'bright']}`, `onChange` spy | unchecks Low light | `onChange` is called once with `['bright']` | APP-MAP L43 — `value: Light[]`; L72 — comma-separated subset after one light is removed | callback — remove one of two |
| LF-16 | accessibility | `value={[]}` | mounts | The control is a group named **Light** | PRODUCT.md L61 — every form field has a name a screen reader can announce; APP-MAP L43 — legend "Light" | accessibility — group name |
| LF-17 | accessibility | `value={[]}` | mounts | The checkboxes are named **Low light**, **Medium light**, and **Bright light** | PRODUCT.md L61 — form fields named for screen readers; APP-MAP L43 — those labels | accessibility — checkbox names |
| LF-18 | accessibility | `value={[]}` | mounts | There are no buttons in the component | PRODUCT.md L61 — every button has a name (none here); APP-MAP L43 — checkboxes only | accessibility — button names (N/A) |
| LF-19 | accessibility | `value={[]}`, `onChange` spy | focuses Low light and toggles it with the keyboard | `onChange` is called with `['low']` | PRODUCT.md L64 — everything works with the keyboard alone | accessibility — keyboard |
| LF-20 | boundary | `value` is not a subset of the three lights (e.g. `['shade']`, or four entries) | mounts | — | assumed — ask (PRODUCT.md and APP-MAP do not define an unknown or extra `light`) | boundary — one past the closed set |

## Test-lead checklist

| Check | Coverage |
| --- | --- |
| Every `value` that changes which boxes are checked | LF-02 empty (0); LF-03–LF-05 each single light (1); LF-06–LF-08 each pair (2); LF-09 all three (3) |
| `onChange` | LF-12 add from empty; LF-13 append; LF-14 remove to empty; LF-15 remove one of two; LF-19 keyboard add |
| Boundaries | Option count 3 LF-10; first/last LF-11; checked count 0 LF-02, 1 LF-03–LF-05, 2 LF-06–LF-08, 3 LF-09; invalid `value` LF-20 |
| Every button has a name | LF-18 (no buttons; only the labeled checkboxes) |
| Form control names | LF-16 group; LF-17 each checkbox |

## Notes

- Which plants are shown for a light filter, including “either Low or Bright,” is the Browse catalog request. This table only checks the checkboxes and the array passed to `onChange`.
- Browse turns that array into the URL (`light` joined with commas, omitted when empty). Assert the array here, not the query string.
- LF-12 is the only interaction row that also asserts the box stays on the `value` prop after a click (controlled component).
- LF-13 is the append path for the PRODUCT.md example pair. Checking any other unchecked box is the same code path.
- LF-14 and LF-15 are the two remove outcomes (empty result, non-empty result). Unchecking one of three selected lights is the same remove path as LF-15.
- Dropped a standalone “exactly one checked” boundary row: LF-03–LF-05 already assert one checked and two unchecked each.
- Dropped duplicate interaction rows that only re-hit the same append or remove handler as LF-13 or LF-15.
- LF-20 has no expected result until product or APP-MAP defines behavior for a `value` outside `low`, `medium`, and `bright`.

## Approval

**Approved** — implemented in `web/cypress/component/LightFilter.cy.tsx` (LF-20 skipped: assumed — ask).
