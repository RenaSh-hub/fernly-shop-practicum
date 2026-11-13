#!/usr/bin/env bash
# Offline gate tests — no API keys, no GitHub. One PASS/FAIL line per check; exit 1 if any fail.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FAILURES=0
WORKTREE=""

cleanup() {
  if [ -n "$WORKTREE" ] && [ -d "$WORKTREE" ]; then
    git worktree remove --force "$WORKTREE" 2>/dev/null || git worktree remove -f "$WORKTREE" 2>/dev/null || true
  fi
}
trap cleanup EXIT

pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1"; FAILURES=$((FAILURES + 1)); }

# --- agent-guard (throwaway worktree only) ---

init_worktree() {
  WORKTREE="$(mktemp -d 2>/dev/null || mktemp -d -t fernly-gate)"
  git worktree add --detach "$WORKTREE" HEAD >/dev/null 2>&1
}

make_patch() {
  local wt="$1"
  shift
  local patch="$wt/agent.patch"
  (
    cd "$wt"
    while [ "$#" -gt 0 ]; do
      local relpath="$1"
      local body="$2"
      shift 2
      mkdir -p "$(dirname "$relpath")"
      printf '%s\n' "$body" >"$relpath"
      git add -f "$relpath"
    done
    git diff --cached --binary >"$patch"
    git reset -q HEAD .
  )
  printf '%s' "$patch"
}

run_agent_guard() {
  local patch="$1"
  shift
  if "$ROOT/scripts/agent-guard.sh" "$patch" "$@" >/dev/null 2>&1; then
    return 0
  fi
  return 1
}

test_agent_guard() {
  init_worktree
  local guard="$ROOT/scripts/agent-guard.sh"
  [ -x "$guard" ] || chmod +x "$guard"

  local patch
  patch="$(make_patch "$WORKTREE" "docs/test-plans/gate-plan.md" "plan only")"
  if run_agent_guard "$patch" 'docs/test-plans/*'; then
    pass "agent-guard: plan-only patch allowed"
  else
    fail "agent-guard: plan-only patch allowed"
  fi

  patch="$(make_patch "$WORKTREE" \
    "docs/test-plans/gate-plan.md" "plan" \
    "web/src/gate-touch.ts" "export const x = 1;")"
  if run_agent_guard "$patch" 'docs/test-plans/*'; then
    fail "agent-guard: web/src change blocked"
  else
    pass "agent-guard: web/src change blocked"
  fi

  patch="$(make_patch "$WORKTREE" ".github/workflows/evil.yml" "on: push")"
  if run_agent_guard "$patch" 'docs/test-plans/*'; then
    fail "agent-guard: workflow change blocked"
  else
    pass "agent-guard: workflow change blocked"
  fi

  patch="$(make_patch "$WORKTREE" \
    "tests/visual/gate.spec.ts-snapshots/screen-linux.png" "binary")"
  if run_agent_guard "$patch" 'tests/*' 'docs/test-plans/*' 'FINDINGS.md'; then
    fail "agent-guard: snapshot baseline blocked"
  else
    pass "agent-guard: snapshot baseline blocked"
  fi

  patch="$(make_patch "$WORKTREE" "scripts/agent-guard.sh" "# touched")"
  if run_agent_guard "$patch" 'scripts/*' 'docs/test-plans/*'; then
    fail "agent-guard: agent-guard.sh blocked despite scripts/* allow"
  else
    pass "agent-guard: agent-guard.sh blocked despite scripts/* allow"
  fi

  patch="$(make_patch "$WORKTREE" \
    "tests/e2e/gate.spec.ts" "import { test, expect } from '@playwright/test'; test('g', async () => { expect(1).toBe(1); });" \
    "FINDINGS.md" "# gate finding")"
  if run_agent_guard "$patch" 'tests/*' 'web/cypress/*' 'docs/test-plans/*' 'FINDINGS.md'; then
    pass "agent-guard: tests and FINDINGS.md allowed"
  else
    fail "agent-guard: tests and FINDINGS.md allowed"
  fi
}

# --- shell hooks (P77 baselines, P81 approvals) ---

hook_permission() {
  python3 "$ROOT/scripts/test-gates-shellhook.py" "$1" "$2"
}

test_hook_baselines_p77() {
  local hook="$ROOT/.cursor/hooks/guard-baselines.sh"
  local p

  p="$(hook_permission "$hook" 'npx playwright test --update-snapshots')"
  [ "$p" = deny ] && pass "hook-baselines P77: --update-snapshots denied" || fail "hook-baselines P77: --update-snapshots denied"

  p="$(hook_permission "$hook" 'npx playwright test -u')"
  [ "$p" = deny ] && pass "hook-baselines P77: -u denied" || fail "hook-baselines P77: -u denied"

  p="$(hook_permission "$hook" 'npm run test:pw')"
  [ "$p" = allow ] && pass "hook-baselines P77: npm run test:pw allowed" || fail "hook-baselines P77: npm run test:pw allowed"
}

test_hook_approvals_p81() {
  local hook="$ROOT/.cursor/hooks/guard-approvals.sh"
  local p

  p="$(hook_permission "$hook" 'gh pr edit 7 --add-label foo')"
  [ "$p" = deny ] && pass "hook-approvals P81: add-label denied" || fail "hook-approvals P81: add-label denied"

  p="$(hook_permission "$hook" 'gh pr merge 7')"
  [ "$p" = deny ] && pass "hook-approvals P81: merge denied" || fail "hook-approvals P81: merge denied"

  p="$(hook_permission "$hook" 'gh pr review 7 --approve')"
  [ "$p" = deny ] && pass "hook-approvals P81: approve denied" || fail "hook-approvals P81: approve denied"

  p="$(hook_permission "$hook" 'printenv')"
  [ "$p" = deny ] && pass "hook-approvals P81: printenv denied" || fail "hook-approvals P81: printenv denied"

  p="$(hook_permission "$hook" 'gh pr view 7')"
  [ "$p" = allow ] && pass "hook-approvals P81: gh pr view allowed" || fail "hook-approvals P81: gh pr view allowed"

  p="$(hook_permission "$hook" 'git diff origin/init...HEAD')"
  [ "$p" = allow ] && pass "hook-approvals P81: git diff allowed" || fail "hook-approvals P81: git diff allowed"
}

# --- afterFileEdit hooks (constitution, test-assertions) ---

run_file_hook() {
  local hook_py="$1"
  local payload_file="$2"
  python3 "$hook_py" <"$payload_file" >/dev/null 2>&1
  return $?
}

test_hook_constitution() {
  local wt_spec="$WORKTREE/tests/e2e/gate-constitution.spec.ts"
  local payload
  payload="$(mktemp)"
  python3 "$ROOT/scripts/test-gates-hookpayload.py" constitution "$wt_spec" >"$payload"
  if run_file_hook "$ROOT/.cursor/hooks/guard-constitution.py" "$payload"; then
    fail "hook-constitution: XPath introduction blocked"
  else
    pass "hook-constitution: XPath introduction blocked"
  fi
  rm -f "$payload"
}

test_hook_test_assertions() {
  local wt_spec="$WORKTREE/tests/e2e/gate-assertions.spec.ts"
  local payload
  payload="$(mktemp)"
  python3 "$ROOT/scripts/test-gates-hookpayload.py" assertions "$wt_spec" >"$payload"
  if run_file_hook "$ROOT/.cursor/hooks/guard-test-assertions.py" "$payload"; then
    fail "hook-test-assertions: weakened expect count blocked"
  else
    pass "hook-test-assertions: weakened expect count blocked"
  fi
  rm -f "$payload"
}

# --- workflows (grep / awk only) ---

strip_yaml_comments() {
  awk '!/^[[:space:]]*#/ && !/^[[:space:]]*$/ { print }' "$1"
}

test_workflow_no_pull_request_target() {
  local bad=0
  local f
  for f in "$ROOT"/.github/workflows/*.yml; do
    while IFS= read -r line; do
      if echo "$line" | grep -q 'pull_request_target'; then
        bad=1
        break
      fi
    done < <(strip_yaml_comments "$f")
  done
  if [ "$bad" -eq 0 ]; then
    pass "workflow: no pull_request_target trigger"
  else
    fail "workflow: no pull_request_target trigger"
  fi
}

test_workflow_pr_triage_timeouts() {
  local file="$ROOT/.github/workflows/pr-triage.yml"
  local bad=0
  local block
  for block in \
    "$(workflow_job_block "$file" plan publish-plan)" \
    "$(workflow_job_block "$file" publish-plan tests)" \
    "$(workflow_job_block "$file" tests publish-tests)" \
    "$(sed -n '/^  publish-tests:/,$p' "$file")"; do
    echo "$block" | grep -qE '^    timeout-minutes:' || bad=1
  done
  if [ "$bad" -eq 0 ]; then
    pass "workflow: every pr-triage job has timeout-minutes"
  else
    fail "workflow: every pr-triage job has timeout-minutes"
  fi
}

workflow_job_block() {
  local file="$1"
  local job="$2"
  local next="$3"
  sed -n "/^  ${job}:/,/^  ${next}:/p" "$file" | sed "$ d"
}

test_workflow_agent_jobs_no_gh_token() {
  local file="$ROOT/.github/workflows/pr-triage.yml"
  local bad=0
  local block
  block="$(workflow_job_block "$file" plan publish-plan)"
  echo "$block" | grep -qE 'GH_TOKEN|GITHUB_TOKEN' && bad=1
  block="$(workflow_job_block "$file" tests publish-tests)"
  echo "$block" | grep -qE 'GH_TOKEN|GITHUB_TOKEN' && bad=1
  if [ "$bad" -eq 0 ]; then
    pass "workflow: agent jobs omit GH_TOKEN and GITHUB_TOKEN"
  else
    fail "workflow: agent jobs omit GH_TOKEN and GITHUB_TOKEN"
  fi
}

test_workflow_agent_checkout_persist_credentials() {
  local file="$ROOT/.github/workflows/pr-triage.yml"
  local bad=0
  local block
  block="$(workflow_job_block "$file" plan publish-plan)"
  echo "$block" | grep -q 'uses: actions/checkout@v4' || bad=1
  echo "$block" | grep -q 'persist-credentials: false' || bad=1
  block="$(workflow_job_block "$file" tests publish-tests)"
  echo "$block" | grep -q 'uses: actions/checkout@v4' || bad=1
  echo "$block" | grep -q 'persist-credentials: false' || bad=1
  if [ "$bad" -eq 0 ]; then
    pass "workflow: agent job checkouts set persist-credentials false"
  else
    fail "workflow: agent job checkouts set persist-credentials false"
  fi
}

test_workflow_tests_human_plan_approved() {
  local file="$ROOT/.github/workflows/pr-triage.yml"
  local block
  block="$(workflow_job_block "$file" tests publish-tests)"
  if echo "$block" | grep -q 'plan-approved' &&
    echo "$block" | grep -q "github.event.sender.type == 'User'"; then
    pass "workflow: tests job gated on plan-approved by User"
  else
    fail "workflow: tests job gated on plan-approved by User"
  fi
}

# --- run ---

test_agent_guard
test_hook_baselines_p77
test_hook_approvals_p81
test_hook_constitution
test_hook_test_assertions
test_workflow_no_pull_request_target
test_workflow_pr_triage_timeouts
test_workflow_agent_jobs_no_gh_token
test_workflow_agent_checkout_persist_credentials
test_workflow_tests_human_plan_approved

exit "$FAILURES"
