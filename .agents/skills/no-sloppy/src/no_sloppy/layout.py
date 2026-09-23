"""Vertical layout of Python source, shared by the blank-line rules (SLOP012, SLOP015, SLOP016).

The unit is a body: one list of sibling statements plus the clause header that owns it. Between two siblings
lies a gap of blank and comment-only lines. A comment directly above a statement, at the statement's own
indentation, belongs to that statement, so the statement's visual start is the top of that comment run (or of its
decorators). Two siblings are separated when the line directly above the second one's visual start is blank; a
comment between them does not count, because the blank line belongs above the comment, not inside it.
"""

import ast
import re
import tokenize
from dataclasses import dataclass
from typing import TYPE_CHECKING, Literal

from no_sloppy.rules import tail_name

if TYPE_CHECKING:
    from collections.abc import Iterator

type BodyKind = Literal["module", "class", "function", "control"]

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
BODY_KINDS: dict[type[ast.AST], BodyKind] = {
    ast.Module: "module",
    ast.ClassDef: "class",
    ast.FunctionDef: "function",
    ast.AsyncFunctionDef: "function",
}

# Tool directives are not prose about the code below them, so they may sit anywhere.
PRAGMA = re.compile(r"#\s*(?:noqa|type:|fmt:|pragma\b|pyright:|mypy:|ruff:|pylint:|isort:|nosec|(?:end)?region\b)")


@dataclass(frozen=True)
class Lines:
    """Physical source lines (1-indexed through the methods) and the lines that hold only a comment.

    `comments` maps each comment-only line to the column its comment starts at, which is the line's indentation.
    """

    text: list[str]
    comments: dict[int, int]

    @classmethod
    def of(cls, source: str, tokens: list[tokenize.TokenInfo]) -> Lines:
        """Index `source` using its token stream to tell comment-only lines from code."""
        comments = {
            tok.start[0]: tok.start[1]
            for tok in tokens
            if tok.type == tokenize.COMMENT and not tok.line[: tok.start[1]].strip()
        }
        return cls(source.splitlines(), comments)

    def blank(self, line: int) -> bool:
        """Whether `line` exists and holds only whitespace."""
        return 1 <= line <= len(self.text) and not self.text[line - 1].strip()

    def code(self, line: int) -> bool:
        """Whether `line` exists and is neither blank nor comment-only."""
        return 1 <= line <= len(self.text) and not self.blank(line) and line not in self.comments

    def prose_comment(self, line: int, column: int) -> bool:
        """Whether `line` is a comment at `column` that describes code rather than directing a tool."""
        return self.comments.get(line) == column and not PRAGMA.match(self.text[line - 1].lstrip())


@dataclass(frozen=True)
class Body:
    """A list of sibling statements and the clause lines around it.

    `stmts` excludes a leading docstring. `opener` is the last line of the owning clause's header (`def ...:`,
    `else:`, ...) when the first statement follows that header directly; it is None for the module, for a body
    that leads with a docstring (ruff's D2xx rules own that spacing), and for a body written on the header's own
    line. `closer` is the first line of the next clause of the same statement (`elif`, `else`, `except`,
    `finally`) when one follows; `case` clauses never count, since blank lines between them are a fair choice.
    """

    kind: BodyKind
    stmts: list[ast.stmt]
    opener: int | None
    closer: int | None

    @property
    def column(self) -> int:
        """Indentation shared by the body's statements."""
        return self.stmts[0].col_offset


def is_docstring(stmt: ast.stmt) -> bool:
    """Whether `stmt` is a bare string expression, i.e. a docstring when first in a body."""
    match stmt:
        case ast.Expr(value=ast.Constant(value=str())):
            return True
        case _:
            return False


def is_overload(stmt: ast.stmt) -> bool:
    """Whether `stmt` is an `@overload` signature, which stacks against its siblings and implementation."""
    match stmt:
        case ast.FunctionDef(decorator_list=decorators) | ast.AsyncFunctionDef(decorator_list=decorators):
            return any(tail_name(decorator) == "overload" for decorator in decorators)
        case _:
            return False


def is_guard_shaped(stmt: ast.stmt) -> bool:
    """Whether `stmt` is an `if` without `else`, or a loop without `else`, whose body is one simple statement."""
    match stmt:
        case (
            ast.If(body=[only], orelse=[])
            | ast.For(body=[only], orelse=[])
            | ast.AsyncFor(body=[only], orelse=[])
            | ast.While(body=[only], orelse=[])
        ):
            return not isinstance(only, COMPOUND)
        case _:
            return False


def is_block(stmt: ast.stmt) -> bool:
    """Whether `stmt` is a multi-line compound statement that must be padded with blank lines.

    A short guard, one whose header and single body statement fit on a line each (`if x is None:` / `return`), is
    exempt, and so is an `@overload` signature.
    """
    if not isinstance(stmt, COMPOUND) or is_overload(stmt):
        return False

    span = (stmt.end_lineno or stmt.lineno) - stmt.lineno
    return span > 1 or (span == 1 and not is_guard_shaped(stmt))


def first_line(stmt: ast.stmt) -> int:
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


def visual_start(lines: Lines, stmt: ast.stmt) -> int:
    """First line of `stmt` including its decorators and the comments directly above it at its indentation."""
    line = first_line(stmt)

    while lines.comments.get(line - 1) == stmt.col_offset:
        line -= 1

    return line


def separated(lines: Lines, prev: ast.stmt, stmt: ast.stmt) -> bool:
    """Whether a blank line sits directly above `stmt`'s visual start, below the end of `prev`."""
    start = visual_start(lines, stmt)
    return start - 1 > (prev.end_lineno or prev.lineno) and lines.blank(start - 1)


def _header_end(lines: Lines, first: ast.stmt) -> int | None:
    """Last line of the header owning `first`, or None when `first` shares the header's line."""
    if lines.text[first.lineno - 1][: first.col_offset].strip():
        return None

    line = visual_start(lines, first) - 1

    while line > 0 and not lines.code(line):
        line -= 1

    return line


def _next_code_line(lines: Lines, stmt: ast.stmt) -> int:
    """First code line after `stmt`, which is the next clause's header when `stmt` ends a clause."""
    line = (stmt.end_lineno or stmt.lineno) + 1

    while line <= len(lines.text) and not lines.code(line):
        line += 1

    return line


def _clauses(node: ast.AST, lines: Lines) -> list[tuple[BodyKind, list[ast.stmt], bool]]:
    """List the statement lists `node` owns directly, in source order, as `(kind, statements, followed)` triples.

    `followed` is true when another clause of the same statement comes after the list: the `if` body before an
    `else` or `elif`, a `try` body before its handlers, and so on. An `elif` chain is split at each link, because the
    nested `If` in `orelse` is a statement of its own that `ast.walk` visits separately; its parent contributes only
    its own body, followed by the `elif`. `match` cases are never marked as followed. Empty lists (an absent `else`)
    are dropped, and nodes that own no statements yield nothing.
    """
    followed = False

    match node:
        case ast.Module() | ast.ClassDef() | ast.FunctionDef() | ast.AsyncFunctionDef():
            return [(BODY_KINDS[type(node)], node.body, False)]
        case ast.Match(cases=cases):
            return [("control", case.body, False) for case in cases]
        case ast.If(orelse=[ast.If(lineno=line)]) if lines.text[line - 1].lstrip().startswith("elif"):
            groups, followed = [node.body], True
        case ast.If() | ast.For() | ast.AsyncFor() | ast.While():
            groups = [node.body, node.orelse]
        case ast.With() | ast.AsyncWith():
            groups = [node.body]
        case ast.Try() | ast.TryStar():
            groups = [node.body, *(handler.body for handler in node.handlers), node.orelse, node.finalbody]
        case _:
            return []

    groups = [group for group in groups if group]
    return [("control", group, followed or index < len(groups) - 1) for index, group in enumerate(groups)]


def bodies(tree: ast.Module, lines: Lines) -> Iterator[Body]:
    """Every body in `tree` that holds at least one statement besides a docstring."""
    for node in ast.walk(tree):
        for kind, stmts, followed in _clauses(node, lines):
            if not stmts:
                continue

            documented = kind != "control" and is_docstring(stmts[0])
            code = stmts[1:] if documented else stmts

            if not code:
                continue

            opener = None if kind == "module" or documented else _header_end(lines, code[0])
            closer = _next_code_line(lines, code[-1]) if followed else None
            yield Body(kind, code, opener, closer)
