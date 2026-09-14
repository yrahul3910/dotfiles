---
name: Python
languages: [python]
always: false
---

# Python

Sources: personal code-style rules (`~/.agents/skills/code-style/references/python.md`) and no-sloppy (`~/.agents/skills/no-sloppy/SKILL.md`).

- [R1] Avoid dicts for structured data: new readers have no context for the valid keys, and typos hide. Prefer a TypedDict, Pydantic model, or dataclass. Genuine key/value collections are different; abstract Mapping types are exempt from the custom signature rule. String-keyed dict signatures with Any/object values produce errors, while other value types produce advisory warnings.
- [R2] Prefer the walrus operator over an assignment followed by a separate check when it collapses two lines into one clear one.
- [R3] Use modern syntax within the project's supported Python version: prefer Python 3.12+ generics over TypeVar, `type Alias = ...` for type aliases, and `X | None` over `Optional[X]`. Avoid `from __future__ import annotations` unless genuinely needed. SLOP002 flags that import unconditionally; retain a necessary import only with a concrete reason and a narrowly scoped, explained suppression rather than changing annotation behavior to satisfy the checker.
- [R4] Outside of small one-off scripts, API requests and responses must both be strongly typed.
- [R5] Never catch blanket `Exception` (or bare `except:`) without a very good reason; figure out what the callee can actually raise and catch that.
- [R6] Don't hide missing dependencies behind import fallback shims. Optional dependency support needs an actual requirement and defined behavior when unavailable; don't silently assign None or load a substitute to conceal an installation failure. The checker warning alone doesn't establish whether optional support is justified.
- [R7] Trust parameter annotations rather than repeating vacuous isinstance/type checks. Keep checks that genuinely narrow a union or validate external data.
- [R8] Treat inlineable-function warnings as prompts to inspect purpose, not orders to inline. Retain helpers that explain non-obvious intent, reduce nesting, or enable meaningful testing or composition.
