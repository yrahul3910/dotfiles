"""SLOP016: more than eight statements in a row without a blank line.

A long unbroken run almost always hides a seam: setup, then a loop, then a check, then the result. Multi-line blocks
already break runs (SLOP012 pads them), so this catches the walls of simple statements and guards between them.
Uniform runs are one group however long they are: all imports, all assignments, all asserts, or all calls on the
same root (`parser.add_argument(...)`, `self.assertEqual(...)`). Advisory, because finding the seam takes judgement.
"""

import ast
from typing import TYPE_CHECKING

from no_sloppy.layout import Body, Lines, bodies, is_block, separated, visual_start

from . import Finding, rule

if TYPE_CHECKING:
    import tokenize
    from collections.abc import Iterator
    from pathlib import Path

MAX_RUN = 8


def _root(node: ast.expr) -> str | None:
    """Return the identifier at the root of a call or attribute chain: `parser` for `parser.add_argument(...)`."""
    while True:
        match node:
            case ast.Name(id=name):
                return name
            case ast.Attribute(value=inner) | ast.Call(func=inner) | ast.Subscript(value=inner):
                node = inner
            case _:
                return None


def _family(stmt: ast.stmt) -> str | None:
    """Name the uniform family `stmt` belongs to, or return None when it belongs to none."""
    match stmt:
        case ast.Import() | ast.ImportFrom():
            return "import"
        case ast.Assign() | ast.AnnAssign() | ast.AugAssign() | ast.TypeAlias():
            return "assign"
        case ast.Assert():
            return "assert"
        case ast.Expr(value=ast.Call() | ast.Await(value=ast.Call()) as call):
            root = _root(call)
            return None if root is None else f"call:{root}"
        case _:
            return None


def _runs(lines: Lines, body: Body) -> Iterator[list[ast.stmt]]:
    """Split `body` into maximal runs of touching statements; a multi-line block ends a run and joins none."""
    run: list[ast.stmt] = []

    for stmt in body.stmts:
        if is_block(stmt) or (run and separated(lines, run[-1], stmt)):
            yield run
            run = []

        if not is_block(stmt):
            run.append(stmt)

    yield run


@rule
def dense_runs(
    path: Path,
    source: str,
    tree: ast.Module,
    tokens: list[tokenize.TokenInfo],
) -> list[Finding]:
    """Warn on each run of more than `MAX_RUN` statements with no blank line between them.

    A run counts every statement in it, short guards included, and is exempt when all of its statements belong to
    one uniform family (see `_family`). Each finding is a warning anchored on the statement that crosses the limit,
    so appending to a long run reports the new statements rather than the untouched top of the run.
    """
    lines = Lines.of(source, tokens)
    findings = []

    for body in bodies(tree, lines):
        for run in _runs(lines, body):
            families = {_family(stmt) for stmt in run}

            if len(run) <= MAX_RUN or (len(families) == 1 and None not in families):
                continue

            line = visual_start(lines, run[MAX_RUN])
            text = lines.text[line - 1]
            message = (
                f"{len(run)} statements in a row without a blank line; find the seams (setup, loop, check, result) "
                "and separate the groups"
            )
            indent, end = len(text) - len(text.lstrip()), len(text.rstrip())
            findings.append(
                Finding(path, line, indent + 1, "SLOP016", message, end_line=line, end_col=end + 1, level="warn")
            )

    return findings
