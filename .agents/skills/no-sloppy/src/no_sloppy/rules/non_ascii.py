"""SLOP006: plain ASCII only -- no emoji, smart punctuation, or decoration.

Accented Latin letters (and combining marks) are allowed outright: they
decompose to an ASCII base letter and usually spell a name. Other non-ASCII
letters, marks, and digits may be legitimate natural-language content, so
they only warn; everything else (emoji, smart punctuation, arrows, box
drawing, invisible format characters) is an error.
"""

import re
import unicodedata
from typing import TYPE_CHECKING, Literal

from . import Finding, rule

if TYPE_CHECKING:
    import ast
    import tokenize
    from pathlib import Path

NON_ASCII_RUN = re.compile(r"[^\x00-\x7f]+")


def _classify(ch: str) -> Literal["ok", "warn", "error"]:
    """Sort a character into allowed accent, tolerable text, or slop."""
    category = unicodedata.category(ch)
    if category.startswith("M"):
        return "ok"
    if category.startswith("L"):
        base = unicodedata.normalize("NFKD", ch)[0]
        return "ok" if base.isascii() else "warn"
    return "warn" if category.startswith("N") else "error"


@rule
def non_ascii(
    path: Path,
    source: str,
    _tree: ast.Module,
    _tokens: list[tokenize.TokenInfo],
) -> list[Finding]:
    """Flag non-ASCII runs; emoji and smart punctuation are errors."""
    findings = []
    for lineno, line in enumerate(source.splitlines(), start=1):
        for match in NON_ASCII_RUN.finditer(line):
            run = match.group()
            classes = [_classify(ch) for ch in run]
            if "error" in classes:
                level = "error"
            elif "warn" in classes:
                level = "warn"
            else:
                continue

            offender = run[classes.index(level)]
            name = unicodedata.name(offender, f"U+{ord(offender):04X}")
            message = (
                f"Non-ASCII text ({name}); prefer plain ASCII unless the content genuinely needs it"
                if level == "warn"
                else f"Non-ASCII character(s) ({name}); no emoji or Unicode decoration -- plain ASCII only"
            )
            findings.append(
                Finding(
                    path,
                    lineno,
                    match.start() + 1,
                    "SLOP006",
                    message,
                    end_line=lineno,
                    end_col=match.end() + 1,
                    level=level,
                )
            )
    return findings
