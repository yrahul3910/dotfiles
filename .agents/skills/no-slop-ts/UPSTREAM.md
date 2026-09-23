# Upstream provenance

[plugin/](plugin/) is an owned fork of the anti-slop Oxlint plugin. Local edits are policy, not drift; update it with a reviewed three-way merge (upstream's `skills/install-anti-slop/references/update.md` describes the procedure), never by replacing the directory.

## Source

- Repository: https://github.com/dmmulroy/anti-slop
- Path: `skills/install-anti-slop/assets/anti-slop`
- Current baseline: `c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b` (2026-09-10), merged 2026-09-23
- Previous baseline: `6d538555cb151d4121ed51a27db81890eacf8ae9` (2026-08-18), verified as the base of the 2026-09-23 merge: every file without local edits matched it byte for byte
- Dependencies: `oxlint` and `@oxlint/plugins` 1.78.0, unchanged by the merge

## Not vendored

- `rules/require-readable-spacing.ts` and `vendor/eslint-stylistic/` (upstream paths): upstream's spacing rule requires a blank line before every `return`, `if`, loop, `switch`, and `try`, and between every pair of top-level statements. That contradicts the local layout policy in the `code-style` skill (short guards stack, short bodies stay tight), which `no-unpadded-blocks`, `no-excess-padding`, and `no-dense-runs` enforce instead. Its whitespace-only autofix is worth borrowing for the local rules later.

## Local additions

Paths below are under `plugin/`.

- `LICENSE`: upstream's license, kept beside the copy.
- `rules/no-unpadded-blocks.ts`, `rules/no-excess-padding.ts`, `rules/no-dense-runs.ts`, `shared/vertical-layout.ts`: blank-line policy from the `code-style` skill.
- `rules/no-pseudo-wraps.ts`, `shared/line-length.ts`, `shared/prose-wraps.ts`: premature wrapping in code and prose.
- `rules/no-thin-jsdoc.ts`: one-line JSDoc on non-trivial functions.

## Local changes to upstream files

Paths below are under `plugin/`.

- `index.ts`: registers the local rules and leaves out `require-readable-spacing`.
- `rules/no-runtime-typeof.ts`: adds the `allowInTypeGuards` option, read once per file through a type guard. Upstream's existence-probe exemption (`typeof x === "undefined"`) is merged in.
- `rules/no-shape-in-symbol-names.ts`: flags only structural suffixes (`UserShape`, `user_shape`, `USER_SHAPE`) instead of any `shape` substring. Upstream's exemption for members of other values (`schema.innerShape`) is merged in.
- `shared/lexical-type-parameters.ts`: walks child fields with `Object.entries` and the visitor keys instead of an `as unknown as Record` cast, and documents `lexicalTypeParameterNames`.
- `shared/dictionary-types.ts`: renames `arguments_` to `typeArguments`.

## Local configuration

In `oxlintrc.json`: `no-unknown-parameters`, `no-unknown-returns`, and `no-unknown-type-aliases` stay off (`unknown` is the honest type for unvalidated values); `no-array-filter-map` is off (`.filter().map()` is idiomatic, and the suggested rewrites trade readability for a gain that matters only on large arrays); `no-runtime-typeof` allows type guards; `no-reduce-accumulator-copy` runs at error with its native companion `oxc/no-accumulating-spread`.

In `oxlintrc.effect.json`: only `no-service-constructor-imports` is enabled. `no-manual-effect-error-tag`, `no-manual-tag-comparison`, `no-manual-tagged-construction`, and `prefer-effect-match` are vendored and registered but off pending a decision.

## Pending

- The vendored upstream code does not yet meet the local layout rules (missing blank lines, dense runs, wraps) and has a few other self-check findings (inline `typeof` in helpers, an `as unknown as Record` cast in `plugin/shared/type-alias-resolution.ts`, `arguments_` there too, two thin JSDoc comments). Cleaning them up is a separate, mechanical change; do it as its own commit so a future merge can recognize it.

## Verification (2026-09-23)

`bun test tests/` passes (28 tests), including `tests/vendored.test.ts`, which pins the merged behavior: upstream's `typeof` existence-probe and borrowed-member exemptions, the local `allowInTypeGuards` option and suffix-only name matching, the accumulator-copy rules at error, `no-array-filter-map` off, and the Effect overlay loading with the new rules registered.
