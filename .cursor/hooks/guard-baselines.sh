#!/usr/bin/env python3
""":"
exec python3 "$0" "$@"
"""
"""Deny Playwright snapshot updates; baselines change only in CI.

hooks.json runs: python3 .cursor/hooks/guard-baselines.sh
On Windows, Cursor invokes hooks via PowerShell; a bare .sh path does not run
reliably, so the hook is invoked explicitly with python3 (this polyglot file).
"""

import json
import shlex
import sys

sys.stdout.reconfigure(encoding="utf-8", newline="\n")
sys.stderr.reconfigure(encoding="utf-8", newline="\n")

DENY = {
    "permission": "deny",
    "user_message": (
        "Screenshot baselines change only through the visual-baselines "
        "workflow and a reviewed pull request."
    ),
    "agent_message": (
        "Do not update Playwright snapshots locally. Baselines change only "
        "through the visual-baselines workflow and a reviewed pull request."
    ),
}


def argv_from_command(command: str) -> list[str]:
    try:
        return shlex.split(command, posix=False)
    except ValueError:
        return []


def is_playwright_invocation(argv: list[str]) -> bool:
    if not argv:
        return False
    if len(argv) >= 3 and argv[0] == "npm" and argv[1] == "run" and argv[2] == "test:pw":
        return True
    for index, token in enumerate(argv):
        if token == "playwright":
            return True
        if token in ("npx", "pnpm", "yarn") and index + 1 < len(argv) and argv[index + 1] == "playwright":
            return True
    return False


def has_snapshot_update_flag(argv: list[str]) -> bool:
    for token in argv:
        if token == "-u":
            return True
        if token == "--update-snapshots" or token.startswith("--update-snapshots="):
            return True
    return False


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        print(json.dumps({"permission": "allow"}, separators=(",", ":")))
        return

    command = payload.get("command") or ""
    if not isinstance(command, str):
        command = str(command)

    argv = argv_from_command(command)
    if is_playwright_invocation(argv) and has_snapshot_update_flag(argv):
        print(json.dumps(DENY, separators=(",", ":")))
        return

    print(json.dumps({"permission": "allow"}, separators=(",", ":")))


if __name__ == "__main__":
    main()
