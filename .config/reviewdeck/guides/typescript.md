---
name: TypeScript
languages: [typescript, javascript]
always: false
---

# TypeScript

Sources: personal code-style rules (`~/.agents/skills/code-style/references/typescript.md`) and the active no-slop-ts policy (`~/.agents/skills/no-slop-ts/SKILL.md` and `~/.agents/skills/no-slop-ts/oxlintrc.json`).

- [R1] Never use `any` to get past an error; it disables checking for everything it touches. Reach for `unknown` and narrow, a precise type, or a generic. `any` is acceptable only at a genuine external boundary, narrowly scoped.
- [R2] No non-null `!` assertions or type assertions to silence the checker. Prefer inference, narrowing, or `satisfies`. A necessary non-`as const` assertion needs a preceding `// SAFETY: ...` comment stating the checked invariant. Verify that the invariant actually justifies the assertion; the marker alone proves nothing. No chained assertions, even with a safety comment.
- [R3] Prefer `type` aliases and discriminated unions to model data; make illegal states unrepresentable rather than validating them at runtime. Use `interface` when declaration merging or class contracts call for it.
- [R4] Parse external data (API responses, config, env) at the boundary with the schema validator the repo already uses (zod, typebox); don't cast raw JSON to a type and hope. Inside the boundary, trust the types.
- [R5] Prefer `readonly` and immutable updates; avoid mutating shared inputs.
- [R6] Use `unknown` (not `any`) in `catch` and narrow before use. No empty catch, no catch-log-continue that hides failure.
- [R7] Use `??` and `?.` when you mean null/undefined, not `||` or manual guards: `0`, `""`, and `false` are valid values, not absence.
- [R8] No default exports for modules with a clear primary name; named exports keep imports consistent and renames safe.
- [R9] Don't reach for `enum`; prefer a union of string literals or an `as const` object unless the repo already standardizes on enums.
- [R10] Preserve known type information. Prefer inference or `satisfies` over a broad annotation that discards it; don't widen a value and assert it back later.
- [R11] Use named contracts or typed collections rather than broad `object` parameters or dictionaries with `any`, `unknown`, `object`, or empty-object values. Honest `unknown` parameters, returns, and aliases are allowed when validation is still required; don't replace them with fabricated types to avoid a finding.
- [R12] Test through real dependency interfaces and pass dependencies explicitly where needed. Don't replace modules with Jest/Vitest module mocks (`mock`, `doMock`, or `unstable_mockModule`).
- [R13] Use typed property access and calls rather than `Reflect.get` or `Reflect.apply` to bypass contracts.
- [R14] Parse external data at its boundary. Runtime `typeof` is allowed inside explicitly annotated type predicates or assertion functions that validate a value; don't scatter ad hoc checks through typed internal code. This exemption doesn't extend to ordinary functions nested inside a guard. Type-level `typeof` is unaffected.
- [R15] Avoid conditional object spreads with an empty-object branch (`...(condition ? { x } : {})`). Make the conditional construction explicit and preserve the distinction between an absent property and a property set to `undefined`.
- [R16] Name symbols for their domain role, not with structural suffixes such as `UserShape`, `user_shape`, or `USER_SHAPE`. Standalone domain names such as `Shape`, and names such as `shapeArea` or `reshape`, are allowed.
- [R17] When the Effect rules are enabled, consume services through their context or owning Layer rather than importing relative `makeX` constructors into runtime modules. The checker exempts `.test`/`.spec` files and matches import names, not actual Effect types; verify that a reported import really is a service constructor.
