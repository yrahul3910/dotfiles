"""Regression cases for pass-through functions (SLOP005) and assignments that belong in an `if` (SLOP017)."""

import tempfile
import textwrap
import unittest
from pathlib import Path

from no_sloppy.rules import run_rules


class RuleCase(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        (Path(self.temp.name) / ".git").mkdir()
        self.path = Path(self.temp.name) / "example.py"

    def findings(self, source: str, code: str):
        self.path.write_text(textwrap.dedent(source))
        return [(finding.start_line, finding.message) for finding in run_rules([self.path]) if finding.code == code]


class InlineableTests(RuleCase):
    def test_pass_throughs_are_flagged(self):
        source = """
            def load(path):
                return read(path)


            def save(path, *items, **options):
                write(path, *items, **options)


            def name(user):
                return user.get_name()
        """
        assert [line for line, _ in self.findings(source, "SLOP005")] == [2, 6, 10]

    def test_reused_one_liners_that_do_work_are_not(self):
        source = """
            def blank(line):
                return not line.strip()


            def total(items):
                return sum(item.price for item in items)


            use(blank("a"), blank("b"), total([]), total([]))
        """
        assert self.findings(source, "SLOP005") == []

    def test_methods_are_exempt(self):
        source = """
            class Lines:
                def blank(self, line):
                    return not self.text[line].strip()

                def read(self, path):
                    return self.reader.read(path)

                def once(self):
                    return 1


            Lines().once()
        """
        assert self.findings(source, "SLOP005") == []

    def test_one_shot_helpers_still_warn(self):
        source = """
            def _helper(x):
                y = x + 1
                return y * 2


            print(_helper(3))
        """
        assert [line for line, _ in self.findings(source, "SLOP005")] == [2]


class WalrusTests(RuleCase):
    def test_assignment_that_sets_up_the_if(self):
        source = """
            import unicodedata


            def classify(ch):
                category = unicodedata.category(ch)
                if category.startswith("M"):
                    return "ok"

                return "warn" if category.startswith("N") else "error"
        """
        [(line, message)] = self.findings(source, "SLOP017")
        assert line == 6
        assert "category :=" in message

    def test_assignment_read_only_by_the_test_is_inlined(self):
        source = """
            import re


            def matches(line):
                found = re.search("x", line)
                if found is None:
                    return False

                return True
        """
        [(_, message)] = self.findings(source, "SLOP017")
        assert "use the expression in the condition directly" in message

    def test_unsafe_or_unreadable_rewrites_are_left_alone(self):
        for body in (
            "match = search(line)\nif ready and match:\n    return match",
            "match = search(line)\n\nif match:\n    use(match)\n    return match",
            "path = path.strip()\nif path.endswith('/'):\n    return path",
            "LIMIT = 3\nif LIMIT > 2:\n    return LIMIT",
            "count = int(line) if line else 1\nif count:\n    return count",
            "classes = sorted(line)\nif 'x' in classes:\n    return classes",
            "value = next((item for item in line if item.startswith('prefix') and item.endswith('suffix')), None)\n"
            "if value is None:\n    return value",
        ):
            with self.subTest(body=body):
                source = "def f(line, ready, search):\n" + textwrap.indent(body, "    ") + "\n    return None\n"
                assert self.findings(source, "SLOP017") == []

    def test_module_level_setup_is_left_alone(self):
        assert self.findings("config = load()\nif config:\n    use(config)\n", "SLOP017") == []
