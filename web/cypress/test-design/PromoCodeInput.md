# PromoCodeInput — component test design (T8)

Component: `web/src/components/PromoCodeInput.tsx`  
Props: `appliedCode` (string | null), `onApply` (code: string) => void, `onRemove` () => void, `error?` (string | null), `busy?` (boolean).

Maps to approved plan row **T8** in `docs/test-plans/feature/promo-codes.md`.  
Spec: `web/cypress/component/PromoCodeInput.cy.tsx`.

Oracle: `docs/features/promo-codes.md` (Promo code field, Apply, Remove, refused message announced); `docs/PRODUCT.md` L59–61 (AA naming / announcements).

| ID | kind | given (props) | the user does | expected | source | technique |
| --- | --- | --- | --- | --- | --- | --- |
| T8-01 | render | `appliedCode={null}`, spies for onApply/onRemove | mounts | Sees **Have a promo code?**; **Apply** button disabled while the field is empty / whitespace-only | promo-codes.md:7–8; plan T8 | positive — empty state |
| T8-02 | interaction | `appliedCode={null}`, `onApply` spy | types `LEAFY10` and clicks **Apply** | `onApply` called with `LEAFY10` | promo-codes.md:7–8 | positive — submit trimmed code |
| T8-03 | interaction | `appliedCode={null}`, `onApply` spy | types `  leafy10  ` and submits | `onApply` called with `leafy10` (trimmed) | promo-codes.md:8–9 | edge — trim whitespace |
| T8-04 | state | `appliedCode="LEAFY10"`, `onRemove` spy | mounts | Sees **Code LEAFY10 applied** and **Remove**; no Apply field | promo-codes.md:8 | positive — applied state |
| T8-05 | interaction | `appliedCode="LEAFY10"`, `onRemove` spy | clicks **Remove** | `onRemove` called | promo-codes.md:8 | positive — remove |
| T8-06 | error | `appliedCode={null}`, `error="This code has expired."` | mounts | Error text **This code has expired.** is shown | promo-codes.md:13–14 | negative — error visible |
| T8-07 | state | `appliedCode={null}`, `busy={true}`, field filled via type | mounts / types code | **Apply** stays disabled while busy | plan T8 edge | edge — busy disables Apply |
| T8-08 | state | `appliedCode="FREESHIP"`, `busy={true}` | mounts | **Remove** is disabled | plan T8 edge | edge — busy disables Remove |
| T8-09 | accessibility | `appliedCode={null}` | mounts | Code field has an accessible name matching **Promo code** (label / aria-label) | promo-codes.md:15; PRODUCT.md:61 | accessibility — field name |
| T8-10 | accessibility | `appliedCode={null}`, `error="We don't recognize this code."` | mounts | Refused message is in a live region (`role="alert"` or `aria-live`) so AT can announce it as soon as it appears | promo-codes.md:14; PRODUCT.md:59–61 | accessibility — live region on error |

## Approval

**Approved** — cites approved plan `docs/test-plans/feature/promo-codes.md` (plan-approved; row T8). Parent change-triage authorized implementation.
