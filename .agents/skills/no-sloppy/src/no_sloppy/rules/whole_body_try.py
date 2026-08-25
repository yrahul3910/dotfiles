"""SLOP009: don't wrap an entire function body in a broad, swallowing try.

A function whose whole body is one `try` with an `except Exception` (or
bare except) that never re-raises can't fail visibly -- errors become
`None`s and log lines. Scope the try to the statements that can actually
fail. BLE001 flags the broad catch itself; this rule flags the shape.
Narrow handlers (`except FileNotFoundError: return DEFAULT`) are a
legitimate idiom and stay silent, as do handlers that re-raise.
"""

import ast
from typing import TYPE_CHECKING

from . import Finding, code_body, handler_catches, handler_swallows, rule

if TYPE_CHECKING:
    import tokenize
    from pathlib import Path

BROAD_EXCEPTIONS = frozenset({"Exception", "BaseException"})


@rule
def whole_body_try(
    path: Path,
    _source: str,
    tree: ast.Module,
    _tokens: list[tokenize.TokenInfo],
) -> list[Finding]:
    """Flag functions whose entire body is a broad try that swallows."""
    findings = []
    funcs = [node for node in ast.walk(tree) if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef)]

    for func in funcs:
        match code_body(func.body):
            case [ast.Try() | ast.TryStar() as try_stmt]:
                pass
            case _:
                continue

        if any(handler_catches(h, BROAD_EXCEPTIONS) and handler_swallows(h) for h in try_stmt.handlers):
            findings.append(
                Finding(
                    path,
                    try_stmt.lineno,
                    try_stmt.col_offset + 1,
                    "SLOP009",
                    f"Entire body of `{func.name}` is wrapped in a broad try that swallows; scope the "
                    "try to the statements that can fail and let errors propagate",
                    end_line=try_stmt.lineno,
                    end_col=try_stmt.col_offset + len("try:") + 1,
                    level="warn",
                )
            )

    return findings
