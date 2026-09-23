import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const skill = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const oxlint = join(skill, "node_modules/oxlint/bin/oxlint");
const RULES = ["no-unpadded-blocks", "no-excess-padding", "no-dense-runs"];

type Diagnostic = { code: string; message: string; severity: string; labels: { span: { line: number } }[] };

/**
 * Lint `source` with only the blank-line rules enabled and return `rule:line` for each finding, in line order.
 *
 * Each call lints a fresh temporary directory holding a `.git` marker so no project config leaks in, and fails the
 * test if oxlint does not produce a JSON report.
 */
function lint(source: string): string[] {
  const directory = mkdtempSync(join(tmpdir(), "padding-"));
  mkdirSync(join(directory, ".git"));

  try {
    writeFileSync(join(directory, "sample.ts"), source);

    const config = {
      jsPlugins: [{ name: "anti-slop", specifier: join(skill, "plugin/index.ts") }],
      categories: { correctness: "off" },
      rules: Object.fromEntries(RULES.map((rule) => [`anti-slop/${rule}`, "error"])),
    };
    writeFileSync(join(directory, "lint.json"), JSON.stringify(config));

    const result = spawnSync(process.execPath, [oxlint, "-c", "lint.json", "--format", "json", "sample.ts"], {
      cwd: directory,
      encoding: "utf8",
    });
    assert.ok(result.stdout.startsWith("{"), result.stderr);

    const report: { diagnostics: Diagnostic[] } = JSON.parse(result.stdout);
    return report.diagnostics
      .map(({ code, labels }) => ({ rule: code.replace(/^.*\((.+)\)$/, "$1"), line: labels[0]?.span.line }))
      .toSorted((left, right) => (left.line ?? 0) - (right.line ?? 0))
      .map(({ rule, line }) => `${rule}:${line}`);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

const lines = (...rows: string[]) => `${rows.join("\n")}\n`;

test("blocks need a blank line on both sides", () => {
  const source = lines(
    "export function f(items: number[]): number {",
    "  let total = 0;",
    "  for (const item of items) {",
    "    total += item;",
    "    log(item);",
    "  }",
    "  return total;",
    "}",
  );
  assert.deepEqual(lint(source), ["no-unpadded-blocks:3", "no-unpadded-blocks:7"]);
});

test("multi-line callbacks are blocks", () => {
  const source = lines(
    'describe("suite", () => {',
    "  const a = 1;",
    '  it("works", () => {',
    "    expect(a).toBe(1);",
    "    expect(a).not.toBe(2);",
    "  });",
    '  it("still works", () => {',
    "    expect(a).toBe(1);",
    "    expect(a).not.toBe(2);",
    "  });",
    "});",
  );
  assert.deepEqual(lint(source), ["no-unpadded-blocks:3", "no-unpadded-blocks:7"]);
});

test("short guards stack but long guards are blocks", () => {
  const short = lines(
    "export function f(path: string): string {",
    "  const data = load(path);",
    "  if (!data) {",
    "    return path;",
    "  }",
    "  use(data);",
    "}",
  );
  const long = lines(
    "export function f(path: string): string {",
    "  const data = load(path);",
    "  if (!data) {",
    "    throw new Error(",
    "      path,",
    "    );",
    "  }",
    "  return data;",
    "}",
  );
  assert.deepEqual(lint(short), []);
  assert.deepEqual(lint(long), ["no-unpadded-blocks:3", "no-unpadded-blocks:8"]);
});

test("the missing gap goes above a leading comment", () => {
  const source = lines(
    "export function f(items: number[]): number {",
    "  let total = 0;",
    "  // Sum the items.",
    "  for (const item of items) {",
    "    total += item;",
    "    log(item);",
    "  }",
    "",
    "  return total;",
    "}",
  );
  assert.deepEqual(lint(source), ["no-unpadded-blocks:3"]);
});

test("overload signatures stack against their implementation", () => {
  const source = lines(
    "export function f(x: string): string;",
    "export function f(x: number): number;",
    "export function f(x: string | number): string | number {",
    "  log(x);",
    "  return x;",
    "}",
  );
  assert.deepEqual(lint(source), []);
});

test("object type aliases are blocks like interfaces", () => {
  const source = lines("type Options = {", "  verbose: boolean;", "};", "const x = 1;");
  assert.deepEqual(lint(source), ["no-unpadded-blocks:4"]);
});

test("a blank line between a comment and its code is padding", () => {
  const source = lines(
    "export function f(items: number[]): number {",
    "  let total = 0;",
    "  // Sum the items.",
    "",
    "  for (const item of items) {",
    "    total += item;",
    "    log(item);",
    "  }",
    "",
    "  return total;",
    "}",
  );
  assert.deepEqual(lint(source), ["no-excess-padding:4"]);
});

test("pragmas and top-level comments may float", () => {
  const source = lines(
    "// Helpers for the parser.",
    "",
    "export function f(items: number[]): number[] {",
    "  // eslint-disable-next-line no-console",
    "",
    "  console.log(items);",
    "  log(items);",
    "}",
  );
  assert.deepEqual(lint(source), []);
});

test("blank lines at the edges of a body and repeated blank lines are padding", () => {
  const source = lines(
    "export function f(x: number): number {",
    "",
    "  const y = x + 1;",
    "  use(y);",
    "",
    "",
    "  log(y);",
    "  return y;",
    "",
    "}",
  );
  assert.deepEqual(lint(source), ["no-excess-padding:2", "no-excess-padding:6", "no-excess-padding:9"]);
});

test("short bodies of one-line statements need no blank line", () => {
  const stretched = lines(
    "export function f(text: string): number {",
    "  const n = text.length;",
    "",
    "  return n;",
    "}",
  );
  const four = lines(
    "export function f(text: string): number {",
    "  const n = text.length;",
    "  use(n);",
    "",
    "  log(n);",
    "  return n;",
    "}",
  );
  assert.deepEqual(lint(stretched), ["no-excess-padding:3"]);
  assert.deepEqual(lint(four), []);
});

test("a return after two or more statements gets its own paragraph", () => {
  const crowded = lines(
    "export function save(raw: Raw, path: string): Config {",
    "  const config = normalize(raw);",
    "  cache.set(path, config);",
    "  return config;",
    "}",
  );
  const padded = crowded.replace("config);\n  return", "config);\n\n  return");
  const guarded = lines(
    "export function value(path: string): string | null {",
    "  const data = load(path);",
    "  if (!data) return null;",
    "  return data.value;",
    "}",
  );

  assert.deepEqual(lint(crowded), ["no-unpadded-blocks:4"]);
  assert.deepEqual(lint(padded), []);
  assert.deepEqual(lint(guarded), ["no-unpadded-blocks:4"]);
});

test("a return under one statement, a block, or a dispatch chain stays", () => {
  for (const source of [
    lines("export function size(text: string): number {", "  const n = text.length;", "  return n;", "}"),
    lines(
      "export function name(node: Node): string | null {",
      "  if (node.type === \"Identifier\") return node.name;",
      "  if (node.type === \"Literal\") throw new Error(\"literal\");",
      "  return null;",
      "}",
    ),
    lines(
      "export function total(items: number[]): number {",
      "  for (const item of items) {",
      "    use(item);",
      "    log(item);",
      "  }",
      "",
      "  return items.length;",
      "}",
    ),
  ]) {
    assert.deepEqual(lint(source), [], source);
  }
});

test("long runs warn unless uniform", () => {
  const mixed = lines(
    "export function f(a: number): number {",
    ...Array.from({ length: 5 }, (_, i) => `  use(a);\n  const x${i} = a;`),
    "",
    "  return a;",
    "}",
  );
  const uniform = lines(
    "export function f(a: number): number {",
    ...Array.from({ length: 12 }, (_, i) => `  const x${i} = a;`),
    "",
    "  return a + x0;",
    "}",
  );
  assert.deepEqual(lint(mixed), ["no-dense-runs:10"]);
  assert.deepEqual(lint(uniform), []);
});
