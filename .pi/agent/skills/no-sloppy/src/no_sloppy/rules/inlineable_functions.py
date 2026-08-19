"""SLOP005: functions that should be inlined at their call sites.

Two triggers, both advisory: a function that collapses to a single
120-column line, or a function referenced exactly once in the module with a
body under 5 lines (comments included). Decorated functions are exempt --
a decorator means the function is registered or wrapped, not merely called.
Dunders and stub bodies (`...`, `pass`, bare `raise`) are also exempt.
"""

import ast
from collections import Counter
from typing import TYPE_CHECKING

from . import Finding, code_body, rule

if TYPE_CHECKING:
    import tokenize
    from pathlib import Path

MAX_COLLAPSED_LEN = 120
MAX_TINY_BODY_LINES = 5


def _is_stub_stmt(stmt: ast.stmt) -> bool:
    """Check for stub statements: `...`, `pass`, or a bare raise."""
    match stmt:
        case ast.Pass() | ast.Raise():
            return True
        case ast.Expr(value=ast.Constant(value=value)):
            return value is ...
        case _:
            return False


@rule
def inlineable_functions(
    path: Path,
    source: str,
    tree: ast.Module,
    _tokens: list[tokenize.TokenInfo],
) -> list[Finding]:
    """Flag functions that could be inlined at their call sites."""
    src_lines = source.splitlines()

    refs: Counter[str] = Counter()
    for node in ast.walk(tree):
        if isinstance(node, ast.Name):
            refs[node.id] += 1
        elif isinstance(node, ast.Attribute):
            refs[node.attr] += 1

    funcs = [node for node in ast.walk(tree) if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef)]

    findings = []
    for func in funcs:
        dunder = func.name.startswith("__") and func.name.endswith("__")
        if func.decorator_list or dunder:
            continue

        stmts = code_body(func.body)
        if not stmts or all(_is_stub_stmt(stmt) for stmt in stmts):
            continue

        end = func.end_lineno or func.lineno
        body_lines = end - func.body[0].lineno + 1

        # Collapse signature plus code body, skipping any docstring -- it
        # disappears when the function is inlined.
        stmt = stmts[0]
        seg_lines = (
            src_lines[func.lineno - 1 : func.body[0].lineno - 1]
            + src_lines[stmt.lineno - 1 : (stmt.end_lineno or stmt.lineno)]
        )
        collapsed = " ".join(line.strip() for line in seg_lines)

        if len(stmts) == 1 and len(collapsed) <= MAX_COLLAPSED_LEN:
            message = "Function fits on one line; inline it at its call sites"
        elif refs[func.name] == 1 and body_lines < MAX_TINY_BODY_LINES:
            message = f"Function is called once and is under {MAX_TINY_BODY_LINES} lines; inline it at the call site"
        else:
            continue

        prefix = "async def " if isinstance(func, ast.AsyncFunctionDef) else "def "
        findings.append(
            Finding(
                path,
                func.lineno,
                func.col_offset + 1,
                "SLOP005",
                message,
                end_line=func.lineno,
                end_col=func.col_offset + len(prefix) + len(func.name) + 1,
                level="warn",
            )
        )

    return findings
