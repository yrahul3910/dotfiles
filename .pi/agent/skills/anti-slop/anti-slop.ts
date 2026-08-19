/**
 * anti-slop: opinionated checks for low-evidence, low-signal patterns in
 * agent-generated Python code.
 *
 * Runs Ruff for broad rule coverage, then applies custom checks that Ruff
 * does not cover. Custom checks work at two levels:
 *
 *   - Token level (comments, string literals): em-dash, smart punctuation
 *   - AST level (code structure): except-pass, and future rules
 *
 * Usage:
 *   bun run anti-slop.ts [paths...]
 *   node --experimental-strip-types anti-slop.ts [paths...]  (Node 22+)
 *
 * Config: [tool.anti-slop] in pyproject.toml, or anti-slop.toml in the
 * project root. All custom rules default to on; set to false to disable.
 *
 *   [tool.anti-slop]
 *   em-dash = false          # disable em-dash check
 *   except-pass = false      # disable except-pass check
 *   ruff-ignore = ["D"]      # additional Ruff rule codes to ignore
 */

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Violation {
  file: string;
  line: number;
  col: number;
  rule: string;
  message: string;
}

interface Config {
  emDash: boolean;
  exceptPass: boolean;
  ruffIgnore: string[];
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function loadConfig(root: string): Config {
  const defaults: Config = {
    emDash: true,
    exceptPass: true,
    ruffIgnore: [],
  };

  const tomlPath = findTomlConfig(root);
  if (!tomlPath) return defaults;

  const text = readFileSync(tomlPath, "utf-8");
  return parseTomlConfig(text, defaults);
}

function findTomlConfig(root: string): string | null {
  // Check anti-slop.toml first, then pyproject.toml
  const standalone = join(root, "anti-slop.toml");
  if (existsSync(standalone)) return standalone;

  const pyproject = join(root, "pyproject.toml");
  if (existsSync(pyproject)) {
    const text = readFileSync(pyproject, "utf-8");
    if (text.includes("[tool.anti-slop]")) return pyproject;
  }

  return null;
}

/** Minimal TOML extraction for the [tool.anti-slop] section. */
function parseTomlConfig(text: string, config: Config): Config {
  const sectionMatch = text.match(/\[tool\.anti-slop\]([\s\S]*?)(?=\n\[|$)/);
  if (!sectionMatch || !sectionMatch[1]) return config;
  const section = sectionMatch[1];

  if (/^em-dash\s*=\s*false/m.test(section)) config.emDash = false;
  if (/^except-pass\s*=\s*false/m.test(section)) config.exceptPass = false;

  const ruffIgnoreMatch = section.match(/^ruff-ignore\s*=\s*\[(.*?)\]/ms);
  if (ruffIgnoreMatch && ruffIgnoreMatch[1]) {
    config.ruffIgnore = ruffIgnoreMatch[1]
      .split(",")
      .map((s) => s.trim().replace(/"/g, ""))
      .filter(Boolean);
  }

  return config;
}

// ---------------------------------------------------------------------------
// Ruff
// ---------------------------------------------------------------------------

function runRuff(paths: string[], config: Config): Violation[] {
  const args = [
    "check",
    "--select", "ALL",
    "--output-format", "concise",
  ];

  if (config.ruffIgnore.length > 0) {
    args.push("--ignore", config.ruffIgnore.join(","));
  }

  args.push(...paths);

  let output: string;
  try {
    output = execFileSync("ruff", args, { encoding: "utf-8" });
  } catch (err: unknown) {
    // Ruff exits 1 when it finds violations; that's not an error for us.
    if (err && typeof err === "object" && "stdout" in err) {
      output = (err as { stdout: string }).stdout;
    } else if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "ENOENT") {
      // Ruff not installed; skip silently, custom rules still run.
      return [];
    } else {
      throw err;
    }
  }

  if (!output) return [];

  const violations: Violation[] = [];
  for (const line of output.split("\n")) {
    // Ruff concise format: path:line:col: CODE message
    const match = line.match(/^(.+?):(\d+):(\d+):\s+(\w+)\s+(.+)$/);
    if (match) {
      violations.push({
        file: match[1]!,
        line: parseInt(match[2]!, 10),
        col: parseInt(match[3]!, 10),
        rule: match[4]!,
        message: match[5]!,
      });
    }
  }
  return violations;
}

// ---------------------------------------------------------------------------
// Custom rule: em-dash / smart punctuation
// ---------------------------------------------------------------------------

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
 * Scans raw source text for smart punctuation characters. Operates on the
 * raw text rather than the AST because Python's ast module drops comments
 * entirely; a token-level scan catches comments, docstrings, and string
 * literals in one pass.
 */
function checkSmartPunctuation(filePath: string, source: string): Violation[] {
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

// ---------------------------------------------------------------------------
// Custom rule: except-pass
// ---------------------------------------------------------------------------

/**
 * Flags `except` blocks whose entire body is `pass` (or `...`). This is the
 * silent-failure pattern agents reach for most often. We parse the source
 * with Python's own ast module via a subprocess so the check is always
 * syntactically correct, without needing a Python parser in TypeScript.
 *
 * Falls back gracefully if python3 is not available.
 */
function checkExceptPass(filePath: string, source: string): Violation[] {
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
    // python3 not available or syntax error; skip this rule
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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const args = process.argv.slice(2);
  const paths = args.length > 0 ? args.map((p) => resolve(p)) : ["."];

  const config = loadConfig(resolve("."));
  const violations: Violation[] = [];

  // Ruff
  violations.push(...runRuff(paths, config));

  // Custom rules: apply per-file
  for (const path of paths) {
    let source: string;
    try {
      source = readFileSync(path, "utf-8");
    } catch {
      continue; // skip non-files (directories handled by Ruff)
    }

    if (config.emDash) {
      violations.push(...checkSmartPunctuation(path, source));
    }
    if (config.exceptPass) {
      violations.push(...checkExceptPass(path, source));
    }
  }

  // Output
  if (violations.length === 0) {
    console.log("anti-slop: clean");
    process.exit(0);
  }

  // Sort by file, then line
  violations.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

  for (const v of violations) {
    console.log(`${v.file}:${v.line}:${v.col}: ${v.rule} ${v.message}`);
  }

  console.log(`\nanti-slop: ${violations.length} violation(s)`);
  process.exit(1);
}

main();
