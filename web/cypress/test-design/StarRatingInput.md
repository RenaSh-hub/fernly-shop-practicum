# StarRatingInput — component test design

Component: `web/src/components/StarRatingInput.tsx`  
Props: `value` (number, 0–5), `onChange` `(value: number) => void`.

Used inside `ReviewForm` on the plant page Reviews slot. Oracle: `docs/features/plant-reviews.md` (keyboard like radio buttons).

Maps to plan row **PR-07**.

| ID | kind | given (props) | the user does | expected | source | technique |
| --- | --- | --- | --- | --- | --- | --- |
| PR-07-01 | interaction | `value={0}`, `onChange` spy | clicks **3 stars** | `onChange` called with **3**; three filled stars | plant-reviews.md:10–11 | equivalence — mid rating |
| PR-07-02 | interaction | `value={0}`, `onChange` spy | clicks **1 star** | `onChange` called with **1** | plant-reviews.md:10 | boundary — min |
| PR-07-03 | interaction | `value={0}`, `onChange` spy | clicks **5 stars** | `onChange` called with **5** | plant-reviews.md:10 | boundary — max |
| PR-07-04 | render | `value={0}`, `onChange` spy | mounts | Radiogroup **Your rating**; no radio selected (`aria-checked` false / none checked) | plant-reviews.md:11; edge value 0 | edge — none selected |
| PR-07-05 | accessibility | `value={3}`, `onChange` spy | mounts | Role `radiogroup` named **Your rating**; five `radio`s named **1 star** / **2 stars** … **5 stars**; **3 stars** is checked | plant-reviews.md:11; PRODUCT.md Accessibility | accessibility — roles and names |
| PR-07-06 | accessibility | `value={0}`, `onChange` spy | Tabs into the radiogroup, presses ArrowRight / ArrowDown to raise rating | Focus moves among stars; `onChange` called with the new rating (radio-like keyboard) | plant-reviews.md:11 — Tab into group, arrows change rating | accessibility — keyboard |

## Test-lead checklist

| Check | Coverage |
| --- | --- |
| Click sets 1–5 | PR-07-01, PR-07-02, PR-07-03 |
| Value 0 = none selected | PR-07-04 |
| Radiogroup / radio names and selected | PR-07-05 |
| Keyboard like radios | PR-07-06 |

## Notes

- PR-07-06 encodes documented radio keyboard behavior. If stars are click-only (no `tabIndex` / `aria-checked` / arrow handlers), fail and record a suspicion — do not weaken the assertion.

## Approval

**Approved** — cites approved plan `docs/test-plans/feature/plant-reviews.md` (plan-approved; row PR-07). Parent change-triage authorized implementation Nov 10, 2026.
