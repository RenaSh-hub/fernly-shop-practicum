# ReviewForm — component test design

Component: `web/src/components/ReviewForm.tsx`  
Props: `onSubmit` `({ rating, text }) => void`, `busy?` (default false), `error?` (string \| null).

Used in plant-page Reviews slot for signed-in customers. Oracle: `docs/features/plant-reviews.md`.

Maps to plan row **PR-08**.

| ID | kind | given (props) | the user does | expected | source | technique |
| --- | --- | --- | --- | --- | --- | --- |
| PR-08-01 | interaction | `onSubmit` spy | chooses **4 stars**, types a ≥10-char review with leading/trailing spaces, submits **Post review** | `onSubmit` called once with `{ rating: 4, text: trimmed }`; rating cleared; textarea empty | plant-reviews.md:10–12 | positive — valid submit |
| PR-08-02 | negative | `onSubmit` spy | submits without choosing a rating | `role="alert"` shows **Choose a rating from 1 to 5 stars.**; `onSubmit` not called | plant-reviews.md:10 | negative — no rating |
| PR-08-03 | negative | `onSubmit` spy | chooses **3 stars**, types fewer than 10 characters, submits | `role="alert"` shows **Write at least 10 characters.**; `onSubmit` not called | plant-reviews.md:10 | negative — short text |
| PR-08-04 | state | `busy={true}`, `onSubmit` spy | mounts | Submit button shows **Posting…** and is disabled | plant-reviews.md:12 | state — busy |
| PR-08-05 | state | `error="You already reviewed this plant."`, `onSubmit` spy | mounts | `role="alert"` shows the error text | plant-reviews.md:12–13 | state — server error prop |
| PR-08-06 | accessibility | `onSubmit` spy | mounts | Textarea labelled **Your review**; heading **Write a review** | plant-reviews.md:10; PRODUCT.md Accessibility | accessibility — labels |

## Test-lead checklist

| Check | Coverage |
| --- | --- |
| Valid submit + trim + clear | PR-08-01 |
| Client validation | PR-08-02, PR-08-03 |
| Busy / error | PR-08-04, PR-08-05 |
| Labels / alerts | PR-08-02, PR-08-03, PR-08-05, PR-08-06 |

## Approval

**Approved** — cites approved plan `docs/test-plans/feature/plant-reviews.md` (plan-approved; row PR-08). Parent change-triage authorized implementation Nov 10, 2026.
