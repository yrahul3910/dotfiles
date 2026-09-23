"""No-sloppy checker for Python.

Two layers:
  1. A ruff overlay: `ruff check --config <package>/ruff.toml`, applied
     independently of the project's own lint setup.
  2. Custom rules for slop patterns ruff can't express, one module per rule
     in the rules/ package, auto-discovered at runtime.

By default only the lines changed relative to HEAD are reported (staged, unstaged, and untracked files), so findings are
about the code just written, not the surrounding codebase.

Findings are errors, warnings, or heuristics: errors fail the check (exit 1); warnings are informational unless --strict
promotes them; heuristics are best-effort hints that never affect the exit code.

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

# Ruff rule families reported as warnings rather than errors: stylistic or pedantic checks that shouldn't fail the run
# on their own. Tune here.
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

        blocks.append(finding.render(sources[finding.path], color=color))

    return "\n\n".join(blocks)


def ruff_cmd() -> list[str]:
    """Locate ruff, preferring a PATH install and falling back to uvx."""
    if ruff := shutil.which("ruff"):
        return [ruff]

    if uvx := shutil.which("uvx"):
        return [uvx, "ruff"]

    sys.exit("no-sloppy: ruff not found on PATH (install ruff or uv)")


def run_ruff(files: list[Path]) -> list[Finding]:
    """Run the ruff overlay on `files` and return every finding it reports.

    Ruff runs with the bundled overlay config (`RUFF_CONFIG`) rather than the project's own, and without its cache, so
    the same standard applies everywhere. Nothing is filtered to changed lines here; the caller does that. Paths come
    back resolved so they match the custom rules' paths, a file ruff cannot parse yields a finding coded
    `syntax-error`, and each finding's level comes from `level_for`. Ruff's own exit status is ignored
    (`--exit-zero`); the caller decides what fails the run.

    If ruff is not installed, or prints something other than a JSON report (it crashed, or the overlay config is
    unreadable), this exits the process with ruff's error output instead of returning.
    """
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
    proc = subprocess.run(cmd, capture_output=True, text=True, check=False)  # noqa: S603

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
    if (exe := shutil.which("git")) is None:
        sys.exit("no-sloppy: git not found on PATH")

    # S603: argv is a resolved executable plus fixed/repo-local args; no shell
    proc = subprocess.run([exe, *args], capture_output=True, text=True, check=False)  # noqa: S603

    if proc.returncode != 0:
        sys.exit(f"no-sloppy: git {args[0]} failed: {proc.stderr.strip()}")

    return proc.stdout


def changed_lines(base: str) -> dict[Path, list[range]]:
    """Map each changed `.py` file in the repository to the line ranges that changed, as the file reads now.

    "Changed" means the working tree, staged and unstaged edits alike, compared against `base`. Keys are absolute
    paths under the repository's top level. A hunk that only deletes lines adds no range, and a file deleted since
    `base` is dropped, so every key is a file you can read. Untracked files (ignored ones excluded) count as changed in
    full and map to `[WHOLE_FILE]`.

    Outside a git repository, or when `base` does not name a commit, this exits the process with git's error.
    """
    root = Path(git("rev-parse", "--show-toplevel").strip())
    changed: dict[Path, list[range]] = {}

    diff = git("-C", str(root), "diff", "-U0", base, "--", "*.py")
    current: Path | None = None

    for line in diff.splitlines():
        if line.startswith("+++ "):
            name = line[4:]
            current = root / name[2:] if name.startswith("b/") else None
        elif line.startswith("@@") and current is not None:
            if not (match := re.match(r"@@ -\S+ \+(\d+)(?:,(\d+))? @@", line)):
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
    """Run both layers over the requested scope, print the report, and return the process exit code.

    The code is 1 when any finding is an error, or a warning under `--strict`, and 0 otherwise; heuristics never count.
    When git or ruff fails, the run exits with status 1 and the tool's error instead of returning.
    """
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="*", type=Path, help="files/dirs to check whole (default: changed files)")
    parser.add_argument("--base", default="HEAD", help="git ref to diff against (default: HEAD)")
    parser.add_argument("--all", action="store_true", help="report whole-file findings on changed files")
    parser.add_argument("--strict", action="store_true", help="exit nonzero on warnings too")
    args = parser.parse_args()

    if args.paths:
        paths = (
            git("ls-files", "--exclude-standard", "--", *map(str, args.paths))
            .strip()
            .splitlines()
        )
        scope = {Path(path): [WHOLE_FILE] for path in paths}
    else:
        scope = changed_lines(args.base)
        if args.all:
            scope = {path: [WHOLE_FILE] for path in scope}

    # T201 suppressions below: print is this CLI's output channel
    if not scope:
        print("no-sloppy: no changed Python files")  # noqa: T201
        return 0

    files = sorted(scope)
<<<<<<< HEAD
    py_files = [
        f
        for path in files
        for f in ([path] if path.is_file() else sorted(path.rglob("*.py")))
        if f.suffix == ".py"
    ]
    findings = [
        f
        for f in run_ruff(files) + run_rules(py_files)
        if any(f.start_line in r for r in scope.get(f.path, [WHOLE_FILE]))
    ]
||||||| parent of 3c0ad97 (feat(no-sloppy): add padding and walrus rules, refine wrap checks)
    findings = [
        f for f in run_ruff(files) + run_rules(files) if any(f.start_line in r for r in scope.get(f.path, [WHOLE_FILE]))
    ]
=======
    findings = [f for f in run_ruff(files) + run_rules(files) if f.touches(scope.get(f.path, [WHOLE_FILE]))]
>>>>>>> 3c0ad97 (feat(no-sloppy): add padding and walrus rules, refine wrap checks)
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

        print(f"\nno-sloppy: {', '.join(counts)} in {len({f.path for f in findings})} file(s)")  # noqa: T201
        return 1 if errors or (warns and args.strict) else 0

    green, reset = (GREEN, RESET) if color else ("", "")
    print(f"{green}no-sloppy: clean ({len(files)} path(s) checked){reset}")  # noqa: T201

    return 0


if __name__ == "__main__":
    sys.exit(main())
