import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const skill = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const oxlint = join(skill, "node_modules/oxlint/bin/oxlint");
type RuleOptions = { maxLineLength?: number; fallbackLineLength?: number; margin?: number };

function lint(source: string, options: RuleOptions = {}, eslintConfig?: string) {
  const directory = mkdtempSync(join(tmpdir(), "pseudo-wraps-"));
  mkdirSync(join(directory, ".git"));

  try {
    writeFileSync(join(directory, "sample.ts"), source);
    if (eslintConfig) writeFileSync(join(directory, ".eslintrc.json"), eslintConfig);

    const config = {
      jsPlugins: [{ name: "anti-slop", specifier: join(skill, "plugin/index.ts") }],
      rules: { "anti-slop/no-pseudo-wraps": ["error", options] },
    };
    writeFileSync(join(directory, "lint.json"), JSON.stringify(config));

    const result = spawnSync(process.execPath, [oxlint, "-c", "lint.json", "--format", "json", "sample.ts"], {
      cwd: directory,
      encoding: "utf8",
    });
    assert.ok(result.stdout.startsWith("{"), result.stderr);

    const report: { diagnostics: { code: string; severity: string; labels: { span: { line: number } }[] }[] } =
      JSON.parse(result.stdout);
    const findings = report.diagnostics.filter((finding) => finding.code.includes("no-pseudo-wraps"));
    return { status: result.status, findings };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("short continuations fail as errors", () => {
  for (const source of [
    "const result = transform(\n  value,\n  option,\n);",
    "import {\n  first, second,\n} from 'package';",
    "const result =\n  first + second;",
  ]) {
    const result = lint(source);
    assert.equal(result.status, 1);
    assert.equal(result.findings.length, 1);
    assert.equal(result.findings[0].severity, "error");
    assert.equal(result.findings[0].labels[0].span.line, 2);
  }
});

test("doc comments and prose comments reject early wrapping, including long paragraphs", () => {
  for (const source of [
    "/** Return the selected item from the collection\n * when it satisfies the predicate. */",
    "// Return the selected item from the collection\n// when it satisfies the predicate.",
    "/** A compound statement includes\n * `try`, `with`, and `match` expressions. */",
    "/** A short guard might read `if value:\n * return` within a prose description. */",
    "/** " + "word ".repeat(15) + "\n * " + "more words ".repeat(20) + " */",
  ]) {
    assert.equal(lint(source).findings.length, 1);
  }
});

test("preserve syntax, content, paragraphs, and documentation structure", () => {
  for (const source of [
    "const result = transform(value, option);",
    "const result = transform(\n  value, // Explain the argument.\n);",
    "const result = transform(`first\nsecond`);",
    "const item = {\n  first: 1,\n  second: 2,\n};",
    "/** First paragraph.\n *\n * Second paragraph. */",
    "/**\n * @param item The item to process.\n * @returns The selected result.\n */",
    "/**\n * ```ts\n * const result = process(item);\n * console.log(result);\n * ```\n */",
    "/**\n *     const result = process(item);\n *     console.log(result);\n */",
    "/**\n * - First list item.\n * - Second list item.\n */",
  ]) {
    assert.equal(lint(source).findings.length, 0, source);
  }
});

test("configured ESLint widths can be below or above 120", () => {
  const source = `const result = transform(\n  "${"x".repeat(80)}"\n);`;

  assert.equal(lint(source).findings.length, 0);
  assert.equal(lint(source, {}, '{"rules":{"max-len":["error",160]}}').findings.length, 1);
  assert.equal(lint(source, {}, '{"rules":{"max-len":["error",80]}}').findings.length, 0);
  assert.equal(lint(source, {}, '{"rules":{"max-len":["off",160]}}').findings.length, 0);
  assert.equal(lint(source, {}, '{"rules":{"@stylistic/max-len":[2,{"code":160}]}}').findings.length, 1);
});

test("width override, fallback, and margin are configurable", () => {
  const source = `const result = transform(\n  "${"x".repeat(80)}"\n);`;

  assert.equal(lint(source, { fallbackLineLength: 160 }).findings.length, 1);
  assert.equal(lint(source, { margin: 0 }).findings.length, 1);
  assert.equal(lint(source, { maxLineLength: 160 }, '{"rules":{"max-len":[2,80]}}').findings.length, 1);
  assert.equal(lint(source, { fallbackLineLength: 160 }, '{"rules":{"max-len":[2,80]}}').findings.length, 0);
});

test("the margin boundary includes indentation", () => {
  const source = `const result = transform(\n  "${"x".repeat(69)}"\n);`;

  assert.equal(lint(source).findings.length, 1);
  assert.equal(lint(source.replace("x", "xx")).findings.length, 0);
  assert.equal(lint("    " + source.replaceAll("\n", "\n    ")).findings.length, 0);
});
