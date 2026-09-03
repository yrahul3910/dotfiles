---
name: anti-slop
description: Deterministic anti-slop pass for TypeScript/JavaScript. After writing or editing TS/JS code, run the bundled checker before declaring the work done; it lints just the changed lines with an oxlint overlay plus the vendored anti-slop rules. Use for any non-trivial TypeScript or JavaScript change.
---

# Anti-slop (TypeScript/JavaScript)

A deterministic slop check for TS/JS code you just wrote--the sibling of the `no-sloppy` skill for Python. Two layers, both driven by [oxlintrc.json](oxlintrc.json) so the same standard applies regardless of the
project's own lint setup:

1. **Oxlint overlay** - the `correctness` category at error and `suspicious` at warn.
2. **anti-slop rules** - the oxlint jsPlugin from [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop), vendored in [plugin/](plugin/). Twelve generic rules run at error; they reject low-evidence typing patterns:
  - `no-chained-type-assertions` -- `x as object as User` fabricates evidence
  - `no-conditional-empty-object-spread` -- `...(cond ? { x } : {})`
  - `no-known-value-widening` -- explicit broad types that discard known value evidence (use inference or `satisfies`)
  - `no-module-mocking` -- `vi.mock`/`jest.mock`; use real dependency seams
  - `no-object-parameters` -- the broad `object` type on inputs
  - `no-reflect-apply` / `no-reflect-get` -- use typed calls/access
  - `no-runtime-typeof` -- parse at the I/O boundary instead of ad hoc `typeof` narrowing
  - `no-shape-in-symbol-names` -- no `Shape` suffix names
  - `no-unsafe-dictionary-type` -- `Record<string, unknown|any|object|{}>`
  - `no-widen-then-assert` -- widening a known value and asserting it back
  - `require-safety-comment-for-type-assertion` -- each non-`as const` assertion needs a `// SAFETY: <checked invariant>` comment.

  The upstream `no-unknown-parameters`, `no-unknown-returns`, and `no-unknown-type-aliases` rules remain vendored but are disabled locally. `unknown` is the type-safe choice when a value still needs validation or narrowing; the checker should reject fabricated evidence, not honest uncertainty.
3. **Effect rules (opt-in)** -- `anti-slop-effect/no-service-constructor-imports` via [oxlintrc.effect.json](oxlintrc.effect.json), enabled automatically when the repo's root package.json declares a direct `effect` dependency (`--effect`/`--no-effect` override).

Needs `git` and `bun`; oxlint comes from this skill's own node_modules (`bun install` here once -- setup.sh does this on new machines).

## Usage

The checker is normally on PATH as `anti-slop` (setup.sh symlinks [check.ts](check.ts) into ~/.local/bin). Otherwise run `<skill-dir>/check.ts`. Run from anywhere inside the repo being worked on:

```
anti-slop              # changed lines vs HEAD (default)
anti-slop --base main  # diff against another ref
anti-slop --all        # changed files, whole-file findings
anti-slop --strict     # warnings also fail the check
anti-slop PATH...      # explicit files/dirs, whole-file (dirs recurse)
```

Findings have two levels: **errors** fail the check (exit 1); **warnings** are informational (exit 0, unless `--strict`). The level comes from the severity in [oxlintrc.json](oxlintrc.json)--anti-slop rules and the correctness category are errors, the suspicious category warns. The default mode reports only findings on lines changed relative to `--base` (staged, unstaged, and untracked), so output is about the code just written, not the surrounding codebase. Declaration files (`.d.ts`) are skipped.

## Interpreting findings

- Fix errors in code you wrote; treat warnings as advisory. Don't silence findings with disable comments -- a suppression (`// oxlint-disable-next-line anti-slop/no-runtime-typeof`) is only acceptable when the rule is genuinely wrong for the case, narrowly scoped, and commented with why.
- `require-safety-comment-for-type-assertion` is satisfied by a `// SAFETY: ...` comment stating the checked invariant immediately before the assertion--but first try to remove the assertion: prefer inference, `as const`, `satisfies`, named owner contracts, and parsing at the I/O boundary.
- This overlay is advisory for your diff; the project's own lint config still governs the codebase. Where the two disagree on style (not correctness), the project wins--follow its config and ignore the overlay finding.

## Maintaining the vendored plugin

[plugin/](plugin/) is a vendored copy of upstream's `skills/install-anti-slop/assets/anti-slop` (commit `6d53855`, rules written against oxlint 1.78.0--keep `oxlint` and `@oxlint/plugins` in [package.json](package.json) at the same version as each other). Upstream intends the copy to be owned and edited; tune rules here rather than re-syncing blindly. New rules follow upstream's shape: a `defineRule` module under [plugin/rules/](plugin/rules/), registered in [plugin/index.ts](plugin/index.ts) and enabled in [oxlintrc.json](oxlintrc.json). The checker excludes this skill's own directory in changed-lines mode, but `check.ts` stays clean under its own check (`anti-slop <skill-dir>/check.ts`).
