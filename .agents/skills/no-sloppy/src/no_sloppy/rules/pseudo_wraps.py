"""SLOP014: unnecessary continuation lines well below the project line limit.

A statement split across lines that would fit on one line with at least `WRAP_MARGIN` columns to spare is a
pseudo-wrap: it spends the reader's vertical space and suggests structure that is not there. The same goes for prose
in docstrings and comments that breaks a line early while the next word would still fit. The limit is the project's
own (see `line_length`), falling back to 120 columns.

Layout that carries meaning stays intact: multi-line literal containers (they may be tables), comprehensions with a
filter or a second `for` that put each clause on its own line, statements with a comment on an inner line, a blank
line inside, or a string that spans lines, and prose broken by blank lines, list items, headings, fences, or indented
examples. A single comment on a wrapped statement's first or last line does not protect it, since joining moves the
comment to the end of the line.

Each finding is an error spanning the whole statement or paragraph, so a `# noqa: SLOP014` on any of its lines applies.
"""

import ast
import re
import tokenize
from bisect import bisect_left
from itertools import pairwise
from typing import TYPE_CHECKING

from no_sloppy.line_limit import WRAP_MARGIN, line_length

from . import Finding, rule

if TYPE_CHECKING:
    from pathlib import Path

def _prose_groups(lines: list[str], tree: ast.Module, tokens: list[tokenize.TokenInfo]) -> list[tuple[int, list[str]]]:
    """Collect the prose in docstrings and comments as `(first line, lines)` groups.

    Only module, class, and function docstrings count, since the newlines in any other string are content rather than
    layout. A docstring's group has its quotes and string prefix stripped and its continuation lines de-indented by the
    docstring's column, so item `i` of the lines is source line `first + i`. Consecutive comment-only lines form one
    group with the leading `#` and one space removed; a comment after code on the same line is not prose.
    """
    groups: list[tuple[int, list[str]]] = []

    for node in ast.walk(tree):
        if not isinstance(node, ast.Module | ast.ClassDef | ast.FunctionDef | ast.AsyncFunctionDef):
            continue
        if not node.body or not isinstance(node.body[0], ast.Expr):
            continue

        value = node.body[0].value
        if not isinstance(value, ast.Constant) or not isinstance(value.value, str) or value.end_lineno is None:
            continue

        content = lines[value.lineno - 1 : value.end_lineno]
        content[0] = re.sub(r'^\s*[ruRU]*(?:"""|\'\'\')', "", content[0])
        content[-1] = re.sub(r'(?:"""|\'\'\')\s*$', "", content[-1])
        continuation = [line.removeprefix(" " * value.col_offset) for line in content[1:]]
        groups.append((value.lineno, [content[0], *continuation]))

    for token in tokens:
        if token.type != tokenize.COMMENT or token.line[: token.start[1]].strip():
            continue

        content = re.sub(r"^# ?", "", token.string)

        if groups and groups[-1][0] + len(groups[-1][1]) == token.start[0]:
            groups[-1][1].append(content)
        else:
            groups.append((token.start[0], [content]))

    return groups


def _prose_wraps(path: Path, lines: list[str], tree: ast.Module, tokens: list[tokenize.TokenInfo]) -> list[Finding]:
    """Report each prose paragraph that wraps early, once, as a finding spanning the whole paragraph.

    A paragraph is a run of lines in one docstring or comment block that join as prose: a blank, indented, fenced, or
    structural line (list item, heading, directive) ends it. It wraps early when one of its lines ends at least
    `WRAP_MARGIN` columns short of the limit while the next line's first word would still fit.
    """
    limit = line_length(path)
    structural = re.compile(r"^(?:[-*+]\s|\d+[.)]\s|[@:#>|]|```|~~~|[=-]{3,}|[A-Za-z][A-Za-z /-]*:{1,2}$)")
    paragraphs: list[tuple[int, int, bool]] = []

    for start, content in _prose_groups(lines, tree, tokens):
        fenced = False

        for index, (current, following) in enumerate(pairwise(content)):
            if current.lstrip().startswith(("```", "~~~")):
                fenced = not fenced

            if fenced or not current.strip() or not following.strip():
                continue
            if current[0].isspace() or following[0].isspace():
                continue
            if structural.match(current) or structural.match(following):
                continue

            line = start + index
            width = len(lines[line - 1].rstrip().expandtabs(8))
            fits = width <= limit - WRAP_MARGIN and width + 1 + len(following.split()[0]) <= limit
            early = fits and re.search(r"[a-zA-Z].*\s+[a-zA-Z]", current) is not None

            if paragraphs and paragraphs[-1][1] == line:
                first, _, wrapped = paragraphs.pop()
                paragraphs.append((first, line + 1, wrapped or early))
            else:
                paragraphs.append((line, line + 1, early))

    message = f"Premature prose wrap: fill each line to the {limit}-column limit before continuing the paragraph"
    return [Finding(path, first, 1, "SLOP014", message, end_line=last) for first, last, early in paragraphs if early]


def _clause_layouts(lines: list[str], tree: ast.Module, tokens: list[tokenize.TokenInfo]) -> set[int]:
    """Lines of comprehensions laid out one clause per line, which is structure rather than a wrap.

    A comprehension qualifies when it has a filter or a second `for` (so there are clauses to separate) and every
    line break inside it falls just inside its brackets or directly before a `for`, `async for`, or `if` clause.
    """
    code = [token for token in tokens if token.type not in (tokenize.NL, tokenize.COMMENT)]
    starts = [token.start for token in code]

    def position(line: int, byte_col: int) -> tuple[int, int]:
        # ast columns count UTF-8 bytes; tokenize columns count characters.
        return line, len(lines[line - 1].encode()[:byte_col].decode(errors="ignore"))

    def keyword(expr: ast.expr) -> tuple[int, int]:
        index = bisect_left(starts, position(expr.lineno, expr.col_offset)) - 1

        while index > 0 and code[index].string == "(":
            index -= 1

        if code[index].string == "for" and index > 0 and code[index - 1].string == "async":
            index -= 1

        return code[index].start

    covered: set[int] = set()

    for node in ast.walk(tree):
        if not isinstance(node, ast.ListComp | ast.SetComp | ast.DictComp | ast.GeneratorExp):
            continue

        clauses = [expr for generator in node.generators for expr in (generator.target, *generator.ifs)]
        end_lineno = node.end_lineno or node.lineno

        if len(clauses) == 1 or end_lineno == node.lineno:
            continue

        first = bisect_left(starts, position(node.lineno, node.col_offset))
        last = bisect_left(starts, position(end_lineno, node.end_col_offset or 0)) - 1
        keywords = {keyword(expr) for expr in clauses}
        breaks = [
            (earlier, later)
            for earlier, later in pairwise(range(first, last + 1))
            if code[later].start[0] != code[earlier].end[0]
        ]

        if all(earlier == first or later == last or code[later].start in keywords for earlier, later in breaks):
            covered.update(range(node.lineno, end_lineno + 1))

    return covered


def _code_wrap(
    path: Path, lines: list[str], logical: list[tokenize.TokenInfo], limit: int, layouts: set[int]
) -> list[Finding]:
    """Report a logical line that spans several physical lines but would fit well within `limit` joined.

    Joining moves a single comment on the first or last line to the end, so such a comment does not protect the
    wrap. A comment on an inner line, a string that spans lines, or a line inside a table-like layout does. The
    finding spans the whole statement.
    """
    start, end = logical[0].start[0], logical[-1].end[0]
    comments = [token for token in logical if token.type == tokenize.COMMENT]
    multiline = any(token.type != tokenize.COMMENT and token.start[0] != token.end[0] for token in logical)
    inner = len(comments) > 1 or any(comment.start[0] not in {start, end} for comment in comments)

    if start == end or multiline or inner or layouts.intersection(range(start, end + 1)):
        return []

    parts = lines[start - 1 : end]

    for comment in comments:
        row = comment.start[0] - start
        parts[row] = parts[row][: comment.start[1]]

    joined = " ".join([parts[0].rstrip(), *(part.strip() for part in parts[1:])])
    joined += "".join(f"  {comment.string}" for comment in comments)

    if not all(part.strip() for part in parts) or len(joined.expandtabs(8)) > limit - WRAP_MARGIN:
        return []

    message = f"Unnecessary wrap at least {WRAP_MARGIN} columns below the {limit}-column limit"
    return [Finding(path, start, logical[0].start[1] + 1, "SLOP014", message, end_line=end)]


@rule
def pseudo_wraps(path: Path, source: str, tree: ast.Module, tokens: list[tokenize.TokenInfo]) -> list[Finding]:
    """Check complete logical lines; block bodies and table-like data stay separate."""
    limit = line_length(path)
    lines = source.splitlines()

    # Literal containers may encode table rows, and comprehensions may put each clause on its own line. Calls,
    # imports, signatures, and operators remain eligible.
    layouts = {
        line
        for node in ast.walk(tree)
        if isinstance(node, ast.Dict | ast.List | ast.Set | ast.Tuple)
        if node.end_lineno is not None and node.end_lineno > node.lineno
        for line in range(node.lineno, node.end_lineno + 1)
    } | _clause_layouts(lines, tree, tokens)
    findings = _prose_wraps(path, lines, tree, tokens)
    logical: list[tokenize.TokenInfo] = []

    for token in tokens:
        if token.type in (tokenize.INDENT, tokenize.DEDENT, tokenize.ENDMARKER):
            continue

        # A comment on its own line belongs to no statement; it must not open the next one.
        if token.type == tokenize.NL and all(t.type == tokenize.COMMENT for t in logical):
            logical = []
            continue

        if token.type != tokenize.NEWLINE:
            if token.type != tokenize.NL:
                logical.append(token)
            continue

        if logical:
            findings.extend(_code_wrap(path, lines, logical, limit, layouts))

        logical = []

    return findings
