"""Smoke tests for guard-approvals should_deny (run: python3 .cursor/hooks/guard-approvals_smoke.py)."""
import sys
from pathlib import Path
from types import ModuleType

_HOOK = Path(__file__).resolve().parent / "guard-approvals.sh"
mod = ModuleType("guard_approvals")
exec(_HOOK.read_text(encoding="utf-8"), mod.__dict__)

CASES = [
    (
        'cd "c:\\Users\\regin\\dev\\fernly-shop-practicum"; git status',
        False,
        "compound cd + git",
    ),
    (
        'cd "c:\\Users\\regin\\dev\\x"; gh pr edit 8 --add-label "plan-approved"',
        True,
        "compound cd + gh add-label",
    ),
    ('gh pr edit 8 --add-label "plan-approved"', True, "bare gh add-label"),
    ("gh pr merge 8", True, "gh pr merge"),
    ('gh pr review 8 --approve', True, "gh pr review approve"),
    (
        '"C:\\Program Files\\GitHub CLI\\gh.exe" pr edit 8 --add-label "plan-approved"',
        True,
        "gh.exe full path add-label",
    ),
    ('npm test', False, "npm test"),
]


def main() -> int:
    failed = 0
    for command, want, label in CASES:
        got = mod.should_deny(command)
        ok = got == want
        status = "OK" if ok else "FAIL"
        print(f"{status}  {label}: deny={got} want={want}")
        if not ok:
            failed += 1
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
