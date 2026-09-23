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
  - `SLOP005` inlineable functions: a pass-through that only forwards its own parameters to another call, or a function called once in its module with a body under 5 lines (warning; methods, decorated functions, dunders, and stubs exempt; a short function that does its own work is never flagged for being short)
  - `SLOP006` non-ASCII characters: emoji, smart punctuation, and Unicode decoration are errors; non-ASCII letters/digits (possibly legitimate text) are warnings; accented Latin letters are allowed outright
  - `SLOP007` changelog/diff-narration comments ("now uses", "previously", "kept for backwards compatibility") (heuristic)
  - `SLOP008` isinstance/type() checks made vacuous by the parameter annotation (warning; union narrowing is not flagged)
  - `SLOP009` entire function body wrapped in a broad, swallowing try/except (warning; narrow or re-raising handlers exempt)
  - `SLOP010` import fallback shims (`except ImportError: x = None` or a fallback import) (warning; re-raising handlers exempt)
  - `SLOP011` marketing adjectives in comments/docstrings ("robust", "production-ready", "battle-tested") (heuristic)
  - `SLOP012` a multi-line block (`if`/`for`/`while`/`try`/`with`/`match`/`def`/`class`) with no blank line before or after it. Short guards (an `if` or loop without `else` whose header and single simple body statement fit on one line each) are exempt, as are `@overload` stacks, and a docstring never needs a blank line after it. A comment directly above a block belongs to it: the finding anchors on the comment, and a gap holding only a comment still counts as missing
  - `SLOP013` one-line docstring on a function that is 20+ lines long or has 2+ `raise` sites (warning). A module's only public function is exempt when the module docstring has a body beyond its summary line, since that docstring is the function's documentation
  - `SLOP014` unnecessary code continuations, plus premature wrapping in docstrings and prose comments, at least 20 columns below the configured linter limit (120 if none is configured) (error). One finding per statement or paragraph, spanning all of its lines
  - `SLOP015` blank lines that separate nothing: directly under a header, directly above `elif`/`else`/`except`/`finally`, between a comment and its code, two in a row inside a function or class, or anywhere in a function or control-flow body of at most three one-line simple statements (error; module level follows PEP 8)
  - `SLOP016` more than eight statements in a row without a blank line, unless they are uniform (all imports, all assignments, all asserts, or all calls on one root such as `parser.add_argument`) (warning)
  - `SLOP017` an assignment directly followed by an `if` whose test starts with that name (`x = f()` / `if x is None:`); bind it with `if (x := f()) is None:`, or inline the expression when the test is its only read. Function scope only, and skipped when the rewrite would be unsafe (the name read behind `and`/`or`), unreadable (a conditional-expression value, a blank line separating the two, a value that reads the name it rebinds), or would need a wrap (error)

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

Findings have three levels: **errors** fail the check (exit 1); **warnings** are informational (exit 0, unless `--strict`); **heuristics** are best-effort pattern matches with known false positives -- they never affect the exit code and `--strict` does not promote them. Judge each heuristic finding rather than fixing mechanically. For ruff codes, the `WARN_CODES` table in [check.py](src/no_sloppy/check.py) decides between error and warning (stylistic families `D`, `ANN`, `E501`, `TD` warn); custom rules pick their own level, listed above. The default mode reports only findings that touch lines changed relative to `--base` (staged, unstaged, and untracked), so output is about the code just written, not the surrounding codebase. A multi-line finding (a wrapped statement, a prose paragraph) is reported when any of its lines changed, and prints all of its lines, eliding the middle of long spans.

## Interpreting findings

- Apply [code-style's line-wrapping rule](../code-style/SKILL.md#line-wrapping) to code, docstrings, comments, and documentation. `SLOP014` checks complete logical code lines, including calls, signatures, imports, and expressions. It also checks docstrings and prose comments for lines ending at least 20 columns early while the next word still fits. Structural documentation breaks, literal multiline content, blank-line grouping, literal container layouts, and comprehensions with a filter or second `for` that break only between clauses remain intact. A single comment on a wrapped statement's first or last line does not justify the wrap; it moves to the end of the joined line. Project-required formatting is a valid exception; a trailing comma, personal preference, and existing pseudo-wraps are not.
- Review Markdown manually. Fill each prose line to the active Markdown linter's limit before wrapping at a word boundary. With no applicable limit, keep the entire paragraph or list item on one source line, regardless of length. Do not use the 120-column fallback for Markdown; the editor soft-wraps it.
- `SLOP014` uses the nearest explicit Ruff, Flake8, or Pylint line limit, including Ruff's `extend` chain and `lint.pycodestyle.max-line-length`. With no explicit limit, it uses 120. For other lint tools, check their configured threshold during review. The overlay's bundled 120-column config does not override the project's threshold for this rule.
- Fix errors in code you wrote; treat warnings as advisory style feedback worth a look. Don't silence findings with `noqa` -- a suppression is only acceptable when the rule is genuinely wrong for the case, narrowly scoped, and commented with why.
- SLOP015 anchors on the blank line to delete, so it cannot carry a `# noqa`; if one is genuinely wrong, restructure rather than suppress. Both layers honor `# noqa` comments: `# noqa: SLOP001` (or any ruff code) suppresses that rule on the line; a bare `# noqa` suppresses everything. A SLOP finding that spans several lines is suppressed by a `# noqa` on any of them, such as a wrapped call's closing line. Prefer explicit codes -- a bare `# noqa` that only suppresses SLOP rules looks unused to ruff and trips RUF100.
- This overlay is advisory for your diff; the project's own lint config still governs the codebase. Where the two disagree on style (not correctness), the project wins -- follow its config and ignore the overlay finding.
- Whole-file rules (missing module docstring, implicit namespace package) anchor to line 1 and only surface for new files or under `--all`. That is intentional.

## Adding custom rules

Create a new module in `src/no_sloppy/rules/`--it is imported automatically, one rule per file. The blank-line rules (SLOP012, SLOP015, SLOP016) share a layout model in [src/no_sloppy/layout.py](src/no_sloppy/layout.py): bodies of sibling statements, their headers and clause boundaries, and each statement's visual start including attached comments. Each rule is a function `(path, source, tree, tokens) -> list[Finding]` decorated with `@rule` (imported `from . import Finding, rule`), where `tree` is the `ast` module tree and `tokens` the `tokenize` stream (comments included). Use the next free `SLOPxxx` code and list it in this file. Findings default to the error level; pass `level="warn"` to `Finding` for advisory rules, or `level="heuristic"` for pattern-matched rules where false positives are expected. Favor precision over recall: the consumer is an LLM mid-task, and noisy rules get ignored or cause fix-churn. Findings are automatically filtered to changed lines like ruff's. 

See [src/no_sloppy/rules/banner_comments.py](src/no_sloppy/rules/banner_comments.py) for the template.
