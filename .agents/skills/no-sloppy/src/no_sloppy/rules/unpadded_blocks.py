"""SLOP012: a multi-line block gets a blank line before and after it.

A compound statement that spans several lines (`if`, `for`, `while`, `try`, `with`, `match`, `def`, `class`) is a
logical block. Running it straight into the statements around it produces a wall of code the reader has to
re-segment by eye. Short guards are the exception: an `if` or loop without `else` whose header and single simple
body statement fit on one line each (`if x is None:` / `return`) may sit against its neighbours. A guard whose
condition or body statement wraps is a block like any other. `@overload` signatures stack against each other and
against their implementation, a docstring never needs a blank line after it (D202 forbids one), and the clauses of
one statement (`else`, `except`, `case`) are not this rule's concern.

A `return` that ends a run of two or more statements (guards included) gets a blank line above it too, so the result
stands apart from the steps that produce it. Directly under a single statement it may stay: `limits.set(name, limit)`
then `return limit` read as one step. So may the fallback `return` of a dispatch chain, where every statement above
it is a guard that returns or raises: the chain is one decision table.

A comment directly above a block or `return` belongs to it, so the blank line goes above the comment. A gap that holds
only a comment still counts as missing, which keeps the fix from wedging a blank line between a comment and its code.
"""

import ast
from typing import TYPE_CHECKING

from no_sloppy.layout import (
    KEYWORDS,
    RETURN_GROUP,
    Lines,
    bodies,
    is_block,
    is_guard_shaped,
    is_overload,
    separated,
    visual_start,
)

from . import Finding, rule

if TYPE_CHECKING:
    import tokenize
    from pathlib import Path

BLOCK_FIX = "separate logical blocks with a blank line"
GUARD_HINT = ". A guard is exempt only when its header and its one body statement each fit on one line"


def _overload_chain(prev: ast.stmt, stmt: ast.stmt) -> bool:
    """Whether `prev` is an `@overload` signature of the function `stmt` defines."""
    match prev, stmt:
        case (
            ast.FunctionDef(name=overloaded) | ast.AsyncFunctionDef(name=overloaded),
            ast.FunctionDef(name=name) | ast.AsyncFunctionDef(name=name),
        ):
            return is_overload(prev) and overloaded == name
        case _:
            return False


def _exits(stmt: ast.stmt) -> bool:
    """Whether `stmt` is an `if` without `else` whose whole body returns or raises: one entry in a dispatch chain."""
    match stmt:
        case ast.If(body=[ast.Return() | ast.Raise()], orelse=[]):
            return True
        case _:
            return False


def _crowded_return(lines: Lines, stmts: list[ast.stmt], index: int) -> bool:
    """Whether `stmts[index]` is a `return` directly under `RETURN_GROUP` or more statements with no blank line.

    The statements count back to the nearest blank line or multi-line block. A fallback `return` under nothing but
    exiting guards ends a dispatch chain and is never crowded.
    """
    if not isinstance(stmts[index], ast.Return):
        return False

    top = index

    while top > 0 and not is_block(stmts[top - 1]) and not separated(lines, stmts[top - 1], stmts[top]):
        top -= 1

    return index - top >= RETURN_GROUP and not all(_exits(stmt) for stmt in stmts[top:index])


def _missing(path: Path, lines: Lines, anchor: ast.stmt, message: str, fix: str, hint: str = "") -> Finding:
    """Report a missing blank line on the line it belongs above: `anchor`'s visual start.

    The message ends with `fix`, or, when a comment sits directly above `anchor`, with a note to put the blank line
    above that comment; `hint` follows either.
    """
    line = visual_start(lines, anchor)
    text = lines.text[line - 1]

    if line in lines.comments:
        message += "; add it above the comment, which belongs to the code below it"
    else:
        message += f"; {fix}"

    message += hint
    indent = len(text) - len(text.lstrip())

    return Finding(path, line, indent + 1, "SLOP012", message, end_line=line, end_col=len(text.rstrip()) + 1)


@rule
def unpadded_blocks(
    path: Path,
    source: str,
    tree: ast.Module,
    tokens: list[tokenize.TokenInfo],
) -> list[Finding]:
    """Flag multi-line blocks that run straight into a neighbouring statement, and crowded `return` statements.

    Each missing gap yields one error on the line above which the blank line belongs: a "before" finding anchors on
    the block's visual start (its leading comment or first decorator), an "after" finding on the visual start of
    the statement that follows the block, and a `return` finding on the return's visual start. A gap between two
    blocks is reported once, as the second block's "before" finding.
    """
    lines = Lines.of(source, tokens)
    findings = []

    for body in bodies(tree, lines):
        for index, stmt in enumerate(body.stmts):
            if _crowded_return(lines, body.stmts, index):
                message = "No blank line before this `return`, which ends a group of two or more statements"
                findings.append(_missing(path, lines, stmt, message, "give it its own paragraph"))

            if not is_block(stmt):
                continue

            what = f"`{KEYWORDS[type(stmt)]}` block"
            hint = GUARD_HINT if is_guard_shaped(stmt) else ""
            prev = body.stmts[index - 1] if index else None

            if prev is not None and not separated(lines, prev, stmt) and not _overload_chain(prev, stmt):
                message = f"No blank line before this multi-line {what}"
                findings.append(_missing(path, lines, stmt, message, BLOCK_FIX, hint))

            # A following block reports the same gap as its own "before" finding.
            following = body.stmts[index + 1] if index + 1 < len(body.stmts) else None

            if following is not None and not is_block(following) and not separated(lines, stmt, following):
                message = f"No blank line after the multi-line {what} above"
                findings.append(_missing(path, lines, following, message, BLOCK_FIX, hint))

    return findings
