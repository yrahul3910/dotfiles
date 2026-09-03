---
name: Python
languages: [python]
always: false
---
# Python

Source: personal code-style rules (~/.agents/skills/code-style/references/python.md).

- [R1] Avoid dicts for structured data: new readers have no context for the valid keys, and typos hide. Prefer a TypedDict, Pydantic model, or dataclass.
- [R2] Prefer the walrus operator over an assignment followed by a separate check when it collapses two lines into one clear one.
- [R3] No legacy syntax: prefer Python 3.12+ generics over TypeVar, prefer `X | None` over `Optional[X]`, and avoid `from __future__ import annotations` unless genuinely needed.
- [R4] Outside of small one-off scripts, API requests and responses must both be strongly typed.
- [R5] Never catch blanket `Exception` (or bare `except:`) without a very good reason; figure out what the callee can actually raise and catch that.
