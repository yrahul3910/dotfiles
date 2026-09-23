"""SLOP012: a multi-line block gets a blank line before and after it.

A compound statement that spans several lines (`if`, `for`, `while`, `try`, `with`, `match`, `def`, `class`) is a
logical block. Running it straight into the statements around it produces a wall of code the reader has to
re-segment by eye. Short guards are the exception: an `if` or loop without `else` whose header and single simple
body statement fit on one line each (`if x is None:` / `return`) may sit against its neighbours. A guard whose
condition or body statement wraps is a block like any other. `@overload` signatures stack against each other and
against their implementation, a docstring never needs a blank line after it (D202 forbids one), and the clauses of
one statement (`else`, `except`, `case`) are not this rule's concern.

A comment directly above a block belongs to it, so the blank line goes above the comment. A gap that holds only a
comment still counts as missing, which keeps the fix from wedging a blank line between a comment and its code.
"""

import ast
from typing import TYPE_CHECKING

from no_sloppy.layout import KEYWORDS, Lines, bodies, is_block, is_guard_shaped, is_overload, separated, visual_start

from . import Finding, rule

if TYPE_CHECKING:
    import tokenize
    from pathlib import Path

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


def _missing(path: Path, lines: Lines, anchor: ast.stmt, message: str, hint: str) -> Finding:
    """Report a missing blank line on the line it belongs above: `anchor`'s visual start."""
    line = visual_start(lines, anchor)
    text = lines.text[line - 1]

    if line in lines.comments:
        message += "; add it above the comment, which belongs to the code below it"
    else:
        message += "; separate logical blocks with a blank line"

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
    """Flag multi-line blocks that run straight into a neighbouring statement.

    Each missing gap yields one error on the line above which the blank line belongs: a "before" finding anchors on
    the block's visual start (its leading comment or first decorator), an "after" finding on the visual start of
    the statement that follows the block. A gap between two blocks is reported once, as the second block's "before"
    finding.
    """
    lines = Lines.of(source, tokens)
    findings = []

    for body in bodies(tree, lines):
        for index, stmt in enumerate(body.stmts):
            if not is_block(stmt):
                continue

            what = f"`{KEYWORDS[type(stmt)]}` block"
            hint = GUARD_HINT if is_guard_shaped(stmt) else ""
            prev = body.stmts[index - 1] if index else None

            if prev is not None and not separated(lines, prev, stmt) and not _overload_chain(prev, stmt):
                findings.append(_missing(path, lines, stmt, f"No blank line before this multi-line {what}", hint))

            # A following block reports the same gap as its own "before" finding.
            following = body.stmts[index + 1] if index + 1 < len(body.stmts) else None

            if following is not None and not is_block(following) and not separated(lines, stmt, following):
                message = f"No blank line after the multi-line {what} above"
                findings.append(_missing(path, lines, following, message, hint))

    return findings
