"""SLOP015: blank lines that separate nothing.

Blank lines are for the reader's eye, so each one must mark a seam between groups of code. Inside a body these
are padding instead:

- a blank line at the start of a body, directly under its `def ...:`, `if ...:`, or `else:` header
- a blank line at the end of a clause, directly above the `elif`, `else`, `except`, or `finally` that follows it
- a blank line between a comment and the code it describes; the comment sits directly on its code
- two or more blank lines in a row inside a function or class; one is enough (module level follows PEP 8)
- any blank line in a function or control-flow body of at most three one-line simple statements, which reads as
  one group however it is spaced; the one exception is the blank line above a `return` that follows two statements,
  which SLOP012 requires

Each finding anchors on the blank line to delete (or, for a detached comment, to move above the comment).
"""

import ast
from typing import TYPE_CHECKING

from no_sloppy.layout import COMPOUND, RETURN_GROUP, Body, Lines, bodies, visual_start

from . import Finding, rule

if TYPE_CHECKING:
    import tokenize
    from collections.abc import Iterator
    from pathlib import Path

MAX_STRETCHED = 3


def _stretched(body: Body) -> bool:
    """Whether `body` is a short run of one-line simple statements that needs no internal blank line."""
    return (
        body.kind in {"function", "control"}
        and 1 < len(body.stmts) <= MAX_STRETCHED
        and all(not isinstance(stmt, COMPOUND) and stmt.lineno == stmt.end_lineno for stmt in body.stmts)
    )


def _blank_runs(lines: Lines, first: int, last: int) -> Iterator[tuple[int, int]]:
    """Maximal runs of consecutive blank lines within lines `first` through `last`, as inclusive pairs."""
    line = first

    while line <= last:
        if not lines.blank(line):
            line += 1
            continue

        start = line

        while line + 1 <= last and lines.blank(line + 1):
            line += 1

        yield start, line
        line += 1


def _detached(lines: Lines, body: Body, run: tuple[int, int], region: tuple[int, int], where: str) -> str | None:
    """Message for a blank run that cuts a prose comment off from the code below it, or None.

    When the comment directly follows the previous statement, the blank line belongs above the comment; otherwise
    (under a header, or already below a blank line) it is simply extra.
    """
    above = run[0] - 1

    if body.kind not in {"function", "control"} or not lines.prose_comment(above, body.column):
        return None

    top = above

    while lines.comments.get(top - 1) == body.column:
        top -= 1

    if where in {"between", "return"} and top == region[0]:
        return "Blank line between a comment and the code it describes; move it above the comment"

    return "Blank line between a comment and the code it describes; delete it so the comment sits on its code"


def _check_region(
    lines: Lines, body: Body, region: tuple[int, int], where: str, closer: str | None = None
) -> Iterator[tuple[int, str]]:
    """Excess blank lines in one gap of `body`, as (line to anchor on, message) pairs.

    `where` is "opening" for the gap under the header, "between" for a gap between siblings, "return" for the gap
    above a `return` that follows two or more siblings (whose blank line SLOP012 requires, so it never counts as
    stretching), and "closing" for the gap above the next clause, whose keyword is `closer`.
    """
    first, last = region

    for run in _blank_runs(lines, first, last):
        count = run[1] - run[0] + 1
        detached = _detached(lines, body, run, region, where) if where != "closing" else None

        if where == "opening" and run[0] == first:
            yield run[0], "Blank line at the start of a body; the first statement sits directly under its header"
        elif where == "closing" and run[1] == last:
            yield run[0], f"Blank line before `{closer}`; a clause follows its body directly"
        elif detached is not None:
            yield run[0], detached
        elif count > 1 and body.kind != "module":
            yield run[0] + 1, f"{count} blank lines in a row; one blank line separates groups inside a body"
        elif where == "between" and _stretched(body):
            yield run[0], (
                f"Unnecessary blank line; a body of {len(body.stmts)} one-line statements reads as one group"
            )


def _regions(lines: Lines, body: Body) -> Iterator[tuple[tuple[int, int], str, str | None]]:
    """Every gap of `body` with its position and, for the closing gap, the next clause's keyword."""
    if body.opener is not None:
        yield (body.opener + 1, visual_start(lines, body.stmts[0]) - 1), "opening", None

    for index, (prev, stmt) in enumerate(zip(body.stmts, body.stmts[1:], strict=False), start=1):
        where = "return" if isinstance(stmt, ast.Return) and index >= RETURN_GROUP else "between"
        yield ((prev.end_lineno or prev.lineno) + 1, visual_start(lines, stmt) - 1), where, None

    if body.closer is not None:
        last = body.stmts[-1]
        keyword = lines.text[body.closer - 1].split()[0].rstrip(":")
        yield ((last.end_lineno or last.lineno) + 1, body.closer - 1), "closing", keyword


@rule
def excess_padding(
    path: Path,
    source: str,
    tree: ast.Module,
    tokens: list[tokenize.TokenInfo],
) -> list[Finding]:
    """Flag blank lines inside a body that do not separate two groups of code; see the module docstring."""
    lines = Lines.of(source, tokens)
    flagged: dict[int, str] = {}

    for body in bodies(tree, lines):
        for region, where, closer in _regions(lines, body):
            for line, message in _check_region(lines, body, region, where, closer):
                flagged.setdefault(line, message)

    return [
        Finding(path, line, 1, "SLOP015", message, end_line=line, end_col=1)
        for line, message in sorted(flagged.items())
    ]
