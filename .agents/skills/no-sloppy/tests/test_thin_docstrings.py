"""Regression cases for one-line docstrings on non-trivial functions (SLOP013)."""

import tempfile
import unittest
from pathlib import Path

from no_sloppy.rules import run_rules

LONG_BODY = "".join(f"    step_{index}()\n" for index in range(25))
DOCUMENTED = '"""Summary.\n\nWhat the entry point flags, what it exempts, and the level of its findings."""\n\n\n'


class ThinDocstringTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "example.py"

    def flagged(self, source: str) -> list[int]:
        self.path.write_text(source)
        return [finding.start_line for finding in run_rules([self.path]) if finding.code == "SLOP013"]

    def test_long_function_with_a_caption_is_flagged(self):
        source = '"""Summary."""\n\n\ndef run():\n    """Run it."""\n' + LONG_BODY
        assert self.flagged(source) == [5]

    def test_sole_public_function_of_a_documented_module_is_exempt(self):
        source = DOCUMENTED + 'def _helper():\n    pass\n\n\ndef run():\n    """Run it."""\n' + LONG_BODY
        assert self.flagged(source) == []

    def test_exemption_needs_a_module_body_and_a_sole_public_definition(self):
        for prefix in (
            '"""Summary only."""\n\n\n',
            DOCUMENTED + "def other():\n    pass\n\n\n",
            DOCUMENTED + "class Config:\n    pass\n\n\n",
        ):
            with self.subTest(prefix=prefix):
                source = prefix + 'def run():\n    """Run it."""\n' + LONG_BODY
                assert len(self.flagged(source)) == 1
