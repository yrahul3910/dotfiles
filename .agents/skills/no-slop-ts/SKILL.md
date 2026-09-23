---
name: no-slop-ts
description: Deterministic anti-slop pass for TypeScript/JavaScript. After writing or editing TS/JS code, run the bundled checker before declaring the work done; it lints just the changed lines with an oxlint overlay plus the vendored anti-slop rules. Use for any non-trivial TypeScript or JavaScript change.
---

# No-slop-ts (TypeScript/JavaScript)

A deterministic slop check for TS/JS code you just wrote--the sibling of the `no-sloppy` skill for Python. Two layers, both driven by [oxlintrc.json](oxlintrc.json) so the same standard applies regardless of the project's own lint setup:

1. **Oxlint overlay** - the `correctness` category at error and `suspicious` at warn.
2. **anti-slop rules** - the oxlint jsPlugin from [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop), vendored in [plugin/](plugin/). Twelve generic rules run at error; they reject low-evidence typing patterns:

   - `no-chained-type-assertions` -- `x as object as User` fabricates evidence
   - `no-conditional-empty-object-spread` -- `...(cond ? { x } : {})`
   - `no-known-value-widening` -- explicit broad types that discard known value evidence (use inference or `satisfies`)
   - `no-module-mocking` -- `vi.mock`/`jest.mock`; use real dependency interfaces
   - `no-object-parameters` -- the broad `object` type on inputs
   - `no-reflect-apply` / `no-reflect-get` -- use typed calls/access
   - `no-runtime-typeof` -- parse at the I/O boundary instead of ad hoc `typeof` narrowing; the local config enables `allowInTypeGuards` for explicitly annotated type predicates and assertion functions. Ordinary nested functions are not exempt; type-level `typeof` is unaffected.
   - `no-shape-in-symbol-names` -- no structural suffixes (`UserShape`, `user_shape`, `USER_SHAPE`). Standalone `Shape`/`shape` and names such as `shapeArea`, `reshape`, and `misshapen` are allowed.
   - `no-unsafe-dictionary-type` -- `Record<string, unknown|any|object|{}>`
   - `no-widen-then-assert` -- widening a known value and asserting it back
   - `require-safety-comment-for-type-assertion` -- each non-`as const` assertion needs a `// SAFETY: <checked invariant>` comment.

   The upstream `no-unknown-parameters`, `no-unknown-returns`, and `no-unknown-type-aliases` rules remain vendored but are disabled locally. `unknown` is the type-safe choice when a value still needs validation or narrowing; the checker should reject fabricated evidence, not honest uncertainty.

<<<<<<< HEAD
||||||| parent of aaa3ef6 (feat(no-slop-ts): rework padding rules and add excess-padding checks)
   Two local rules, not from upstream, enforce the layout half of the `code-style` skill:

   - `no-unpadded-blocks` (error) -- every multi-line `if`, loop, `try`, `switch`, function, class, interface, enum, namespace, class member with a body, or function-valued `const` needs a blank line before and after it. Short guards whose whole body is one simple statement are exempt, as is the first or last member of a body.
   - `no-thin-jsdoc` (warn) -- a one-line JSDoc on a function that is 20+ lines long or throws in 2+ places; document the contract instead.

=======
   Four local rules, not from upstream, enforce the layout half of the `code-style` skill:

   - `no-unpadded-blocks` (error) -- every multi-line `if`, loop, `try`, `switch`, function, class, interface, enum, namespace, object `type`, class member with a body, or statement holding a multi-line callback (`items.forEach(...)`, `describe(...)`, `new Promise(...)`, a function-valued `const`) needs a blank line before and after it. Short guards (an `if` without `else`, or a loop, whose header and single body statement fit on one line each) are exempt, as are an implementation directly under its overload signatures and the first or last member of a body. A comment directly above a block belongs to it: the finding anchors on the comment, and a gap holding only a comment still counts as missing.
   - `no-excess-padding` (error) -- blank lines that separate nothing: directly inside a body's `{` or `}` (or under `case x:`), between a comment and its code, two in a row, or anywhere in a function or control-flow block of at most three one-line simple statements. The finding anchors on the blank line to delete.
   - `no-dense-runs` (warn) -- more than eight statements in a row without a blank line, unless they are uniform (all imports, all declarations or assignments, or all calls on one root such as `app.use` or `expect`).
   - `no-thin-jsdoc` (warn) -- a one-line JSDoc on a function that is 20+ lines long or throws in 2+ places; document the contract instead.

>>>>>>> aaa3ef6 (feat(no-slop-ts): rework padding rules and add excess-padding checks)
3. **Effect rules (opt-in)** -- `anti-slop-effect/no-service-constructor-imports` via [oxlintrc.effect.json](oxlintrc.effect.json), enabled automatically when the repo's root package.json declares a direct `effect` dependency (`--effect`/`--no-effect` override).

Needs `git` and `bun`; oxlint comes from this skill's own node_modules (`bun install` here once -- setup.sh does this on new machines).

## Usage

The checker is normally on PATH as `no-slop-ts` (setup.sh symlinks [check.ts](check.ts) into ~/.local/bin). Otherwise run `<skill-dir>/check.ts`. Run from anywhere inside the repo being worked on:

```
no-slop-ts              # changed lines vs HEAD (default)
no-slop-ts --base main  # diff against another ref
no-slop-ts --all        # changed files, whole-file findings
no-slop-ts --strict     # warnings also fail the check
no-slop-ts PATH...      # explicit files/dirs, whole-file (dirs recurse)
```

<<<<<<< HEAD
Findings have two levels: **errors** fail the check (exit 1); **warnings** are informational (exit 0, unless `--strict`). The level comes from the severity in [oxlintrc.json](oxlintrc.json)--anti-slop rules and the correctness category are errors, the suspicious category warns. The default mode reports only findings on lines changed relative to `--base` (staged, unstaged, and untracked), so output is about the code just written, not the surrounding codebase. Declaration files (`.d.ts`) are skipped.
||||||| parent of aaa3ef6 (feat(no-slop-ts): rework padding rules and add excess-padding checks)
Findings have two levels: **errors** fail the check (exit 1); **warnings** are informational (exit 0, unless `--strict`). The level comes from the severity in [oxlintrc.json](oxlintrc.json)--anti-slop rules and the correctness category are errors, the suspicious category and `no-thin-jsdoc` warn. The default mode reports only findings on lines changed relative to `--base` (staged, unstaged, and untracked), so output is about the code just written, not the surrounding codebase. Declaration files (`.d.ts`) are skipped.
=======
Findings have two levels: **errors** fail the check (exit 1); **warnings** are informational (exit 0, unless `--strict`). The level comes from the severity in [oxlintrc.json](oxlintrc.json)--anti-slop rules and the correctness category are errors; the suspicious category, `no-dense-runs`, and `no-thin-jsdoc` warn. The default mode reports only findings on lines changed relative to `--base` (staged, unstaged, and untracked), so output is about the code just written, not the surrounding codebase. Declaration files (`.d.ts`) are skipped.
>>>>>>> aaa3ef6 (feat(no-slop-ts): rework padding rules and add excess-padding checks)

## Interpreting findings

- Fix errors in code you wrote; treat warnings as advisory. Don't silence findings with disable comments -- a suppression (`// oxlint-disable-next-line anti-slop/no-runtime-typeof`) is only acceptable when the rule is genuinely wrong for the case, narrowly scoped, and commented with why.
- A necessary type assertion needs a preceding `// SAFETY: ...` comment stating the checked invariant. The checker only recognizes the marker; review whether the invariant actually justifies the assertion. First try to remove the assertion: prefer inference, `as const`, `satisfies`, named owner contracts, and parsing at the I/O boundary. A safety comment does not exempt chained assertions.
- This overlay is advisory for your diff; the project's own lint config still governs the codebase. Where the two disagree on style (not correctness), the project wins--follow its config and ignore the overlay finding.

## Maintaining the vendored plugin

<<<<<<< HEAD
[plugin/](plugin/) is a vendored copy of upstream's `skills/install-anti-slop/assets/anti-slop` (commit `6d53855`, rules written against oxlint 1.78.0--keep `oxlint` and `@oxlint/plugins` in [package.json](package.json) at the same version as each other). Upstream intends the copy to be owned and edited; tune rules here rather than re-syncing blindly. New rules follow upstream's shape: a `defineRule` module under [plugin/rules/](plugin/rules/), registered in [plugin/index.ts](plugin/index.ts) and enabled in [oxlintrc.json](oxlintrc.json). The checker excludes this skill's own directory in changed-lines mode, but `check.ts` stays clean under its own check (`no-slop-ts <skill-dir>/check.ts`).
||||||| parent of aaa3ef6 (feat(no-slop-ts): rework padding rules and add excess-padding checks)
[plugin/](plugin/) is a vendored copy of upstream's `skills/install-anti-slop/assets/anti-slop` (commit `6d53855`, rules written against oxlint 1.78.0--keep `oxlint` and `@oxlint/plugins` in [package.json](package.json) at the same version as each other). Upstream intends the copy to be owned and edited; tune rules here rather than re-syncing blindly. New rules follow upstream's shape: a `defineRule` module under [plugin/rules/](plugin/rules/), registered in [plugin/index.ts](plugin/index.ts) and enabled in [oxlintrc.json](oxlintrc.json); `no-unpadded-blocks` and `no-thin-jsdoc` are local additions in that shape. The checker excludes this skill's own directory in changed-lines mode, but `check.ts` stays clean under its own check (`no-slop-ts <skill-dir>/check.ts`).
=======
[plugin/](plugin/) is a vendored copy of upstream's `skills/install-anti-slop/assets/anti-slop` (commit `6d53855`, rules written against oxlint 1.78.0--keep `oxlint` and `@oxlint/plugins` in [package.json](package.json) at the same version as each other). Upstream intends the copy to be owned and edited; tune rules here rather than re-syncing blindly. New rules follow upstream's shape: a `defineRule` module under [plugin/rules/](plugin/rules/), registered in [plugin/index.ts](plugin/index.ts) and enabled in [oxlintrc.json](oxlintrc.json); `no-unpadded-blocks`, `no-excess-padding`, `no-dense-runs`, and `no-thin-jsdoc` are local additions in that shape, and the three blank-line rules share their layout model in [plugin/shared/vertical-layout.ts](plugin/shared/vertical-layout.ts). Run the rule tests with `bun test tests/`. The checker excludes this skill's own directory in changed-lines mode, but `check.ts` stays clean under its own check (`no-slop-ts <skill-dir>/check.ts`).
>>>>>>> aaa3ef6 (feat(no-slop-ts): rework padding rules and add excess-padding checks)
