#!/usr/bin/env python3
"""Pipe a beforeShellExecution JSON payload to a hook; print permission (for test-gates.sh)."""

import json
import subprocess
import sys


def main() -> None:
    if len(sys.argv) != 3:
        print("usage: test-gates-shellhook.py <hook-path> <command>", file=sys.stderr)
        sys.exit(2)
    hook, command = sys.argv[1], sys.argv[2]
    payload = json.dumps({"command": command})
    proc = subprocess.run(
        [sys.executable, hook],
        input=payload,
        text=True,
        capture_output=True,
    )
    if proc.returncode != 0 and not proc.stdout.strip():
        print(proc.stderr, file=sys.stderr)
        sys.exit(proc.returncode or 1)
    out = json.loads(proc.stdout.strip())
    print(out.get("permission", ""))


if __name__ == "__main__":
    main()
