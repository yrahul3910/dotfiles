# TypeScript

- Never use `any` to get past an error; it disables checking for everything it
  touches. Reach for `unknown` and narrow, a precise type, or a generic. `any`
  is acceptable only at a genuine external boundary and narrowly scoped.
- No non-null `!` assertions or `as` casts to silence the checker. Narrow with
  a type guard, `?.`, or a runtime check that also convinces the compiler. A
  cast that's actually wrong is a bug the compiler would have caught.
- Prefer `type` aliases and discriminated unions to model data; make illegal
  states unrepresentable rather than validating them at runtime. Reach for an
  `interface` when you need declaration merging or a class contract.
- Parse external data (API responses, config, env) at the boundary with a
  schema validator the repo already uses (zod, typebox, etc.); don't cast raw
  JSON to a type and hope. Inside the boundary, trust the types.
- Prefer `readonly` and immutable updates; avoid mutating shared inputs.
- Prefer `unknown` over `any` in `catch`; narrow before use. Don't swallow: no
  empty `catch`, no catch-log-continue that hides failure.
- Use `??` and `?.` over `||`/manual guards when you mean null/undefined, not
  falsy. `0`, `""`, and `false` are valid values, not absence.
- No default exports for modules with a clear primary name; prefer named
  exports so imports stay consistent and renames are safe.
- Don't reach for enums; prefer union-of-string-literals or `as const` objects
  unless the repo already standardizes on `enum`.
