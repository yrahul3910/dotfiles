"""SLOP008: don't isinstance-check what the annotation already guarantees.

An `isinstance(x, T)` (or `type(x) is T`) on a parameter annotated `x: T`
re-derives evidence the signature already states; trust the annotation and
let the type checker enforce it. Only vacuous checks are flagged: narrowing
a union (`x: int | None` checked with `isinstance(x, int)`) is legitimate
and stays silent, as does anything syntactically unresolvable.
"""

import ast
from typing import TYPE_CHECKING

from . import Finding, rule, tail_name

if TYPE_CHECKING:
    import tokenize
    from collections.abc import Iterator
    from pathlib import Path

ALIASES = {"List": "list", "Dict": "dict", "Set": "set", "FrozenSet": "frozenset", "Tuple": "tuple", "Type": "type"}


def _type_names(node: ast.expr) -> set[str] | None:
    """Syntactic type names of an annotation or isinstance() second argument.

    None means the form is unsupported; callers bail instead of guessing.
    """
    result: set[str] | None
    match node:
        case ast.Constant(value=None):
            result = {"None"}
        case ast.Subscript(value=value, slice=inner) if tail_name(value) == "Optional":
            names = _type_names(inner)
            result = {"None"} | names if names else None
        case ast.Subscript(value=value, slice=ast.Tuple(elts=parts)) if tail_name(value) == "Union":
            result = _joined(list(parts))
        case ast.Subscript(value=value, slice=inner) if tail_name(value) == "Union":
            result = _type_names(inner)
        case ast.Name() | ast.Attribute() | ast.Subscript():
            target = node.value if isinstance(node, ast.Subscript) else node
            name = tail_name(target)
            result = {ALIASES.get(name, name)} if name else None
        case ast.BinOp(left=left, op=ast.BitOr(), right=right):
            result = _joined([left, right])
        case ast.Tuple(elts=elts):
            result = _joined(list(elts))
        case _:
            result = None
    return result


def _joined(parts: list[ast.expr]) -> set[str] | None:
    """Union _type_names over parts; None if any part is unsupported."""
    out: set[str] = set()
    for part in parts:
        names = _type_names(part)
        if names is None:
            return None
        out |= names
    return out


def _scope_nodes(body: list[ast.stmt]) -> Iterator[ast.AST]:
    """Yield every node in the body without descending into nested scopes."""
    stack: list[ast.AST] = list(body)
    while stack:
        node = stack.pop()
        if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef | ast.Lambda | ast.ClassDef):
            continue
        yield node
        stack.extend(ast.iter_child_nodes(node))


@rule
def isinstance_revalidation(
    path: Path,
    _source: str,
    tree: ast.Module,
    _tokens: list[tokenize.TokenInfo],
) -> list[Finding]:
    """Flag runtime type checks made vacuous by the parameter annotation."""
    findings = []
    funcs = [node for node in ast.walk(tree) if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef)]

    for func in funcs:
        args = func.args
        params: dict[str, tuple[set[str], str]] = {}
        for arg in [*args.posonlyargs, *args.args, *args.kwonlyargs]:
            if arg.annotation is not None and (names := _type_names(arg.annotation)):
                params[arg.arg] = (names, ast.unparse(arg.annotation))
        if not params:
            continue

        for node in _scope_nodes(func.body):
            match node:
                case ast.Call(func=ast.Name(id="isinstance"), args=[ast.Name(id=pname), checked]) if pname in params:
                    verb = f"isinstance({pname}, ...)"
                case ast.Compare(
                    left=ast.Call(func=ast.Name(id="type"), args=[ast.Name(id=pname)]),
                    ops=[ast.Is() | ast.Eq()],
                    comparators=[checked],
                ) if pname in params:
                    verb = f"type({pname}) is ..."
                case _:
                    continue

            annotated, annotation_src = params[pname]
            checked_names = _type_names(checked)
            if checked_names is not None and annotated <= checked_names:
                findings.append(
                    Finding(
                        path,
                        node.lineno,
                        node.col_offset + 1,
                        "SLOP008",
                        f"`{verb}` re-checks what `{pname}: {annotation_src}` already guarantees; trust the annotation",
                        end_line=node.end_lineno,
                        end_col=None if node.end_col_offset is None else node.end_col_offset + 1,
                        level="warn",
                    )
                )

    return findings
