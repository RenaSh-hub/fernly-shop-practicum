# ReviewList — component test design

Component: `web/src/components/ReviewList.tsx`  
Props: `reviews` (`ReviewItem[]`), `average` (number), `count` (number).

Used in plant-page Reviews slot. Oracle: `docs/features/plant-reviews.md`.

Maps to plan row **PR-09**.

| ID | kind | given (props) | the user does | expected | source | technique |
| --- | --- | --- | --- | --- | --- | --- |
| PR-09-01 | render | `count={2}`, `average={4.7}`, two review items (authors Ava / Ben, ratings 5 and 4, dates, text) | mounts | Shows **★ 4.7 out of 5 · 2 reviews**; list shows both authors, star ratings, dates, and review text | plant-reviews.md:7–9 | positive — list + average |
| PR-09-02 | render | `count={0}`, `average={0}`, `reviews={[]}` | mounts | Empty invite: **No reviews yet. Be the first to share how it's growing.**; no average line | plant-reviews.md:9 | positive — empty |
| PR-09-03 | edge | `count={1}`, `average={5}`, one review | mounts | Copy uses singular **review** (**★ 5.0 out of 5 · 1 review**) | plant-reviews.md:7–8 | edge — singular |
| PR-09-04 | accessibility | one review with `rating={4}` | mounts | Decorative ★ marks are `aria-hidden`; visually hidden text **4 out of 5** is present for the item | plant-reviews.md:7–8; PRODUCT.md Accessibility | accessibility — rating announcement |

## Test-lead checklist

| Check | Coverage |
| --- | --- |
| Average + plural list | PR-09-01 |
| Empty invite | PR-09-02 |
| Singular review | PR-09-03 |
| Hidden stars / SR rating | PR-09-04 |

## Approval

**Approved** — cites approved plan `docs/test-plans/feature/plant-reviews.md` (plan-approved; row PR-09). Parent change-triage authorized implementation Nov 10, 2026.
