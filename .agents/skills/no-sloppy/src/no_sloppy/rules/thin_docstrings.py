"""SLOP013: a one-line docstring on a non-trivial function is a caption, not documentation.

On a long function, or one with several `raise` sites, a single summary line cannot say what callers get back, what the
function guarantees, or how it fails. Write the contract: the summary line, a blank line, then the result, the
invariants, and the failure outcomes. Short functions with an obvious contract keep their one-liners. Advisory, because
the fix needs judgement about what the contract actually is.

A module whose only public definition is one function exists for that function, so when the module docstring has a
body beyond its summary line, that docstring is the function's documentation and the function's own one-liner is a
fair summary. Repeating the contract in both places would only let them drift apart.
"""

import ast
from typing import TYPE_CHECKING

from . import Finding, rule

if TYPE_CHECKING:
    import tokenize
    from pathlib import Path

MIN_BODY_LINES = 20
MIN_RAISES = 2


def _documented_by_module(tree: ast.Module) -> ast.AST | None:
    """Return the function the module docstring documents, or None when there is no such function.

    That is the module's only public function, when the module defines no other public function or class and its
    docstring has at least one paragraph after the summary line.
    """
    doc = ast.get_docstring(tree) or ""
    definitions = (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)
    public = [node for node in tree.body if isinstance(node, definitions) and not node.name.startswith("_")]

    match public:
        case [ast.FunctionDef() | ast.AsyncFunctionDef() as only] if "\n\n" in doc.strip():
            return only
        case _:
            return None


def _raise_sites(body: list[ast.stmt]) -> int:
    """Count `raise <exc>` statements in `body` without entering nested scopes.

    A bare re-raise propagates an existing failure and is not counted.
    """
    count = 0
    pending: list[ast.AST] = list(body)

    while pending:
        node = pending.pop()
        if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef | ast.ClassDef | ast.Lambda):
            continue
        if isinstance(node, ast.Raise) and node.exc is not None:
            count += 1
        pending.extend(ast.iter_child_nodes(node))

    return count


@rule
def thin_docstrings(
    path: Path,
    _source: str,
    tree: ast.Module,
    _tokens: list[tokenize.TokenInfo],
) -> list[Finding]:
    """Flag one-line docstrings on functions whose contract needs more than a caption.

    A docstring counts as one line when it has exactly one non-blank line. It is flagged when the body after it spans at
    least `MIN_BODY_LINES` lines or holds at least `MIN_RAISES` `raise` sites outside nested scopes, unless the module
    docstring documents the function (see the module docstring). Findings anchor on the docstring and are warnings.
    """
    findings = []
    entry = _documented_by_module(tree)
    funcs = [node for node in ast.walk(tree) if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef)]

    for func in funcs:
        if func is entry:
            continue

        match func.body:
            case [ast.Expr(value=ast.Constant(value=str() as text)) as doc, first, *rest]:
                pass
            case _:
                continue

        if sum(bool(line.strip()) for line in text.splitlines()) != 1:
            continue

        body_lines = (func.end_lineno or func.lineno) - first.lineno + 1
        raises = _raise_sites([first, *rest])
        reasons = []
        if body_lines >= MIN_BODY_LINES:
            reasons.append(f"{body_lines}-line")
        if raises >= MIN_RAISES:
            reasons.append(f"{raises}-raise")
        if not reasons:
            continue

        findings.append(
            Finding(
                path,
                doc.lineno,
                doc.col_offset + 1,
                "SLOP013",
                f"One-line docstring on a {', '.join(reasons)} function; a caption cannot state the "
                "contract -- say what callers get back, what is guaranteed, and how it fails",
                end_line=doc.end_lineno,
                end_col=(doc.end_col_offset or doc.col_offset) + 1,
                level="warn",
            )
        )

    return findings
