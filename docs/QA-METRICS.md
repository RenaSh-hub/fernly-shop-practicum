# QA metrics

_Generated 2026-11-10T20:09:11.140Z by `node scripts/qa-metrics.mjs` (read-only; data from GitHub via `gh`)._

**Totals:** routing accuracy = 20/21 (95.2%); false-alarm rate = 0/0 (—). **Agent spend** is not available in GitHub — see the [Cursor usage dashboard](https://cursor.com/dashboard?tab=usage).

| PR | Title | Plan review | Min to plan | Min to QA report | Agent min | Findings | False alarms |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| [#1](https://github.com/vskadorva/fernly-shop-practicum/pull/1) | Feature: Add promo codes | 20/21 — SCH1 duplicates schema coverage already implied by M1–M6; keeping API level is fine. Q1–Q5 correctly left unresolved. | 8.7 | — | 88.8 | 0 | 0 |

## How each number is measured

- **Pull requests:** open and closed PRs labelled `plan-approved`.
- **Plan review (N/M):** the latest PR comment by a person (not a bot) whose body starts with `Plan review: N/M`. Text after an em dash on that line is the routing gap summary. N counts plan rows whose change was sent to the right test level; M is rows reviewed.
- **Min to plan:** minutes from PR open to the first `github-actions[bot]` PR comment that is not the QA report (`<!-- fernly-qa-report -->`).
- **Min to QA report:** minutes from PR open to the first comment whose body starts with `<!-- fernly-qa-report -->`.
- **Agent min:** sum of run durations for finished **PR triage** workflow runs on the PR head branch (`updatedAt − createdAt`; successes and failures; excludes cancelled/skipped).
- **Findings:** issues labelled `qa-finding` whose body links to the PR (`Pull request:` URL, `/pull/N`, or `PR #N`).
- **False alarms:** those findings with `stateReason` **not planned** (closed as not planned).
- **Routing accuracy:** Σ(plan rows right) ÷ Σ(plan rows reviewed) across PRs with a plan review comment.
- **False-alarm rate:** false alarms ÷ findings across the same PR set.
- **Money:** not stored in GitHub; use the Cursor dashboard for API/agent cost.
