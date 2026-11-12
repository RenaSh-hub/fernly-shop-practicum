# Test plan: scratch/p80-replan-smoke

## Summary

Mock PR for PR-triage **replan** / **publish-plan** smoke: adds `docs/features/scratch-p80-replan-smoke.md`, a marker comment in `FINDINGS.md`, and this plan file. No `web/`, `api/`, `package.json`, or config paths change; nothing customer-facing ships. Do not merge.

## Plan

| ID | area | what changed | risk to a customer | level | specialist | cases (positive / negative / edge / accessibility) | source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| — | docs only | Scratch feature note + FINDINGS marker for pipeline smoke | None (no app behaviour change) | — | — | No product cases: confirm the feature doc states this branch is temporary and must not be merged. No component, UI, API, e2e, or a11y work. | docs/features/scratch-p80-replan-smoke.md:1–4 |

## Assumed — ask

1. **Scope:** Confirm docs-only smoke PRs need no Fernly product test rows beyond noting “do not merge,” and that no specialist handoff is required.
