"""SLOP014: unnecessary continuation lines well below the project line limit."""

import ast
import configparser
import re
import tokenize
import tomllib
from itertools import pairwise
from typing import TYPE_CHECKING

from . import Finding, rule

if TYPE_CHECKING:
    from pathlib import Path

DEFAULT_LINE_LENGTH = 120
WRAP_MARGIN = 20


def _ruff_limit(config: Path) -> int | None:
    """Follow Ruff's explicit config inheritance without applying its default width."""
    seen: set[Path] = set()
    width: int | None = None

    while config not in seen:
        seen.add(config)
        data = tomllib.loads(config.read_text())
        settings = data.get("tool", {}).get("ruff", {}) if config.name == "pyproject.toml" else data

        if (limit := settings.get("lint", {}).get("pycodestyle", {}).get("max-line-length")) is not None:
            return int(limit)
        if width is None and (limit := settings.get("line-length")) is not None:
            width = int(limit)
        if not (parent := settings.get("extend")):
            return width

        config = (config.parent / parent).resolve()

    msg = f"Cyclic Ruff configuration inheritance: {config}"
    raise ValueError(msg)


def _ruff_config(directory: Path) -> Path | None:
    """Ignore pyproject files without Ruff settings when discovering the nearest config."""
    for name in (".ruff.toml", "ruff.toml", "pyproject.toml"):
        config = directory / name
        if not config.is_file():
            continue

        if name == "pyproject.toml" and "ruff" not in tomllib.loads(config.read_text()).get("tool", {}):
            continue

        return config

    return None


def line_length(path: Path) -> int:
    """Read the nearest explicit Ruff, Flake8, or Pylint line limit."""
    ruff_found = False

    for directory in path.resolve().parents:
        if not ruff_found and (config := _ruff_config(directory)) is not None:
            ruff_found = True
            if (limit := _ruff_limit(config)) is not None:
                return limit

        for name in (".flake8", "setup.cfg", "tox.ini"):
            config = directory / name
            if config.is_file():
                settings = configparser.ConfigParser(interpolation=None)
                settings.read(config)
                if settings.has_option("flake8", "max-line-length"):
                    return settings.getint("flake8", "max-line-length")

        config = directory / "pyproject.toml"
        if config.is_file():
            settings = tomllib.loads(config.read_text()).get("tool", {}).get("pylint", {}).get("format", {})
            if (limit := settings.get("max-line-length")) is not None:
                return int(limit)

        if (directory / ".git").exists():
            break

    return DEFAULT_LINE_LENGTH


def _prose_groups(lines: list[str], tree: ast.Module, tokens: list[tokenize.TokenInfo]) -> list[tuple[int, list[str]]]:
    """Separate documentation prose from strings whose literal newlines affect program behavior."""
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
    """Inspect paragraph continuations without merging structural lines or indented examples."""
    limit = line_length(path)
    findings: list[Finding] = []
    structural = re.compile(r"^(?:[-*+]\s|\d+[.)]\s|[@:#>|]|```|~~~|[=-]{3,}|[A-Za-z][A-Za-z /-]*:{1,2}$)")

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
            if not re.search(r"[a-zA-Z].*\s+[a-zA-Z]", current):
                continue

            width = len(lines[start + index - 1].rstrip().expandtabs(8))
            next_word = following.split()[0]
            if width <= limit - WRAP_MARGIN and width + 1 + len(next_word) <= limit:
                message = f"Premature prose wrap: fill the {limit}-column line before continuing this paragraph"
                findings.append(Finding(path, start + index + 1, 1, "SLOP014", message))

    return findings


@rule
def pseudo_wraps(path: Path, source: str, tree: ast.Module, tokens: list[tokenize.TokenInfo]) -> list[Finding]:
    """Check complete logical lines; block bodies and table-like data stay separate."""
    limit = line_length(path)
    lines = source.splitlines()

    # Literal containers may encode table rows. Calls, imports, signatures, and operators remain eligible.
    layouts = {
        line
        for node in ast.walk(tree)
        if isinstance(node, ast.Dict | ast.List | ast.Set | ast.Tuple)
        if node.end_lineno is not None and node.end_lineno > node.lineno
        for line in range(node.lineno, node.end_lineno + 1)
    }
    findings = _prose_wraps(path, lines, tree, tokens)
    logical: list[tokenize.TokenInfo] = []

    for token in tokens:
        if token.type in (tokenize.INDENT, tokenize.DEDENT, tokenize.ENDMARKER):
            continue

        if token.type != tokenize.NEWLINE:
            if token.type != tokenize.NL:
                logical.append(token)
            continue

        if logical:
            start, end = logical[0].start[0], token.end[0]
            unsafe = any(t.type == tokenize.COMMENT or t.start[0] != t.end[0] for t in logical)

            if start < end and not unsafe and not layouts.intersection(range(start, end + 1)):
                parts = lines[start - 1 : end]
                joined = " ".join([parts[0].rstrip(), *(part.strip() for part in parts[1:])])

                if all(part.strip() for part in parts) and len(joined.expandtabs(8)) <= limit - WRAP_MARGIN:
                    findings.append(
                        Finding(
                            path,
                            start + 1,
                            1,
                            "SLOP014",
                            f"Unnecessary wrap at least {WRAP_MARGIN} columns below the {limit}-column limit",
                            end_line=end,
                        )
                    )

        logical = []

    return findings
