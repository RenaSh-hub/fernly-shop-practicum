#!/usr/bin/env bash
# agent-guard.sh <patch> <allowed pattern>...
# Exit 1 if the patch touches files outside allowed patterns or human-only paths.
set -euo pipefail

patch="${1:?usage: agent-guard.sh <patch> <allowed pattern>...}"
shift

if [ "$#" -eq 0 ]; then
  echo "agent-guard: at least one allowed pattern is required" >&2
  exit 1
fi

allowed_patterns=("$@")

if [ ! -f "$patch" ] || [ ! -s "$patch" ]; then
  exit 0
fi

is_forbidden() {
  local p="$1"
  case "$p" in
    web/src|web/src/*) return 0 ;;
    api/src|api/src/*) return 0 ;;
    .github|.github/*) return 0 ;;
    .cursor|.cursor/*) return 0 ;;
    scripts|scripts/*) return 0 ;;
    package.json|*/package.json) return 0 ;;
    package-lock.json|*/package-lock.json) return 0 ;;
    playwright.config.ts) return 0 ;;
    web/cypress.config.ts) return 0 ;;
    a11y-baseline.json|*/a11y-baseline.json) return 0 ;;
    *-snapshots|*-snapshots/*|*/-*-snapshots|*/-*-snapshots/*) return 0 ;;
    web/cypress/screenshots|web/cypress/screenshots/*) return 0 ;;
    web/cypress/results|web/cypress/results/*) return 0 ;;
    .env|.env.*|*/.env|*/.env.*) return 0 ;;
  esac
  return 1
}

path_allowed() {
  local p="$1"
  local pat
  for pat in "${allowed_patterns[@]}"; do
    case "$p" in
      $pat) return 0 ;;
    esac
  done
  return 1
}

violations=()
while IFS= read -r line; do
  [ -z "$line" ] && continue
  # git apply --numstat: additions<TAB>deletions<TAB>path (binary: -\t-\tpath)
  path="${line##*$'\t'}"
  [ -z "$path" ] && continue

  if is_forbidden "$path"; then
    violations+=("$path (human-only)")
    continue
  fi
  if ! path_allowed "$path"; then
    violations+=("$path (not in allowlist)")
  fi
done < <(git apply --numstat "$patch")

if [ "${#violations[@]}" -gt 0 ]; then
  echo "agent-guard: patch touches files that must not be changed by the agent:" >&2
  for v in "${violations[@]}"; do
    echo "  - $v" >&2
  done
  exit 1
fi

exit 0
