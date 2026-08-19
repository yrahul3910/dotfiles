"""SLOP007: no changelog comments -- describe the code, not the diff.

Comments that narrate a change ("now uses X", "previously...", "kept for
backwards compatibility") document history the reader can't see and git
already records. Pattern-matched, so this is a heuristic: expect the
occasional false positive and judge each finding.
"""

import re
import tokenize
from typing import TYPE_CHECKING

from . import Finding, rule

if TYPE_CHECKING:
    import ast
    from pathlib import Path

CHANGELOG_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in (
        r"^#+\s*(added|fixed|updated|changed|removed|renamed|refactored|moved|rewrote)\b",
        r"\b(previously|formerly)\b",
        r"\bused to (be|do|return|use|call)\b",
        r"\bno longer\b",
        r"\bnow (uses|returns|takes|handles|supports|calls|accepts|does)\b",
        r"\bchanged (from|to)\b",
        r"\bbackwards?[- ]compat",
        r"\bas (requested|discussed)\b",
        r"\bper (your|the) (request|instructions?|discussion)\b",
        r"\bmigrated (from|to)\b",
        r"\binstead of the (old|previous)\b",
        r"\b(old|previous) (implementation|version|behaviou?r|code)\b",
    )
]


@rule
def changelog_comments(
    path: Path,
    _source: str,
    _tree: ast.Module,
    tokens: list[tokenize.TokenInfo],
) -> list[Finding]:
    """Flag comments that narrate the change instead of the code."""
    findings = []
    for tok in tokens:
        if tok.type != tokenize.COMMENT:
            continue
        for pattern in CHANGELOG_PATTERNS:
            match = pattern.search(tok.string)
            if match:
                findings.append(
                    Finding(
                        path,
                        tok.start[0],
                        tok.start[1] + 1,
                        "SLOP007",
                        f"Changelog/diff-narration comment ({match.group(0).strip()!r}); "
                        "describe the code as it is -- history lives in git",
                        end_line=tok.end[0],
                        end_col=tok.end[1] + 1,
                        level="heuristic",
                    )
                )
                break
    return findings
