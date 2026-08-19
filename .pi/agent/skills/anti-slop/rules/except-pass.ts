import { execFileSync } from "node:child_process";
import type { Violation } from "../types.ts";

/**
 * Flags `except` blocks whose entire body is `pass` (or `...`). This is the
 * silent-failure pattern agents reach for most often. We parse the source
 * with Python's own ast module via a subprocess so the check is always
 * syntactically correct, without needing a Python parser in TypeScript.
 *
 * Falls back gracefully if python3 is not available.
 */
export function checkExceptPass(filePath: string, source: string): Violation[] {
  const script = `
import ast, json, sys

tree = ast.parse(sys.stdin.read())
results = []
for node in ast.walk(tree):
    if isinstance(node, ast.ExceptHandler):
        body = node.body
        if len(body) == 1 and isinstance(body[0], ast.Pass):
            results.append({"line": node.lineno, "col": node.col_offset + 1})
        elif (
            len(body) == 1
            and isinstance(body[0], ast.Expr)
            and isinstance(body[0].value, ast.Constant)
            and body[0].value.value is Ellipsis
        ):
            results.append({"line": node.lineno, "col": node.col_offset + 1})
print(json.dumps(results))
`;

  let output: string;
  try {
    output = execFileSync("python3", ["-c", script], {
      input: source,
      encoding: "utf-8",
    });
  } catch {
    return [];
  }

  const positions: Array<{ line: number; col: number }> = JSON.parse(output.trim());
  return positions.map((pos) => ({
    file: filePath,
    line: pos.line,
    col: pos.col,
    rule: "SLOP002",
    message: "except block with empty body (pass or ...); handle the error or let it propagate",
  }));
}
