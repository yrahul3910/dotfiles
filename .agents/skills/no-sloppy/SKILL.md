---
name: no-sloppy
description: Deterministic anti-slop pass for Python. After writing or editing Python code, run the bundled checker before declaring the work done; it lints just the changed lines with an opinionated ruff overlay plus custom slop rules. Use for any non-trivial Python change.
---

# No-sloppy (Python)

A deterministic slop check for Python code you just wrote, in two layers:

1. **Ruff overlay** -- [ruff.toml](src/no_sloppy/ruff.toml) selects `ALL` rules with a short, deliberate ignore list and `max-args = 8`. The checker passes it via `--config`, so the same standard applies regardless of the project's own lint setup.
2. **Custom rules** -- slop patterns ruff can't express (redundant comments, naming slop, silent fallbacks, ...). One module per rule in [src/no_sloppy/rules/](src/no_sloppy/rules/), auto-discovered at runtime. Current rules:
  - `SLOP001` banner/separator comments
  - `SLOP002` `from __future__ import annotations`
  - `SLOP003` type aliases assigned without the `type` keyword
  - `SLOP004` str-keyed dict args/returns (error if `Any`/`object` values, warning otherwise; abstract `Mapping` types exempt)
  - `SLOP005` inlineable functions: collapses to one 120-column line, or called once with a body under 5 lines (warning; decorated functions, dunders, and stubs exempt)
  - `SLOP006` non-ASCII characters: emoji, smart punctuation, and Unicode decoration are errors; non-ASCII letters/digits (possibly legitimate text) are warnings; accented Latin letters are allowed outright
  - `SLOP007` changelog/diff-narration comments ("now uses", "previously", "kept for backwards compatibility") (heuristic)
  - `SLOP008` isinstance/type() checks made vacuous by the parameter annotation (warning; union narrowing is not flagged)
  - `SLOP009` entire function body wrapped in a broad, swallowing try/except (warning; narrow or re-raising handlers exempt)
  - `SLOP010` import fallback shims (`except ImportError: x = None` or a fallback import) (warning; re-raising handlers exempt)
  - `SLOP011` marketing adjectives in comments/docstrings ("robust", "production-ready", "battle-tested") (heuristic)

No runtime dependencies; needs `git` and `ruff` (falls back to `uvx ruff`).

## Usage

The checker is normally on PATH as `no-sloppy`, installed with `uv tool install -e <skill-dir>` (setup.sh does this on new machines; editable, so rule edits in the repo apply immediately). Without installing, run `uvx --from <skill-dir> no-sloppy`. Run from anywhere inside the repo being worked on:

```
no-sloppy              # changed lines vs HEAD (default)
no-sloppy --base main  # diff against another ref
no-sloppy --all        # changed files, whole-file findings
no-sloppy --strict     # warnings also fail the check
no-sloppy PATH...      # explicit files/dirs, whole-file (dirs recurse)
```

Findings have three levels: **errors** fail the check (exit 1); **warnings** are informational (exit 0, unless `--strict`); **heuristics** are best-effort pattern matches with known false positives -- they never affect the exit code and `--strict` does not promote them. Judge each heuristic finding rather than fixing mechanically. For ruff codes, the `WARN_CODES` table in [check.py](src/no_sloppy/check.py) decides between error and warning (stylistic families `D`, `ANN`, `E501`, `TD` warn); custom rules pick their own level, listed above. The default mode reports only findings on lines changed relative to `--base` (staged, unstaged, and untracked), so output is about the code just written, not the surrounding codebase.

## Interpreting findings

- Fix errors in code you wrote; treat warnings as advisory style feedback worth a look. Don't silence findings with `noqa` -- a suppression is only acceptable when the rule is genuinely wrong for the case, narrowly scoped, and commented with why.
- Both layers honor `# noqa` comments: `# noqa: SLOP001` (or any ruff code) suppresses that rule on the line; a bare `# noqa` suppresses everything. Prefer explicit codes -- a bare `# noqa` that only suppresses SLOP rules looks unused to ruff and trips RUF100.
- This overlay is advisory for your diff; the project's own lint config still governs the codebase. Where the two disagree on style (not correctness), the project wins -- follow its config and ignore the overlay finding.
- Whole-file rules (missing module docstring, implicit namespace package) anchor to line 1 and only surface for new files or under `--all`. That is intentional.

## Adding custom rules

Create a new module in `src/no_sloppy/rules/`--it is imported automatically, one rule per file. Each rule is a function `(path, source, tree, tokens) -> list[Finding]` decorated with `@rule` (imported `from . import Finding, rule`), where `tree` is the `ast` module tree and `tokens` the `tokenize` stream (comments included). Use the next free `SLOPxxx` code and list it in this file. Findings default to the error level; pass `level="warn"` to `Finding` for advisory rules, or `level="heuristic"` for pattern-matched rules where false positives are expected. Favor precision over recall: the consumer is an LLM mid-task, and noisy rules get ignored or cause fix-churn. Findings are automatically filtered to changed lines like ruff's. 

See [src/no_sloppy/rules/banner_comments.py](src/no_sloppy/rules/banner_comments.py) for the template.
