"""Custom slop rules: patterns the ruff overlay can't express.

Each rule lives in its own module in this package, is registered with @rule, and is auto-imported by run_rules(). Favor
precision over recall: the consumer is an LLM mid-task, and noisy rules get ignored or cause fix-churn.
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

# A multi-line excerpt longer than MAX_EXCERPT keeps EXCERPT_EDGE lines at each end.
MAX_EXCERPT = 12
EXCERPT_EDGE = 5


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

    @property
    def last_line(self) -> int:
        """Last source line the finding covers; a span that ends at column 1 stops on the line before."""
        if self.end_line is None or self.end_line <= self.start_line:
            return self.start_line

        return self.end_line - 1 if self.end_col == 1 else self.end_line

    def touches(self, ranges: list[range]) -> bool:
        """Whether any line the finding covers falls in one of `ranges`."""
        return any(lines.start <= self.last_line and self.start_line < lines.stop for lines in ranges)

    def render(self, source: list[str], *, color: bool = False) -> str:
        """Render a rustc-style block: the header, the location, and the source lines the finding covers.

        `source` holds the file's lines; when it is empty (the file could not be read) the block has no excerpt. A
        single-line finding gets a caret span under its columns. A multi-line finding prints every line it covers,
        eliding the middle once there are more than `MAX_EXCERPT` of them so both ends stay visible.
        """
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
        last = min(self.last_line, len(source))

        if not 0 < self.start_line <= last:
            return "\n".join(out)

        numbers: list[int | None] = list(range(self.start_line, last + 1))

        if len(numbers) > MAX_EXCERPT:
            numbers = [*numbers[:EXCERPT_EDGE], None, *numbers[-EXCERPT_EDGE:]]

        width = max(len(str(last)), 3 if None in numbers else 1)
        gutter = f"{' ' * width} {accent}|{reset}"
        out.append(gutter)

        for number in numbers:
            if number is None:
                out.append(f"{accent}{'...':>{width}}{reset}")
            else:
                out.append(f"{accent}{number:>{width}} |{reset} {source[number - 1].replace('\t', ' ')}")

        if len(numbers) > 1:
            out.append(gutter)
            return "\n".join(out)

        display = source[self.start_line - 1].replace("\t", " ")

        if self.end_line == self.start_line and self.end_col is not None:
            span = max(self.end_col - self.start_col, 1)
        elif self.end_line is not None and self.end_line > self.start_line:
            span = max(len(display) - self.start_col + 1, 1)
        else:
            span = 1

        out.append(f"{gutter} {' ' * (self.start_col - 1)}{tint}{'^' * span}{reset}")
        return "\n".join(out)


type RuleFunc = Callable[[Path, str, ast.Module, list[tokenize.TokenInfo]], list[Finding]]
RULES: list[RuleFunc] = []


def rule(func: RuleFunc) -> RuleFunc:
    """Register a custom slop rule.

    A rule receives the file path, source text, parsed AST, and token list (comments included), and returns findings
    with SLOPxxx codes. See banner_comments.py for the template.
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
        if (match := NOQA_DIRECTIVE.search(tok.string)) is None:
            continue

        codes = match.group("codes")
        suppressed[tok.start[0]] = set(re.findall(r"[A-Z]+\d+", codes.upper())) if codes else set()

    return suppressed


def run_rules(py_files: list[Path]) -> list[Finding]:
    """Run every custom rule over `py_files` and return the findings that survive `# noqa`.

    Importing each module in this package is what registers its rules, so that happens here (a no-op after the first
    call). A file that fails to parse or tokenize is skipped without a finding, because ruff already reports the
    syntax error. A `# noqa` on any line a finding covers suppresses it when it is bare or names the finding's code;
    rules never handle noqa themselves. Findings come back grouped by file in rule-registration order, unsorted and not
    yet filtered to changed lines.
    """
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
                # A noqa anywhere in a multi-line finding's span (a wrapped call's closing line, say) applies.
                spanned = [noqa[line] for line in range(finding.start_line, finding.last_line + 1) if line in noqa]

                if not any(not codes or finding.code in codes for codes in spanned):
                    findings.append(finding)

    return findings
