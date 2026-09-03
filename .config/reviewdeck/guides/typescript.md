---
name: TypeScript
languages: [typescript, javascript]
always: false
---
# TypeScript

Source: personal code-style rules (~/.agents/skills/code-style/references/typescript.md).

- [R1] Never use `any` to get past an error; it disables checking for everything it touches. Reach for `unknown` and narrow, a precise type, or a generic. `any` is acceptable only at a genuine external boundary, narrowly scoped.
- [R2] No non-null `!` assertions or `as` casts to silence the checker. Narrow with a type guard, `?.`, or a runtime check that also convinces the compiler.
- [R3] Model data with `type` aliases and discriminated unions; make illegal states unrepresentable rather than validating them at runtime. Use `interface` only for declaration merging or class contracts.
- [R4] Parse external data (API responses, config, env) at the boundary with the schema validator the repo already uses (zod, typebox); don't cast raw JSON to a type and hope. Inside the boundary, trust the types.
- [R5] Prefer `readonly` and immutable updates; avoid mutating shared inputs.
- [R6] Use `unknown` (not `any`) in `catch` and narrow before use. No empty catch, no catch-log-continue that hides failure.
- [R7] Use `??` and `?.` when you mean null/undefined, not `||` or manual guards: `0`, `""`, and `false` are valid values, not absence.
- [R8] No default exports for modules with a clear primary name; named exports keep imports consistent and renames safe.
- [R9] Don't reach for `enum`; prefer a union of string literals or an `as const` object unless the repo already standardizes on enums.
