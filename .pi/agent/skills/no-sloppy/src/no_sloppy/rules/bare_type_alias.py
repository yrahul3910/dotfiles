"""SLOP003: type aliases must use the `type` statement (PEP 695)."""

import ast
from typing import TYPE_CHECKING

from . import Finding, rule, tail_name

if TYPE_CHECKING:
    import tokenize
    from collections.abc import Iterator
    from pathlib import Path

GENERIC_NAMES = frozenset(
    {
        "Annotated",
        "AsyncGenerator",
        "AsyncIterable",
        "AsyncIterator",
        "Awaitable",
        "Callable",
        "Coroutine",
        "DefaultDict",
        "Deque",
        "Dict",
        "FrozenSet",
        "Generator",
        "Iterable",
        "Iterator",
        "List",
        "Literal",
        "Mapping",
        "MutableMapping",
        "MutableSequence",
        "Optional",
        "Sequence",
        "Set",
        "Tuple",
        "Type",
        "Union",
        "dict",
        "frozenset",
        "list",
        "set",
        "tuple",
        "type",
    }
)


def _flatten_union(node: ast.expr) -> Iterator[ast.expr]:
    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.BitOr):
        yield from _flatten_union(node.left)
        yield from _flatten_union(node.right)
    else:
        yield node


def _is_strong_type_expr(node: ast.expr) -> bool:
    """Check for unambiguous type syntax: a known generic subscript or None."""
    if isinstance(node, ast.Subscript):
        return tail_name(node.value) in GENERIC_NAMES
    return isinstance(node, ast.Constant) and node.value is None


def _is_type_expr(node: ast.expr) -> bool:
    """Whether the RHS of an assignment is clearly a type expression.

    A `|` union counts only when at least one operand is unambiguous type
    syntax and every operand could plausibly be a type reference; this keeps
    runtime unions like `d1 | d2` or `RE_A | RE_B` out.
    """
    if _is_strong_type_expr(node):
        return True

    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.BitOr):
        operands = list(_flatten_union(node))
        return any(_is_strong_type_expr(op) for op in operands) and all(
            _is_strong_type_expr(op) or isinstance(op, ast.Name | ast.Attribute) for op in operands
        )

    return False


@rule
def bare_type_alias(
    path: Path,
    _source: str,
    tree: ast.Module,
    _tokens: list[tokenize.TokenInfo],
) -> list[Finding]:
    """Flag module-level type aliases assigned without the `type` keyword."""
    return [
        Finding(
            path,
            node.lineno,
            node.col_offset + 1,
            "SLOP003",
            f"Type alias should use the `type` statement: `type {target.id} = ...`",
            end_line=node.end_lineno,
            end_col=None if node.end_col_offset is None else node.end_col_offset + 1,
        )
        for node in tree.body
        if isinstance(node, ast.Assign)
        and len(node.targets) == 1
        and isinstance(target := node.targets[0], ast.Name)
        and _is_type_expr(node.value)
    ]
