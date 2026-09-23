"""SLOP005: functions that should be inlined at their call sites.

Two triggers, both advisory. A pass-through, a function whose whole body calls one other function with nothing but
its own parameters (`def load(path): return read(path)`), only renames that function, so callers should call it
directly. A function referenced exactly once in its module with a body under 5 lines (comments included) is a
one-shot helper that adds a layer to chase. A short function that does its own work, such as a predicate or a small
computation, is never flagged for being short: reuse or a name that documents intent justifies it.

Methods are exempt: they are part of a class's interface, and their callers may live in other modules. Decorated
functions are exempt too (a decorator means the function is registered or wrapped, not merely called), as are
dunders and stub bodies (`...`, `pass`, bare `raise`).
"""

import ast
from collections import Counter
from typing import TYPE_CHECKING

from . import Finding, code_body, rule

if TYPE_CHECKING:
    import tokenize
    from pathlib import Path

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


def _forwarded(func: ast.FunctionDef | ast.AsyncFunctionDef) -> str | None:
    """Return the callee `func` passes its parameters straight through to, or None when it does more than that.

    The body must be a single call, returned or not and awaited or not, to a plain or `obj.attr` name, and every
    argument must be one of `func`'s own parameters (starred or not). Any computation, constant, or nested call means
    the function does its own work.
    """
    args = func.args
    params = {arg.arg for arg in (*args.posonlyargs, *args.args, *args.kwonlyargs, args.vararg, args.kwarg) if arg}

    match code_body(func.body):
        case [ast.Return(value=ast.expr() as value)] | [ast.Expr(value=value)]:
            call = value.value if isinstance(value, ast.Await) else value
        case _:
            return None

    if not isinstance(call, ast.Call) or not isinstance(call.func, ast.Name | ast.Attribute):
        return None

    if isinstance(call.func, ast.Attribute) and not isinstance(call.func.value, ast.Name):
        return None

    arguments = [arg.value if isinstance(arg, ast.Starred) else arg for arg in call.args]
    arguments += [keyword.value for keyword in call.keywords]
    forwards = all(isinstance(arg, ast.Name) and arg.id in params for arg in arguments)

    return ast.unparse(call.func) if forwards else None


@rule
def inlineable_functions(
    path: Path,
    _source: str,
    tree: ast.Module,
    _tokens: list[tokenize.TokenInfo],
) -> list[Finding]:
    """Warn on pass-through functions and on one-shot helpers under `MAX_TINY_BODY_LINES` lines.

    References are counted by name within the module only (plain names and attribute names alike), so a function
    that other modules also call can still look one-shot here; that is part of why the rule is advisory. Each finding
    anchors on the function's name.
    """
    refs: Counter[str] = Counter()

    for node in ast.walk(tree):
        if isinstance(node, ast.Name):
            refs[node.id] += 1
        elif isinstance(node, ast.Attribute):
            refs[node.attr] += 1

    methods = {stmt for node in ast.walk(tree) if isinstance(node, ast.ClassDef) for stmt in node.body}
    funcs = [node for node in ast.walk(tree) if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef)]
    findings = []

    for func in funcs:
        dunder = func.name.startswith("__") and func.name.endswith("__")

        if func.decorator_list or dunder or func in methods:
            continue

        stmts = code_body(func.body)

        if not stmts or all(_is_stub_stmt(stmt) for stmt in stmts):
            continue

        body_lines = (func.end_lineno or func.lineno) - func.body[0].lineno + 1

        if (callee := _forwarded(func)) is not None:
            message = f"Function only forwards its parameters to `{callee}`; call that directly"
        elif refs[func.name] == 1 and body_lines < MAX_TINY_BODY_LINES:
            message = f"Function is called once and is under {MAX_TINY_BODY_LINES} lines; inline it at the call site"
        else:
            continue

        prefix = "async def " if isinstance(func, ast.AsyncFunctionDef) else "def "
        line, col = func.lineno, func.col_offset + 1
        end_col = col + len(prefix) + len(func.name)
        findings.append(Finding(path, line, col, "SLOP005", message, end_line=line, end_col=end_col, level="warn"))

    return findings
