# Python

- Avoid dicts to represent structured data: new readers have no context for what the valid keys are, and it only adds scope for typos. Prefer a `TypedDict`, a Pydantic model, a dataclass, etc.
- Prefer the walrus operator instead of two separate lines.
- Never use older Python syntax. Prefer 3.12+ generics over `TypeVar`; prefer `X | None` over `Optional[X]`; avoid `from __future__ import annotations` unless you absolutely need it.
- Outside of small or one-off scripts, API requests and responses must both be strongly-typed.
- Never catch blanket `Exception` unless there's a **very** good reason: if you're calling a library function, read the code to figure out what it can throw or use your knowledge
- If you have the `no-sloppy` skill (or the `no-sloppy` CLI is already in `PATH`), use it to check your code style.
