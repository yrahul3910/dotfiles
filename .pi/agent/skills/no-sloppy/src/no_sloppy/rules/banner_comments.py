"""SLOP001: no banner/separator comments."""

import re
import tokenize
from typing import TYPE_CHECKING

from . import Finding, rule

if TYPE_CHECKING:
    import ast
    from pathlib import Path

BANNER = re.compile(r"[-=~*#]{8,}")


@rule
def banner_comments(
    path: Path,
    _source: str,
    _tree: ast.Module,
    tokens: list[tokenize.TokenInfo],
) -> list[Finding]:
    """Flag decorative separator comments; structured code doesn't need them."""
    return [
        Finding(
            path,
            tok.start[0],
            tok.start[1] + 1,
            "SLOP001",
            "Banner/separator comment; delete it and let code structure speak",
            end_line=tok.end[0],
            end_col=tok.end[1] + 1,
        )
        for tok in tokens
        if tok.type == tokenize.COMMENT and BANNER.search(tok.string)
    ]
