#!/usr/bin/env bash
# run-agent.sh <prompt-file> <result-file> <trail-file>
set -euo pipefail

prompt_file="${1:?usage: run-agent.sh <prompt-file> <result-file> <trail-file>}"
result_file="${2:?}"
trail_file="${3:?}"

if [ ! -f "$prompt_file" ]; then
  echo "run-agent: prompt file not found: $prompt_file" >&2
  exit 1
fi

log_tool_line() {
  local line="$1"
  local type subtype tool detail
  type=$(echo "$line" | jq -r '.type // empty')
  subtype=$(echo "$line" | jq -r '.subtype // empty')
  if [ "$type" = "tool_call" ] && [ "$subtype" = "started" ]; then
    tool=$(echo "$line" | jq -r 'if .tool_call then (.tool_call | keys[0]) else "tool" end')
    detail=$(echo "$line" | jq -r '
      .tool_call
      | to_entries[0].value.args
      | if type == "object" then
          (.path // .command // .pattern // .description // tostring)
        else
          tostring
        end
      | if length > 120 then .[0:117] + "..." else . end
    ' 2>/dev/null || echo "")
    echo "[agent] $tool ${detail:+$detail}"
  fi
}

extract_last_message() {
  local trail="$1"
  local out="$2"
  local line type text last_assistant="" last_result=""

  while IFS= read -r line; do
    echo "$line" | jq -e . >/dev/null 2>&1 || continue
    type=$(echo "$line" | jq -r '.type // empty')
    if [ "$type" = "assistant" ]; then
      text=$(echo "$line" | jq -r '
        [.message.content[]? | select(.type == "text") | .text] | join("")
      ' 2>/dev/null || true)
      if [ -n "$text" ] && [ "$text" != "null" ]; then
        last_assistant="$text"
      fi
    fi
    if [ "$type" = "result" ]; then
      text=$(echo "$line" | jq -r '.result // empty' 2>/dev/null || true)
      if [ -n "$text" ] && [ "$text" != "null" ]; then
        last_result="$text"
      fi
    fi
  done <"$trail"

  if [ -n "$last_result" ]; then
    printf '%s' "$last_result" >"$out"
  elif [ -n "$last_assistant" ]; then
    printf '%s' "$last_assistant" >"$out"
  else
    : >"$out"
  fi
}

: >"$trail_file"

set -o pipefail
agent -p --force --trust --output-format stream-json "$(cat "$prompt_file")" 2>&1 |
  tee "$trail_file" |
  while IFS= read -r line; do
    echo "$line" | jq -e . >/dev/null 2>&1 || continue
    log_tool_line "$line"
  done

agent_status=${PIPESTATUS[0]}
extract_last_message "$trail_file" "$result_file"
exit "$agent_status"
