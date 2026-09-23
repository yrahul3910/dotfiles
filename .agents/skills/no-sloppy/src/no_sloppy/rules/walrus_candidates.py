"""SLOP017: an assignment that only sets up the `if` directly below it.

`x = f()` followed by `if x ...:` spends two statements on one step; `if (x := f()) ...:` binds the value where it is
tested, and the name stays bound after the `if`. When the `if` test is the name's only read, the expression belongs
in the condition directly. Flagged only where the rewrite is safe and stays readable:

- inside a function (module and class level keep their named definitions), for a plain name that is not a constant
- when the `if` sits directly under the assignment; a blank line between them means the value is setup for more than
  this check (or the `if` is a block that SLOP012 pads), and binding it in the header would bury it
- when the value fits on one line, does not read the name it rebinds (`path = Path(path)` is normalization, not
  setup), and is not a conditional expression, lambda, or `yield`
- when the name is the subject of the test: its first read is the test's leftmost operand, optionally under `not`
  (`if x`, `if not x`, `if x is None`, `if x.startswith(...)`), never behind `and`, `or`, or a ternary branch, where
  binding it could leave the name unbound
- when the combined `if` line stays at least `WRAP_MARGIN` columns under the line limit, so the fix never forces a wrap
"""

import ast
from itertools import pairwise
from typing import TYPE_CHECKING

from no_sloppy.line_limit import WRAP_MARGIN, line_length

from . import Finding, rule

if TYPE_CHECKING:
    import tokenize
    from collections.abc import Iterator
    from pathlib import Path

SCOPES = ast.FunctionDef | ast.AsyncFunctionDef | ast.ClassDef | ast.Lambda
# Values that read badly inside an `if` header or change meaning there.
UNREADABLE_VALUES = ast.IfExp | ast.Lambda | ast.Yield | ast.YieldFrom


def _statement_lists(func: ast.FunctionDef | ast.AsyncFunctionDef) -> Iterator[list[ast.stmt]]:
    """Yield every list of sibling statements in `func`'s own scope, leaving nested functions and classes out."""
    pending: list[ast.AST] = [func]

    while pending:
        node = pending.pop()

        for _name, value in ast.iter_fields(node):
            children = value if isinstance(value, list) else [value]

            if children and all(isinstance(child, ast.stmt) for child in children):
                yield children

            pending.extend(
                child
                for child in children
                if isinstance(child, ast.stmt | ast.excepthandler | ast.match_case) and not isinstance(child, SCOPES)
            )


def _always_evaluated(node: ast.expr) -> Iterator[ast.expr]:
    """Yield `node` and every subexpression that is evaluated whenever `node` is, in no particular order."""
    yield node

    match node:
        case ast.BoolOp(values=[first, *_]):
            yield from _always_evaluated(first)
        case ast.IfExp(test=test):
            yield from _always_evaluated(test)
        case ast.Compare(left=left, comparators=[first, *_]):
            yield from _always_evaluated(left)
            yield from _always_evaluated(first)
        case ast.Lambda() | ast.ListComp() | ast.SetComp() | ast.DictComp() | ast.GeneratorExp():
            return
        case _:
            for child in ast.iter_child_nodes(node):
                if isinstance(child, ast.expr):
                    yield from _always_evaluated(child)


def _reads(node: ast.AST, name: str) -> list[ast.Name]:
    """Every read of `name` inside `node`, in source order."""
    found = [child for child in ast.walk(node) if isinstance(child, ast.Name) and child.id == name]
    return sorted((child for child in found if isinstance(child.ctx, ast.Load)), key=lambda n: (n.lineno, n.col_offset))


def _message(
    func: ast.FunctionDef | ast.AsyncFunctionDef, assign: ast.Assign, test: ast.If, lines: list[str], limit: int
) -> str | None:
    """Describe the rewrite for `assign` directly followed by `test`, or return None when it does not apply.

    Every condition in the module docstring must hold; the checks run cheapest first and short-circuit. The message
    suggests inlining the expression when the `if` test is the name's only read anywhere in `func` (nested scopes
    included), and binding it with `:=` otherwise. `lines` is the file's source, used for blank-line adjacency and to
    measure the combined `if` line against `limit`.
    """
    match assign:
        case ast.Assign(targets=[ast.Name(id=name)], value=value) if not name.isupper():
            pass
        case _:
            return None

    condition = test.test
    adjacent = all(lines[line - 1].strip() for line in range(assign.end_lineno or assign.lineno, test.lineno))
    plain = value.lineno == value.end_lineno and not isinstance(value, UNREADABLE_VALUES)
    reads = _reads(condition, name) if condition.lineno == condition.end_lineno else []

    if not adjacent or not plain or not reads or _reads(value, name):
        return None

    match condition:
        case ast.UnaryOp(op=ast.Not(), operand=subject):
            pass
        case _:
            subject = condition

    leftmost = (reads[0].lineno, reads[0].col_offset) == (subject.lineno, subject.col_offset)

    # ast columns count UTF-8 bytes. The rewrite adds the value, ` := `, and a pair of parentheses to the `if` line.
    segment = lines[value.lineno - 1].encode()[value.col_offset : value.end_col_offset].decode(errors="replace")
    fits = len(lines[test.lineno - 1].rstrip()) + len(segment) + 6 <= limit - WRAP_MARGIN

    if not leftmost or not fits or not any(node is reads[0] for node in _always_evaluated(condition)):
        return None

    if len(_reads(func, name)) == 1:
        return f"`{name}` is only read by the `if` below; use the expression in the condition directly"

    return f"`{name}` is set up for the `if` below; bind it in the condition with `if ({name} := ...)`"


@rule
def walrus_candidates(
    path: Path,
    source: str,
    tree: ast.Module,
    _tokens: list[tokenize.TokenInfo],
) -> list[Finding]:
    """Flag each function-scope assignment directly followed by an `if` that could bind it; see the module docstring.

    Findings are errors anchored on the assignment, spanning its line.
    """
    lines = source.splitlines()
    limit = line_length(path)
    findings = []

    for func in ast.walk(tree):
        if not isinstance(func, ast.FunctionDef | ast.AsyncFunctionDef):
            continue

        for stmts in _statement_lists(func):
            for assign, test in pairwise(stmts):
                if not isinstance(assign, ast.Assign) or not isinstance(test, ast.If):
                    continue

                if (message := _message(func, assign, test, lines, limit)) is not None:
                    line, col = assign.lineno, assign.col_offset + 1
                    end = len(lines[line - 1].rstrip()) + 1
                    findings.append(Finding(path, line, col, "SLOP017", message, end_line=line, end_col=end))

    return findings
