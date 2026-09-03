"""Custom slop rules: patterns the ruff overlay can't express.

Each rule lives in its own module in this package, is registered with @rule,
and is auto-imported by run_rules(). Favor precision over recall: the
consumer is an LLM mid-task, and noisy rules get ignored or cause fix-churn.
"""

import ast
import importlib
import io
import os
import re
import tokenize
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING, Literal

if TYPE_CHECKING:
    from collections.abc import Callable

type Level = Literal["heuristic", "warn", "error"]

RESET = "\x1b[0m"
BOLD = "\x1b[1m"
BLUE = "\x1b[1;34m"
LEVEL_COLORS = {"error": "\x1b[1;31m", "warn": "\x1b[1;33m", "heuristic": "\x1b[1;36m"}


@dataclass
class Finding:
    """One lint finding, from the ruff overlay or a custom rule."""

    path: Path
    start_line: int
    start_col: int
    code: str
    message: str
    end_line: int | None = None
    end_col: int | None = None
    level: Level = "error"

    def render(self, line_text: str | None, *, color: bool = False) -> str:
        """Render a rustc-style block with the offending source line."""
        rel = os.path.relpath(self.path)
        label = "warning" if self.level == "warn" else self.level
        tint = LEVEL_COLORS[self.level] if color else ""
        accent = BLUE if color else ""
        bold = BOLD if color else ""
        reset = RESET if color else ""

        out = [
            f"{tint}{label}[{self.code}]{reset}{bold}: {self.message}{reset}",
            f"  {accent}-->{reset} {rel}:{self.start_line}:{self.start_col}",
        ]

        if line_text is not None:
            display = line_text.replace("\t", " ")

            if self.end_line == self.start_line and self.end_col is not None:
                span = max(self.end_col - self.start_col, 1)
            elif self.end_line is not None and self.end_line > self.start_line:
                span = max(len(display) - self.start_col + 1, 1)
            else:
                span = 1

            num = str(self.start_line)
            pad = " " * len(num)
            out += [
                f"{pad} {accent}|{reset}",
                f"{accent}{num} |{reset} {display}",
                f"{pad} {accent}|{reset} {' ' * (self.start_col - 1)}{tint}{'^' * span}{reset}",
            ]

        return "\n".join(out)


type RuleFunc = Callable[
    [Path, str, ast.Module, list[tokenize.TokenInfo]], list[Finding]
]
RULES: list[RuleFunc] = []


def rule(func: RuleFunc) -> RuleFunc:
    """Register a custom slop rule.

    A rule receives the file path, source text, parsed AST, and token list
    (comments included), and returns findings with SLOPxxx codes. See
    banner_comments.py for the template.
    """
    RULES.append(func)
    return func


def tail_name(node: ast.expr) -> str | None:
    """Rightmost identifier of a plain or dotted reference, else None."""
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        return node.attr
    return None


def code_body(body: list[ast.stmt]) -> list[ast.stmt]:
    """Body statements with a leading docstring stripped."""
    match body:
        case [ast.Expr(value=ast.Constant(value=str())), *rest]:
            return rest
        case _:
            return body


def handler_catches(handler: ast.ExceptHandler, names: frozenset[str]) -> bool:
    """Whether the except clause catches one of `names` (bare excepts do)."""
    match handler.type:
        case None:
            return True
        case ast.Tuple(elts=elts):
            return any(tail_name(elt) in names for elt in elts)
        case _:
            return tail_name(handler.type) in names


def handler_swallows(handler: ast.ExceptHandler) -> bool:
    """Whether the handler suppresses the exception: no raise anywhere in it."""
    return not any(isinstance(node, ast.Raise) for node in ast.walk(handler))


NOQA_DIRECTIVE = re.compile(r"#\s*noqa\b(?::(?P<codes>[^#]*))?", re.IGNORECASE)


def _suppressed_codes(tokens: list[tokenize.TokenInfo]) -> dict[int, set[str]]:
    """Map lines carrying a noqa comment to the codes suppressed there.

    An empty set means a bare `# noqa`: every code is suppressed on that line.
    """
    suppressed: dict[int, set[str]] = {}
    for tok in tokens:
        if tok.type != tokenize.COMMENT:
            continue
        match = NOQA_DIRECTIVE.search(tok.string)
        if match is None:
            continue
        codes = match.group("codes")
        suppressed[tok.start[0]] = (
            set(re.findall(r"[A-Z]+\d+", codes.upper())) if codes else set()
        )
    return suppressed


def run_rules(py_files: list[Path]) -> list[Finding]:
    """Discover and run every rule on the specified Python files."""
    # Import every sibling module so its @rule registrations run.
    for mod in sorted(Path(__file__).parent.glob("*.py")):
        if mod.stem != "__init__":
            importlib.import_module(f"{__name__}.{mod.stem}")

    if not RULES:
        return []

    findings: list[Finding] = []
    for path in py_files:
        source = path.read_text(encoding="utf-8", errors="replace")

        try:
            tree = ast.parse(source)
            tokens = list(tokenize.generate_tokens(io.StringIO(source).readline))
        except (SyntaxError, tokenize.TokenError):
            continue  # ruff already reports syntax errors

        noqa = _suppressed_codes(tokens)
        for check in RULES:
            for finding in check(path, source, tree, tokens):
                codes = noqa.get(finding.start_line)
                if codes is not None and (not codes or finding.code in codes):
                    continue
                findings.append(finding)

    return findings
