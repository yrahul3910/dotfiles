# Python

- Avoid dicts to represent structured data: new readers have no context for
  what the valid keys are, and it only adds scope for typos. Prefer a
  `TypedDict`, a Pydantic model, a dataclass, etc.
