#!/usr/bin/env python3
"""Build afterFileEdit hook payloads for scripts/test-gates.sh (not used in CI hooks)."""

import json
import sys


def constitution_payload(path: str) -> dict:
    return {
        "file_path": path,
        "edits": [
            {
                "old_string": (
                    "import { test, expect } from '@playwright/test';\n"
                    "test('gate', async () => {\n"
                    "  expect(1).toBe(1);\n"
                    "});\n"
                ),
                "new_string": (
                    "import { test, expect } from '@playwright/test';\n"
                    "test('gate', async ({ page }) => {\n"
                    "  page.locator('//bad');\n"
                    "  expect(1).toBe(1);\n"
                    "});\n"
                ),
            }
        ],
    }


def assertions_payload(path: str) -> dict:
    return {
        "file_path": path,
        "edits": [
            {
                "old_string": (
                    "import { test, expect } from '@playwright/test';\n"
                    "test('gate', async () => {\n"
                    "  expect(1).toBe(1);\n"
                    "  expect(2).toBe(2);\n"
                    "});\n"
                ),
                "new_string": (
                    "import { test, expect } from '@playwright/test';\n"
                    "test('gate', async () => {\n"
                    "  expect(1).toBe(1);\n"
                    "});\n"
                ),
            }
        ],
    }


def main() -> None:
    if len(sys.argv) != 3:
        print(
            "usage: test-gates-hookpayload.py constitution|assertions <file_path>",
            file=sys.stderr,
        )
        sys.exit(2)
    kind, path = sys.argv[1], sys.argv[2]
    if kind == "constitution":
        payload = constitution_payload(path)
    elif kind == "assertions":
        payload = assertions_payload(path)
    else:
        print(f"unknown kind: {kind}", file=sys.stderr)
        sys.exit(2)
    from pathlib import Path

    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(payload["edits"][0]["new_string"], encoding="utf-8")
    print(json.dumps(payload))


if __name__ == "__main__":
    main()
