#!/usr/bin/env python3
""":"
exec python3 "$0" "$@"
"""
"""Deny agent shell commands that merge, approve, label, or expose secrets.

hooks.json runs: python3 .cursor/hooks/guard-approvals.sh
On Windows, Cursor invokes hooks via PowerShell; run explicitly with python3 (polyglot).
"""

import json
import re
import shlex
import sys

sys.stdout.reconfigure(encoding="utf-8", newline="\n")
sys.stderr.reconfigure(encoding="utf-8", newline="\n")

PERSON_ONLY = "Only a person does this."

DENY = {
    "permission": "deny",
    "user_message": PERSON_ONLY,
    "agent_message": PERSON_ONLY,
}

SECRET_VARS = ("CURSOR_API_KEY", "GH_TOKEN", "GITHUB_TOKEN")
SECRET_REF = re.compile(
    r"(?i)"
    r"(?:\$env:(?:" + "|".join(SECRET_VARS) + r"))"
    r"|%(" + "|".join(SECRET_VARS) + r")%"
    r"|\$\{?(" + "|".join(SECRET_VARS) + r")\}?"
)


def allow() -> None:
    print(json.dumps({"permission": "allow"}, separators=(",", ":")))


def deny() -> None:
    print(json.dumps(DENY, separators=(",", ":")))


def argv_from_command(command: str) -> list[str]:
    try:
        return shlex.split(command, posix=False)
    except ValueError:
        return command.split()


def has_flag(argv: list[str], flag: str) -> bool:
    return flag in argv or any(a.startswith(flag + "=") for a in argv)


def is_gh_executable(token: str) -> bool:
    token = token.strip().strip('"').strip("'")
    lower = token.lower().rstrip("\\/")
    if lower == "gh":
        return True
    if lower.endswith("gh.exe"):
        return True
    return False


def is_gh_invocation(argv: list[str]) -> bool:
    return bool(argv) and is_gh_executable(argv[0])


def argv_at_gh(argv: list[str]) -> list[str] | None:
    for index, token in enumerate(argv):
        if is_gh_executable(token):
            return argv[index:]
    return None


def command_segments(command: str) -> list[str]:
    if not command.strip():
        return []
    parts = re.split(r"(?<![\\])[;&|]|&&", command)
    return [part.strip() for part in parts if part.strip()]


def gh_segment_denies(segment: str, argv: list[str]) -> bool:
    gh_argv = argv_at_gh(argv)
    if gh_argv is None:
        return False
    if is_gh_pr_merge(gh_argv):
        return True
    if is_gh_pr_review_approve(gh_argv):
        return True
    if is_gh_add_label(gh_argv):
        return True
    if is_gh_api_labels_or_merge_or_review(segment, gh_argv):
        return True
    return False


def is_gh_pr_merge(argv: list[str]) -> bool:
    if not is_gh_invocation(argv):
        return False
    lowered = [a.lower() for a in argv]
    return len(lowered) >= 3 and lowered[1] == "pr" and lowered[2] == "merge"


def is_gh_pr_review_approve(argv: list[str]) -> bool:
    if not is_gh_invocation(argv):
        return False
    lowered = [a.lower() for a in argv]
    if len(lowered) < 3 or lowered[1] != "pr" or lowered[2] != "review":
        return False
    return has_flag(argv, "--approve") or has_flag(argv, "-a")


def is_gh_add_label(argv: list[str]) -> bool:
    if not is_gh_invocation(argv):
        return False
    lowered = [a.lower() for a in argv]
    if has_flag(argv, "--add-label"):
        if len(lowered) >= 3 and lowered[1] in ("pr", "issue") and lowered[2] == "edit":
            return True
    if len(lowered) >= 2 and lowered[1] == "label":
        return True
    return False


def is_gh_api_labels_or_merge_or_review(command: str, argv: list[str]) -> bool:
    if not is_gh_invocation(argv) or len(argv) < 3 or argv[1].lower() != "api":
        return False
    path_and_rest = " ".join(argv[2:]).lower()
    if "/labels" in path_and_rest:
        return True
    if "/merge" in path_and_rest and "pull" in path_and_rest:
        return True
    if "/reviews" in path_and_rest and "pull" in path_and_rest:
        return True
    if re.search(r"repos/[^/\s]+/[^/\s]+/issues/\d+/labels", path_and_rest):
        return True
    body = command.lower()
    if "-f" in body or "--field" in body or "--input" in body:
        if "event=approve" in body.replace(" ", "") or '"event":"approve"' in body:
            return True
    return False


def is_printenv(argv: list[str], command: str) -> bool:
    if argv and argv[0].lower() == "printenv":
        return True
    if re.search(r"(?<![\w./-])\bprintenv\b", command, re.I):
        return True
    return False


def is_env_alone(argv: list[str]) -> bool:
    if not argv or argv[0].lower() != "env":
        return False
    for token in argv[1:]:
        if token.startswith("-"):
            continue
        return False
    return True


def references_secret(command: str) -> bool:
    return bool(SECRET_REF.search(command))


def should_deny(command: str) -> bool:
    if not command.strip():
        return False
    if references_secret(command):
        return True
    segments = command_segments(command)
    if not segments:
        segments = [command]
    for segment in segments:
        argv = argv_from_command(segment)
        if is_printenv(argv, segment):
            return True
        if is_env_alone(argv):
            return True
        if gh_segment_denies(segment, argv):
            return True
    return False


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        allow()
        return

    command = payload.get("command") or ""
    if not isinstance(command, str):
        command = str(command)

    if should_deny(command):
        deny()
        return
    allow()


if __name__ == "__main__":
    main()
