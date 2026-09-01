#!/usr/bin/env python3
"""Run project quality commands declared in `.specs/config.yaml`.

Used during /verify to execute the owner's test/lint commands and attach
evidence that commands actually ran:

    python3 run_quality_checks.py
    python3 run_quality_checks.py --json

Configure under:

    quality:
      checks:
        - npm test
        - npm run lint

Exit codes: 0 all passed or skipped (no checks configured), 1 one or more failed.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

from _common import EXIT_FAILED, EXIT_OK
from _project_config import load_project_config

GATE = "quality-checks"


def run_command(command: str, cwd: Path) -> dict:
    completed = subprocess.run(
        command,
        cwd=cwd,
        shell=True,
        capture_output=True,
        text=True,
        # Test runners emit symbols the platform locale cannot always decode.
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    output = (completed.stdout or "") + (completed.stderr or "")
    if len(output) > 8000:
        output = output[:8000] + "\n… (truncated)"
    return {
        "command": command,
        "exit_code": completed.returncode,
        "output": output,
        "passed": completed.returncode == 0,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run configured project quality checks")
    parser.add_argument("--cwd", default=".", help="repository root")
    parser.add_argument("--json", action="store_true", help="machine-readable output")
    args = parser.parse_args(argv)

    cwd = Path(args.cwd).resolve()
    checks = load_project_config(cwd).get("quality", {}).get("checks") or []

    if not checks:
        message = {
            "gate": GATE,
            "status": "skipped",
            "reason": "no quality.checks configured in .specs/config.yaml",
            "results": [],
        }
        if args.json:
            print(json.dumps(message, indent=2))
        else:
            print(f"[{GATE}] SKIP - no quality.checks configured")
            print("  info      add commands under quality.checks in .specs/config.yaml")
        return EXIT_OK

    results = [run_command(command, cwd) for command in checks]
    failed = [item for item in results if not item["passed"]]

    payload = {
        "gate": GATE,
        "status": "pass" if not failed else "fail",
        "results": results,
    }

    if args.json:
        print(json.dumps(payload, indent=2))
    else:
        status = "PASS" if not failed else "FAIL"
        print(f"[{GATE}] {status} - {len(checks)} command(s)")
        for item in results:
            label = "ok" if item["passed"] else "blocking"
            print(f"  {label:<9} {item['command']} (exit {item['exit_code']})")
            if not item["passed"] and item["output"].strip():
                for line in item["output"].strip().splitlines()[-8:]:
                    print(f"            {line}")

    return EXIT_OK if not failed else EXIT_FAILED


if __name__ == "__main__":
    sys.exit(main())
