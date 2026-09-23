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
- Every vendored file: blank lines added wherever the local layout rules require them, and statements that fit within 120 columns joined onto one line. These are layout-only changes, made in their own commit so a future merge can tell them apart.
- `rules/require-safety-comment-for-type-assertion.ts`: parses its `markers` option through type guards (`isSafetyCommentOptions`, `isMarker`) instead of inline `typeof` checks, with the same behavior.
- `shared/array-method.ts`: a local `isStringLiteral` guard replaces an inline `typeof` check, and `isKnownArrayExpression` documents what counts as array evidence.
- `effect/shared/tagged-values.ts`: `propertyName` uses the file's own `isStringLiteral` guard instead of an inline `typeof` check.
- `shared/type-alias-resolution.ts`: looks child fields up in a map built with `Object.entries` instead of an `as unknown as Record` cast (keeping visitor-key order), renames `arguments_` to `typeArguments`, and documents `resolvedTypeMatches`.
- `effect/rules/prefer-effect-match.ts`: `isLiteral` moves to module scope, since it captures nothing.

## Local configuration

In `oxlintrc.json`: `no-unknown-parameters`, `no-unknown-returns`, and `no-unknown-type-aliases` stay off (`unknown` is the honest type for unvalidated values); `no-array-filter-map` is off (`.filter().map()` is idiomatic, and the suggested rewrites trade readability for a gain that matters only on large arrays); `no-runtime-typeof` allows type guards; `no-reduce-accumulator-copy` runs at error with its native companion `oxc/no-accumulating-spread`.

In `oxlintrc.effect.json`: `no-service-constructor-imports`, `no-manual-effect-error-tag`, and `no-manual-tagged-construction` run at error; they catch real type-precision and identity mistakes (a broad handler that branches on `_tag` keeps the full error type; a hand-built `{ _tag: ... }` skips the value's constructor). `no-manual-tag-comparison` and `prefer-effect-match` are off: a `switch` on `_tag` with a `never` check and a chained literal ternary are acceptable house style, not mistakes.

## Pending

Nothing.

## Verification (2026-09-23)

`bun test tests/` passes (29 tests), including `tests/vendored.test.ts`, which pins the merged behavior: upstream's `typeof` existence-probe and borrowed-member exemptions, the local `allowInTypeGuards` option and suffix-only name matching, the safety-comment `markers` option, the accumulator-copy rules at error, `no-array-filter-map` off, and the Effect overlay's enabled and disabled rules. The whole skill (`check.ts`, `plugin/`, `tests/`) is clean under its own check.
