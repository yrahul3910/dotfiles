"""SLOP011: no self-praise in comments or docstrings.

Adjectives that advertise the code instead of describing it (see WORDS for
the list) say nothing a reader can verify and usually arrive with freshly
generated code. Word-list matching over comments and docstrings only --
regular strings are user-facing content and stay out of scope. Some of
these words are legitimate terms of art in some domains, hence heuristic
level: judge each finding.
"""

import ast
import re
import tokenize
from typing import TYPE_CHECKING

from . import Finding, rule

if TYPE_CHECKING:
    from collections.abc import Iterator
    from pathlib import Path

WORDS = re.compile(
    r"""\b(
        robust(?:ly)?
        | powerful
        | comprehensive(?:ly)?
        | seamless(?:ly)?
        | elegant(?:ly)?
        | effortless(?:ly)?
        | sophisticated
        | performant
        | gracefully
        | scalable
        | production[- ](?:ready|grade)
        | enterprise[- ]grade
        | battle[- ]tested
        | blazing(?:ly)?(?:[- ]fast)?
        | cutting[- ]edge
        | state[- ]of[- ]the[- ]art
        | world[- ]class
        | best[- ]in[- ]class
        | full[- ]featured
        | feature[- ]rich
        | lightning[- ]fast
        | easy[- ]to[- ]use
    )\b""",
    re.IGNORECASE | re.VERBOSE,
)


def _docstring_spans(tree: ast.Module) -> Iterator[tuple[int, int]]:
    """Yield the (start, end) line span of every docstring in the module."""
    for node in ast.walk(tree):
        if isinstance(node, ast.Module | ast.ClassDef | ast.FunctionDef | ast.AsyncFunctionDef):
            match node.body:
                case [ast.Expr(value=ast.Constant(value=str()) as const), *_]:
                    yield const.lineno, const.end_lineno or const.lineno


def _finding(path: Path, lineno: int, col: int, match: re.Match[str]) -> Finding:
    """Build the SLOP011 finding for one matched adjective."""
    word = match.group(0)
    return Finding(
        path,
        lineno,
        col + 1,
        "SLOP011",
        f"Marketing adjective {word!r}; describe what the code does, not how impressive it is",
        end_line=lineno,
        end_col=col + 1 + len(word),
        level="heuristic",
    )


@rule
def marketing_adjectives(
    path: Path,
    source: str,
    tree: ast.Module,
    tokens: list[tokenize.TokenInfo],
) -> list[Finding]:
    """Flag self-praise adjectives in comments and docstrings."""
    findings = []

    for tok in tokens:
        if tok.type == tokenize.COMMENT:
            findings += [
                _finding(path, tok.start[0], tok.start[1] + match.start(), match)
                for match in WORDS.finditer(tok.string)
            ]

    src_lines = source.splitlines()
    for start, end in _docstring_spans(tree):
        for lineno in range(start, min(end, len(src_lines)) + 1):
            findings += [
                _finding(path, lineno, match.start(), match) for match in WORDS.finditer(src_lines[lineno - 1])
            ]

    return findings
