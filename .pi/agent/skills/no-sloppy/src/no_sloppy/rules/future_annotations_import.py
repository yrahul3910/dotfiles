"""SLOP002: no `from __future__ import annotations`."""

import ast
from typing import TYPE_CHECKING

from . import Finding, rule

if TYPE_CHECKING:
    import tokenize
    from pathlib import Path


@rule
def future_annotations_import(
    path: Path,
    _source: str,
    tree: ast.Module,
    _tokens: list[tokenize.TokenInfo],
) -> list[Finding]:
    """Flag the future-annotations import; import annotation types for real."""
    return [
        Finding(
            path,
            node.lineno,
            node.col_offset + 1,
            "SLOP002",
            "`from __future__ import annotations` is unnecessary on modern Python",
            end_line=node.end_lineno,
            end_col=None if node.end_col_offset is None else node.end_col_offset + 1,
        )
        for node in tree.body
        if isinstance(node, ast.ImportFrom)
        and node.module == "__future__"
        and any(alias.name == "annotations" for alias in node.names)
    ]
