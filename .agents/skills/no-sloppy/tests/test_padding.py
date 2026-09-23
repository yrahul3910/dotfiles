"""Regression cases for the blank-line rules: missing padding, excess padding, and dense runs."""

import tempfile
import textwrap
import unittest
from pathlib import Path

from no_sloppy.rules import run_rules


class PaddingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "example.py"

    def findings(self, source: str, code: str):
        self.path.write_text(textwrap.dedent(source))
        return [(finding.start_line, finding.message) for finding in run_rules([self.path]) if finding.code == code]

    def lines(self, source: str, code: str):
        return [line for line, _ in self.findings(source, code)]

    def test_block_needs_blank_lines_on_both_sides(self):
        source = """
            def f(items):
                total = 0
                for item in items:
                    total += item
                    log(item)
                return total
        """
        assert self.lines(source, "SLOP012") == [4, 7]

    def test_short_guards_stack_but_long_guards_are_blocks(self):
        short = """
            def f(path):
                data = load(path)
                if data is None:
                    return None
                use(data)
        """
        long = """
            def f(path):
                data = load(path)
                if data is None:
                    raise FileNotFoundError(
                        path,
                    )
                return data
        """
        assert self.lines(short, "SLOP012") == []
        assert self.lines(long, "SLOP012") == [4, 8]
        assert "A guard is exempt only" in self.findings(long, "SLOP012")[0][1]

    def test_single_statement_with_is_a_block(self):
        source = """
            def f(path):
                x = 1
                with open(path) as handle:
                    data = handle.read()
                return data, x
        """
        assert self.lines(source, "SLOP012") == [4, 6]

    def test_missing_gap_anchors_above_the_comment(self):
        before = """
            def f(items):
                total = 0
                # Sum the items.
                for item in items:
                    total += item
                    log(item)

                return total
        """
        [(line, message)] = self.findings(before, "SLOP012")
        assert line == 4
        assert "above the comment" in message

    def test_comment_only_gap_is_not_a_separation(self):
        source = """
            def f(items):
                for item in items:
                    use(item)
                    log(item)
                # Done.
                return None
        """
        assert self.lines(source, "SLOP012") == [6]

    def test_overloads_and_docstrings_stack(self):
        source = '''
            from typing import overload


            @overload
            def f(x: int) -> int: ...
            @overload
            def f(x: str) -> str: ...
            def f(x):
                """Identity."""
                for _ in range(1):
                    use(x)
                    log(x)

                return x
        '''
        assert self.lines(source, "SLOP012") == []

    def test_detached_comment(self):
        under_code = """
            def f(items):
                total = 0
                # Sum the items.

                for item in items:
                    total += item
                    log(item)

                return total
        """
        floating = """
            def f(items):
                total = 0

                # Sum the items.

                for item in items:
                    total += item
                    log(item)

                return total
        """
        [(line, message)] = self.findings(under_code, "SLOP015")
        assert line == 5
        assert "move it above" in message

        [(line, message)] = self.findings(floating, "SLOP015")
        assert line == 6
        assert "delete it" in message

    def test_pragma_and_module_comments_may_float(self):
        source = """
            # Helpers for the parser.

            def f(items):
                # fmt: off

                table = [1,2]
                use(table)
                return items
        """
        assert self.lines(source, "SLOP015") == []

    def test_blank_line_at_body_edges(self):
        source = """
            def f(x):

                y = x + 1
                if y:
                    use(y)
                    log(y)

                else:
                    log(x)
                return y
        """
        assert self.lines(source, "SLOP015") == [3, 8]

    def test_repeated_blank_lines_inside_bodies_only(self):
        source = """
            import os


            def f(x):
                y = x + 1
                use(y)
                log(y)


                return os.sep
        """
        assert self.lines(source, "SLOP015") == [10]

    def test_stretched_short_bodies(self):
        stretched = """
            def f(path):
                text = path.read_text()

                return parse(text)
        """
        four = """
            def f(path):
                config = load(path)
                validate(config)

                server = serve(config)
                return server
        """
        guarded = """
            def f(x):
                if x is None:
                    return None

                return x + 1
        """
        assert self.lines(stretched, "SLOP015") == [4]
        assert self.lines(four, "SLOP015") == []
        assert self.lines(guarded, "SLOP015") == []

    def test_return_after_two_statements_gets_its_own_paragraph(self):
        crowded = """
            def save(raw, path):
                config = normalize(raw)
                cache.set(path, config)
                return config
        """
        padded = crowded.replace("config)\n                return", "config)\n\n                return")
        [(line, message)] = self.findings(crowded, "SLOP012")
        assert line == 5
        assert "`return`" in message
        assert self.findings(padded, "SLOP012") == []
        assert self.findings(padded, "SLOP015") == []

    def test_guards_count_toward_the_group(self):
        source = """
            def value(path):
                data = load(path)
                if not data:
                    return None
                return data.value
        """
        assert self.lines(source, "SLOP012") == [6]

    def test_return_under_one_statement_or_a_block_stays(self):
        for source in (
            "def f(x):\n    y = x + 1\n    return y\n",
            "def f(x):\n    for item in x:\n        use(item)\n        log(item)\n\n    return sum(x)\n",
            "def f(x):\n    if x is None:\n        return 0\n    if x < 0:\n        raise ValueError(x)\n"
            "    return x\n",
        ):
            with self.subTest(source=source):
                assert self.findings(source, "SLOP012") == []

    def test_crowded_return_blank_goes_above_its_comment(self):
        source = """
            def save(raw, path):
                config = normalize(raw)
                cache.set(path, config)
                # Hand back the normalized copy.
                return config
        """
        [(line, message)] = self.findings(source, "SLOP012")
        assert line == 5
        assert "above the comment" in message

    def test_short_body_blank_goes_above_the_return(self):
        source = """
            def save(raw, path):
                config = normalize(raw)

                cache.set(path, config)

                return config
        """
        assert self.lines(source, "SLOP015") == [4]

    def test_dense_runs_warn_unless_uniform(self):
        mixed = "def f(a):\n" + "".join(f"    use(a{i})\n    x{i} = a\n" for i in range(5)) + "    return a\n"
        uniform = "def f(a):\n" + "".join(f"    x{i} = a\n" for i in range(12))
        eight = "def f(a):\n" + "".join(f"    use(a{i})\n    x{i} = a\n" for i in range(4))
        self.path.write_text(mixed)
        findings = [finding for finding in run_rules([self.path]) if finding.code == "SLOP016"]

        assert [(finding.start_line, finding.level) for finding in findings] == [(10, "warn")]
        assert self.lines(uniform, "SLOP016") == []
        assert self.lines(eight, "SLOP016") == []


class ComprehensionLayoutTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        (Path(self.temp.name) / ".git").mkdir()
        self.path = Path(self.temp.name) / "example.py"

    def lines(self, source: str):
        self.path.write_text(textwrap.dedent(source))
        return [finding.start_line for finding in run_rules([self.path]) if finding.code == "SLOP014"]

    def test_clause_per_line_is_structure(self):
        for source in (
            "names = [\n    row.strip()\n    for row in rows\n    if row\n]\n",
            "names = [row.strip() for row in rows\n         if row]\n",
            "pairs = {\n    cell: index\n    for index, row in enumerate(rows)\n    for cell in row\n}\n",
            "total = sum(\n    len(row)\n    for row in rows\n    if row\n)\n",
        ):
            with self.subTest(source=source):
                assert self.lines(source) == []

    def test_single_clause_or_mid_clause_breaks_still_wrap(self):
        for source in (
            "names = [\n    row\n    for row in rows\n]\n",
            "names = [row.strip()\n         .lower() for row in rows if row]\n",
        ):
            with self.subTest(source=source):
                assert self.lines(source) == [1]
