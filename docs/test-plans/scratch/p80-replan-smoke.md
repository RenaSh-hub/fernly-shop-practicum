# Test plan: scratch/p80-replan-smoke

## Summary

Adds a temporary scratch feature note (`docs/features/scratch-p80-replan-smoke.md`) so a mock PR can exercise PR triage **replan** and **publish-plan**. No `web/`, `api/`, or config paths change; nothing customer-facing ships. Do not merge.

## Plan

| ID | area | what changed | risk to a customer | level | specialist | cases (positive / negative / edge / accessibility) | source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| — | docs only | New scratch feature markdown for pipeline smoke | None (no app behaviour change) | — | — | No product cases: confirm the file states this branch is temporary and must not be merged. No component, UI, API, e2e, or a11y work. | docs/features/scratch-p80-replan-smoke.md:1–4 |

## Assumed — ask

1. **Scope:** Confirm docs-only smoke PRs need no Fernly product test rows beyond noting “do not merge,” and that no specialist handoff is required.
