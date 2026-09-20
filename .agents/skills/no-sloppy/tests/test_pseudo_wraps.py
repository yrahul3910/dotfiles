"""Regression cases for unnecessary wrapping and project-specific limits."""

import tempfile
import unittest
from pathlib import Path

from no_sloppy.rules import run_rules
from no_sloppy.rules.pseudo_wraps import line_length


class PseudoWrapTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / ".git").mkdir()
        self.path = self.root / "example.py"

    def findings(self, source: str):
        self.path.write_text(source)
        return [finding for finding in run_rules([self.path]) if finding.code == "SLOP014"]

    def test_short_continuations_are_errors(self):
        for source in (
            "result = transform(\n    value,\n    option,\n)\n",
            "def process(\n    value: str,\n) -> str:\n    return value\n",
            "from package import (\n    first, second,\n)\n",
            "result = (\n    first + second\n)\n",
        ):
            with self.subTest(source=source):
                findings = self.findings(source)
                assert len(findings) == 1
                assert findings[0].level == "error"
                assert findings[0].start_line == 2

    def test_preserves_meaningful_layout(self):
        for source in (
            "result = transform(value, option)\n",
            "result = transform(\n    value,  # Keep the explanation here.\n)\n",
            'result = transform(\n    """first\nsecond"""\n)\n',
            "rows = [\n    (1, 2),\n    (3, 4),\n]\n",
            "if ready:\n    process()\n",
            "result = transform(\n\n    value\n)\n",
        ):
            with self.subTest(source=source):
                assert self.findings(source) == []

    def test_boundary_includes_indentation(self):
        for width in (100, 101):
            source = f'result = transform(\n    "{"x" * (width - 24)}"\n)\n'
            assert len(self.findings(source)) == int(width == 100)
            indented = "if ready:\n" + "".join(f"    {line}\n" for line in source.splitlines())
            assert self.findings(indented) == []

    def test_configured_threshold_can_be_lower_or_higher(self):
        source = 'result = transform(\n    "' + "x" * 60 + '"\n)\n'
        for limit in (80, 100, 120, 160):
            (self.root / "ruff.toml").write_text(f"line-length = {limit}\n")
            assert line_length(self.path) == limit
            assert len(self.findings(source)) == int(limit >= 120)

    def test_ruff_inheritance_and_pycodestyle_limit(self):
        (self.root / "base.toml").write_text("line-length = 160\n")
        config = self.root / "ruff.toml"
        config.write_text('extend = "base.toml"\n')
        assert line_length(self.path) == 160
        config.write_text('extend = "base.toml"\nline-length = 120\n[lint.pycodestyle]\nmax-line-length = 90\n')
        assert line_length(self.path) == 90

    def test_flake8_pylint_and_default(self):
        assert line_length(self.path) == 120
        (self.root / "setup.cfg").write_text("[flake8]\nmax-line-length = 99\n")
        assert line_length(self.path) == 99
        (self.root / "setup.cfg").unlink()
        (self.root / "pyproject.toml").write_text("[tool.pylint.format]\nmax-line-length = 140\n")
        assert line_length(self.path) == 140

    def test_nearest_ruff_config_and_inherited_pycodestyle(self):
        (self.root / "ruff.toml").write_text("line-length = 80\n")
        nested = self.root / "nested"
        nested.mkdir()
        (nested / "ruff.toml").write_text("[lint]\nselect = ['E']\n")
        assert line_length(nested / "sample.py") == 120

        (self.root / "base.toml").write_text("[lint.pycodestyle]\nmax-line-length = 90\n")
        (self.root / "ruff.toml").write_text('extend = "base.toml"\nline-length = 160\n')
        assert line_length(self.path) == 90

    def test_noqa_is_honored(self):
        source = "# Return the selected item from the collection\n# when the predicate succeeds.\n"
        assert len(self.findings(source)) == 1
        assert self.findings(source.rstrip() + "  # noqa: SLOP014\n") == []

    def test_unpadded_blocks_docstring(self):
        source = '''"""SLOP012: a multi-line block gets a blank line before and after it.

A compound statement that spans several lines (`if`, `for`, `while`,
`try`, `with`, `match`, `def`, `class`) is a logical block. Running it
straight into the statements around it produces a wall of code the reader
has to re-segment by eye. Short guards are the exception: an `if`, loop,
or `with` whose whole body is one simple statement (`if x is None:
return`) may sit against its neighbours. A docstring never needs a blank
line after it (D202 forbids one), and the clauses of one statement
(`else`, `except`, `case`) are not this rule's concern.
"""
'''
        assert [finding.start_line for finding in self.findings(source)] == list(range(4, 11))

    def test_docstrings_and_prose_comments(self):
        for source in (
            '"""Return the selected item from the collection\nwhen the item satisfies the predicate."""\n',
            'def process():\n    """Return the selected item from the collection\n    when the predicate matches."""\n',
            "# Return the selected item from the collection\n# when the item satisfies the predicate.\n",
            '"""' + "word " * 15 + "\n" + "more words " * 20 + '"""\n',
        ):
            with self.subTest(source=source):
                assert len(self.findings(source)) == 1

    def test_docstring_structure(self):
        for docstring in (
            "Return the selected item.\n\nKeep the next paragraph separate.",
            "Args:\n    item: The item to process.\n    mode: The processing mode.",
            "```python\nresult = process(item)\nprint(result)\n```",
            "Example::\n\n    result = process(item)\n    print(result)",
            "- First list item.\n- Second list item.",
            ">>> process(item)\n42",
        ):
            with self.subTest(docstring=docstring):
                assert self.findings(f'"""{docstring}"""\n') == []


if __name__ == "__main__":
    unittest.main()
