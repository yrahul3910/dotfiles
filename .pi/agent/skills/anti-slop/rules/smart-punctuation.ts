import type { Violation } from "../types.ts";

const SMART_PUNCTUATION: Record<string, string> = {
  "\u2014": "em-dash (\\u2014)",
  "\u2013": "en-dash (\\u2013)",
  "\u2018": "left single quote (\\u2018)",
  "\u2019": "right single quote (\\u2019)",
  "\u201C": "left double quote (\\u201C)",
  "\u201D": "right double quote (\\u201D)",
  "\u2026": "ellipsis (\\u2026)",
};

/**
 * Operates on raw text rather than the AST because Python's ast module drops
 * comments entirely; a token-level scan catches comments, docstrings, and
 * string literals in one pass.
 */
export function checkSmartPunctuation(filePath: string, source: string): Violation[] {
  const violations: Violation[] = [];
  const lines = source.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    for (let j = 0; j < line.length; j++) {
      const char = line[j]!;
      const name = SMART_PUNCTUATION[char];
      if (name) {
        violations.push({
          file: filePath,
          line: i + 1,
          col: j + 1,
          rule: "SLOP001",
          message: `${name} in source; use ASCII equivalent`,
        });
      }
    }
  }

  return violations;
}
