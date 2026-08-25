"""SLOP010: no import fallback shims unless optional support was asked for.

`try: import x / except ImportError: x = None` (or a fallback import) is
optional-dependency handling that rarely matches the actual requirement --
it defers the failure from import time, where the message is clear, to
first use, where it isn't. Import the dependency plainly and fail loudly.
Handlers that re-raise (e.g. with an install hint) stay silent.
"""

import ast
from typing import TYPE_CHECKING

from . import Finding, handler_catches, handler_swallows, rule

if TYPE_CHECKING:
    import tokenize
    from pathlib import Path

IMPORT_ERRORS = frozenset({"ImportError", "ModuleNotFoundError"})


@rule
def import_fallbacks(
    path: Path,
    _source: str,
    tree: ast.Module,
    _tokens: list[tokenize.TokenInfo],
) -> list[Finding]:
    """Flag try/except ImportError fallback shims around imports."""
    return [
        Finding(
            path,
            node.lineno,
            node.col_offset + 1,
            "SLOP010",
            "Import fallback shim; import the dependency plainly and fail loudly "
            "unless optional support was actually requested",
            end_line=node.lineno,
            end_col=node.col_offset + len("try:") + 1,
            level="warn",
        )
        for node in ast.walk(tree)
        if isinstance(node, ast.Try)
        and node.body
        and all(isinstance(stmt, ast.Import | ast.ImportFrom) for stmt in node.body)
        and any(handler_catches(h, IMPORT_ERRORS) and handler_swallows(h) for h in node.handlers)
    ]
