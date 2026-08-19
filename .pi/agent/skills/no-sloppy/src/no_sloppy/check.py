"""No-sloppy checker for Python.

Two layers:
  1. A ruff overlay: `ruff check --config <package>/ruff.toml`, applied
     independently of the project's own lint setup.
  2. Custom rules for slop patterns ruff can't express, one module per rule
     in the rules/ package, auto-discovered at runtime.

By default only the lines changed relative to HEAD are reported (staged,
unstaged, and untracked files), so findings are about the code just written,
not the surrounding codebase.

Findings are errors, warnings, or heuristics: errors fail the check
(exit 1); warnings are informational unless --strict promotes them;
heuristics are best-effort hints that never affect the exit code.

Usage:
    no-sloppy                 # changed .py files, findings on changed lines only
    no-sloppy --base <ref>    # diff against another ref (e.g. main)
    no-sloppy --all           # changed .py files, whole-file findings
    no-sloppy --strict        # warnings also fail the check
    no-sloppy PATH...         # explicit files/dirs, whole-file findings

Requires git and ruff (falls back to `uvx ruff`).
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import TYPE_CHECKING

from .rules import LEVEL_COLORS, RESET, Finding, run_rules

if TYPE_CHECKING:
    from .rules import Level

GREEN = "\x1b[1;32m"

RUFF_CONFIG = Path(__file__).resolve().parent / "ruff.toml"

WHOLE_FILE = range(1, sys.maxsize)

# Ruff rule families reported as warnings rather than errors: stylistic or
# pedantic checks that shouldn't fail the run on their own. Tune here.
WARN_CODES = ("D", "ANN", "E501", "TD")


def color_enabled() -> bool:
    """Follow the NO_COLOR/FORCE_COLOR conventions, else color TTYs only."""
    if "NO_COLOR" in os.environ:
        return False
    if "FORCE_COLOR" in os.environ:
        return True
    return sys.stdout.isatty()


def level_for(code: str) -> Level:
    """Classify a ruff code: warn for WARN_CODES families, error otherwise."""
    for entry in WARN_CODES:
        if code == entry or (code.startswith(entry) and code[len(entry) :].isdigit()):
            return "warn"
    return "error"


def render_report(findings: list[Finding], *, color: bool = False) -> str:
    """Render findings as rustc-style blocks separated by blank lines."""
    sources: dict[Path, list[str]] = {}
    blocks = []

    for finding in findings:
        if finding.path not in sources:
            try:
                text = finding.path.read_text(encoding="utf-8", errors="replace")
                sources[finding.path] = text.splitlines()
            except OSError:
                sources[finding.path] = []

        lines = sources[finding.path]
        in_range = 0 < finding.start_line <= len(lines)
        line_text = lines[finding.start_line - 1] if in_range else None
        blocks.append(finding.render(line_text, color=color))

    return "\n\n".join(blocks)


def ruff_cmd() -> list[str]:
    """Locate ruff, preferring a PATH install and falling back to uvx."""
    ruff = shutil.which("ruff")
    if ruff:
        return [ruff]

    uvx = shutil.which("uvx")
    if uvx:
        return [uvx, "ruff"]

    sys.exit("no-sloppy: ruff not found on PATH (install ruff or uv)")


def run_ruff(files: list[Path]) -> list[Finding]:
    """Run the ruff overlay on files and return the parsed findings."""
    cmd = [
        *ruff_cmd(),
        "check",
        "--config",
        str(RUFF_CONFIG),
        "--output-format",
        "json",
        "--exit-zero",
        "--no-cache",
        *map(str, files),
    ]

    # S603: argv is our own resolved executable plus repo file paths; no shell
    proc = subprocess.run(  # noqa: S603
        cmd, capture_output=True, text=True, check=False
    )

    try:
        raw = json.loads(proc.stdout)
    except json.JSONDecodeError:
        sys.exit(f"no-sloppy: ruff failed:\n{proc.stderr.strip()}")

    return [
        Finding(
            path=Path(item["filename"]).resolve(),
            start_line=item["location"]["row"],
            start_col=item["location"]["column"],
            code=item["code"] or "syntax-error",
            message=item["message"],
            end_line=(item.get("end_location") or {}).get("row"),
            end_col=(item.get("end_location") or {}).get("column"),
            level=level_for(item["code"] or "syntax-error"),
        )
        for item in raw
    ]


def git(*args: str) -> str:
    """Run a git command and return its stdout, exiting on failure."""
    exe = shutil.which("git")
    if exe is None:
        sys.exit("no-sloppy: git not found on PATH")

    # S603: argv is a resolved executable plus fixed/repo-local args; no shell
    proc = subprocess.run(  # noqa: S603
        [exe, *args], capture_output=True, text=True, check=False
    )

    if proc.returncode != 0:
        sys.exit(f"no-sloppy: git {args[0]} failed: {proc.stderr.strip()}")

    return proc.stdout


def changed_lines(base: str) -> dict[Path, list[range]]:
    """Map changed .py files to their changed (new-side) line ranges."""
    root = Path(git("rev-parse", "--show-toplevel").strip())
    changed: dict[Path, list[range]] = {}

    diff = git("-C", str(root), "diff", "-U0", base, "--", "*.py")
    current: Path | None = None
    for line in diff.splitlines():
        if line.startswith("+++ "):
            name = line[4:]
            current = root / name[2:] if name.startswith("b/") else None
        elif line.startswith("@@") and current is not None:
            match = re.match(r"@@ -\S+ \+(\d+)(?:,(\d+))? @@", line)
            if not match:
                continue
            start = int(match.group(1))
            count = int(match.group(2)) if match.group(2) is not None else 1
            if count:
                changed.setdefault(current, []).append(range(start, start + count))

    untracked = git("-C", str(root), "ls-files", "--others", "--exclude-standard", "--", "*.py")
    for name in untracked.splitlines():
        changed[root / name] = [WHOLE_FILE]

    return {path: ranges for path, ranges in changed.items() if path.is_file()}


def main() -> int:
    """Run both layers over the requested scope and report findings."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "paths",
        nargs="*",
        type=Path,
        help="files/dirs to check whole (default: changed files)",
    )
    parser.add_argument("--base", default="HEAD", help="git ref to diff against (default: HEAD)")
    parser.add_argument("--all", action="store_true", help="report whole-file findings on changed files")
    parser.add_argument("--strict", action="store_true", help="exit nonzero on warnings too")
    args = parser.parse_args()

    if args.paths:
        scope = {path.resolve(): [WHOLE_FILE] for path in args.paths}
    else:
        scope = changed_lines(args.base)
        if args.all:
            scope = {path: [WHOLE_FILE] for path in scope}

    # T201 suppressions below: print is this CLI's output channel
    if not scope:
        print("no-sloppy: no changed Python files")  # noqa: T201
        return 0

    files = sorted(scope)
    findings = [
        f for f in run_ruff(files) + run_rules(files) if any(f.start_line in r for r in scope.get(f.path, [WHOLE_FILE]))
    ]
    findings.sort(key=lambda f: (str(f.path), f.start_line, f.start_col))

    color = color_enabled()
    if findings:
        print(render_report(findings, color=color))  # noqa: T201

        styles = {level: tint if color else "" for level, tint in LEVEL_COLORS.items()}
        reset = RESET if color else ""
        errors = sum(f.level == "error" for f in findings)
        warns = sum(f.level == "warn" for f in findings)
        hints = len(findings) - errors - warns
        counts = [f"{styles['error']}{errors} error(s){reset}"] if errors else []
        if warns:
            counts.append(f"{styles['warn']}{warns} warning(s){reset}")
        if hints:
            counts.append(f"{styles['heuristic']}{hints} heuristic(s){reset}")
        print(  # noqa: T201
            f"\nno-sloppy: {', '.join(counts)} in {len({f.path for f in findings})} file(s)"
        )
        return 1 if errors or (warns and args.strict) else 0

    green, reset = (GREEN, RESET) if color else ("", "")
    print(f"{green}no-sloppy: clean ({len(files)} path(s) checked){reset}")  # noqa: T201
    return 0


if __name__ == "__main__":
    sys.exit(main())
