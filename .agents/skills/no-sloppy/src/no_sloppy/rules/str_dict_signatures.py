"""SLOP004: str-keyed dict args/returns are usually a shape wanting a name.

Concrete dict types only: choosing abstract `Mapping`/`MutableMapping`
usually signals deliberately dynamic keys, so those are exempt.
"""

import ast
from typing import TYPE_CHECKING

from . import Finding, rule, tail_name

if TYPE_CHECKING:
    import tokenize
    from collections.abc import Iterator
    from pathlib import Path

DICT_NAMES = frozenset({"DefaultDict", "Dict", "OrderedDict", "defaultdict", "dict"})
SHAPELESS_VALUES = frozenset({"Any", "object"})


def _signature_annotations(tree: ast.Module) -> Iterator[ast.expr]:
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef):
            args = node.args
            for arg in [*args.posonlyargs, *args.args, *args.kwonlyargs]:
                if arg.annotation is not None:
                    yield arg.annotation
            for arg in (args.vararg, args.kwarg):
                if arg is not None and arg.annotation is not None:
                    yield arg.annotation
            if node.returns is not None:
                yield node.returns


def _str_dicts(annotation: ast.expr) -> Iterator[tuple[ast.Subscript, bool]]:
    """Yield (node, is_shapeless) for each str-keyed dict in the annotation."""
    for node in ast.walk(annotation):
        if not isinstance(node, ast.Subscript):
            continue
        if tail_name(node.value) not in DICT_NAMES:
            continue
        match node.slice:
            case ast.Tuple(elts=[key, value, *_]) if tail_name(key) == "str":
                yield node, tail_name(value) in SHAPELESS_VALUES


@rule
def str_dict_signatures(
    path: Path,
    _source: str,
    tree: ast.Module,
    _tokens: list[tokenize.TokenInfo],
) -> list[Finding]:
    """Flag str-keyed dict annotations on function args and returns."""
    return [
        Finding(
            path,
            node.lineno,
            node.col_offset + 1,
            "SLOP004",
            "Shapeless str-keyed dict in a signature; define a dataclass or TypedDict for the shape"
            if shapeless
            else "str-keyed dict in a signature; if the keys are a fixed shape, use a dataclass or TypedDict",
            end_line=node.end_lineno,
            end_col=None if node.end_col_offset is None else node.end_col_offset + 1,
            level="error" if shapeless else "warn",
        )
        for annotation in _signature_annotations(tree)
        for node, shapeless in _str_dicts(annotation)
    ]
