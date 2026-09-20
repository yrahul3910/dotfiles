"""SLOP012: a multi-line block gets a blank line before and after it.

A compound statement that spans several lines (`if`, `for`, `while`,
`try`, `with`, `match`, `def`, `class`) is a logical block. Running it
straight into the statements around it produces a wall of code the reader
has to re-segment by eye. Short guards are the exception: an `if`, loop,
or `with` whose whole body is one simple statement (`if x is None:
return`) may sit against its neighbours. A docstring never needs a blank
line after it (D202 forbids one), and the clauses of one statement
(`else`, `except`, `case`) are not this rule's concern.
"""

import ast
from typing import TYPE_CHECKING

from . import Finding, rule

if TYPE_CHECKING:
    import tokenize
    from collections.abc import Iterator
    from pathlib import Path

KEYWORDS: dict[type[ast.stmt], str] = {
    ast.If: "if",
    ast.For: "for",
    ast.AsyncFor: "async for",
    ast.While: "while",
    ast.With: "with",
    ast.AsyncWith: "async with",
    ast.Try: "try",
    ast.TryStar: "try",
    ast.Match: "match",
    ast.FunctionDef: "def",
    ast.AsyncFunctionDef: "async def",
    ast.ClassDef: "class",
}
COMPOUND = tuple(KEYWORDS)


def _is_guard(stmt: ast.stmt) -> bool:
    """Whether `stmt` is a short guard: one simple body statement, no other clause."""
    match stmt:
        case (
            ast.If(body=[only], orelse=[])
            | ast.For(body=[only], orelse=[])
            | ast.AsyncFor(body=[only], orelse=[])
            | ast.While(body=[only], orelse=[])
            | ast.With(body=[only])
            | ast.AsyncWith(body=[only])
        ):
            return not isinstance(only, COMPOUND)
        case _:
            return False


def _is_block(stmt: ast.stmt) -> bool:
    """Whether `stmt` is a multi-line compound statement that is not a short guard."""
    if not isinstance(stmt, COMPOUND):
        return False
    return (stmt.end_lineno or stmt.lineno) > stmt.lineno and not _is_guard(stmt)


def _start(stmt: ast.stmt) -> int:
    """First source line of `stmt`, counting a definition's decorators."""
    match stmt:
        case (
            ast.FunctionDef(decorator_list=[first, *_])
            | ast.AsyncFunctionDef(decorator_list=[first, *_])
            | ast.ClassDef(decorator_list=[first, *_])
        ):
            return first.lineno
        case _:
            return stmt.lineno


def _is_docstring(stmt: ast.stmt) -> bool:
    """Whether `stmt` is a bare string expression, i.e. a docstring when first in a body."""
    match stmt:
        case ast.Expr(value=ast.Constant(value=str())):
            return True
        case _:
            return False


def _statement_lists(tree: ast.Module) -> Iterator[list[ast.stmt]]:
    """Every non-empty list of sibling statements: bodies, else/except/finally/case clauses."""
    for node in ast.walk(tree):
        for _name, value in ast.iter_fields(node):
            if isinstance(value, list) and value and all(isinstance(item, ast.stmt) for item in value):
                yield value


@rule
def unpadded_blocks(
    path: Path,
    source: str,
    tree: ast.Module,
    _tokens: list[tokenize.TokenInfo],
) -> list[Finding]:
    """Flag multi-line blocks that run straight into a neighbouring statement.

    Each missing gap yields one finding at the line above which the blank line
    belongs: a "before" finding anchors on the block's first line (its first
    decorator, for a decorated definition), an "after" finding on the statement
    that follows the block. A gap between two blocks is reported once, as the
    second block's "before" finding. Findings are errors.
    """
    lines = source.splitlines()
    findings = []

    for stmts in _statement_lists(tree):
        for index, stmt in enumerate(stmts):
            if not _is_block(stmt):
                continue

            keyword = KEYWORDS[type(stmt)]
            start = _start(stmt)
            prev = stmts[index - 1] if index else None

            if prev is not None and not (index == 1 and _is_docstring(prev)):
                prev_end = prev.end_lineno or prev.lineno
                if not any(not line.strip() for line in lines[prev_end : start - 1]):
                    findings.append(
                        Finding(
                            path,
                            start,
                            stmt.col_offset + 1,
                            "SLOP012",
                            f"No blank line before this multi-line `{keyword}` block; "
                            "separate logical blocks with a blank line",
                            end_line=start,
                            end_col=stmt.col_offset + len(keyword) + 1,
                        )
                    )

            # A following block reports the same gap as its own "before" finding.
            following = stmts[index + 1] if index + 1 < len(stmts) else None
            if following is None or _is_block(following):
                continue

            end = stmt.end_lineno or stmt.lineno
            if not any(not line.strip() for line in lines[end : _start(following) - 1]):
                findings.append(
                    Finding(
                        path,
                        following.lineno,
                        following.col_offset + 1,
                        "SLOP012",
                        f"No blank line after the multi-line `{keyword}` block above; "
                        "separate logical blocks with a blank line",
                        end_line=following.lineno,
                        end_col=len(lines[following.lineno - 1].rstrip()) + 1,
                    )
                )

    return findings
