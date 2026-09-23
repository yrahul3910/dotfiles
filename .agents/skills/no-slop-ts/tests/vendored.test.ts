import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const skill = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const oxlint = join(skill, "node_modules/oxlint/bin/oxlint");

type Diagnostic = { code: string; labels: { span: { line: number } }[] };

/**
 * Lint `source` with the skill's own overlay config (or `config`, a file in the skill directory) and return
 * `rule:line` for each finding from `rules`, in line order.
 *
 * Going through the real overlay checks that the vendored rules are registered and configured the way the checker runs
 * them, not only that they work in isolation.
 */
function lint(source: string, rules: string[], config = "oxlintrc.json"): string[] {
  const directory = mkdtempSync(join(tmpdir(), "vendored-"));
  mkdirSync(join(directory, ".git"));

  try {
    writeFileSync(join(directory, "sample.ts"), source);

    const result = spawnSync(process.execPath, [oxlint, "-c", join(skill, config), "--format", "json", "sample.ts"], {
      cwd: directory,
      encoding: "utf8",
    });
    assert.ok(result.stdout.startsWith("{"), result.stderr);

    const report: { diagnostics: Diagnostic[] } = JSON.parse(result.stdout);

    return report.diagnostics
      .map(({ code, labels }) => ({ rule: code.replace(/^.*\((.+)\)$/, "$1"), line: labels[0]?.span.line ?? 0 }))
      .filter(({ rule }) => rules.includes(rule))
      .toSorted((left, right) => left.line - right.line)
      .map(({ rule, line }) => `${rule}:${line}`);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

const lines = (...rows: string[]) => `${rows.join("\n")}\n`;

test("no-runtime-typeof allows existence probes and keeps the local type-guard option", () => {
  const source = lines(
    'export const browser = typeof window !== "undefined";',
    "export function isName(value: unknown): value is string {",
    '  return typeof value === "string";',
    "}",
    "export function raw(value: unknown): boolean {",
    '  return typeof value === "string";',
    "}",
  );
  assert.deepEqual(lint(source, ["no-runtime-typeof"]), ["no-runtime-typeof:6"]);
});

test("no-shape-in-symbol-names keeps suffix-only matching and exempts borrowed members", () => {
  const source = lines(
    "export const shape = 1;",
    "export const reshape = 2;",
    "export const userShape = schema.innerShape;",
    "export const user_shape = 3;",
  );
  const expected = ["no-shape-in-symbol-names:3", "no-shape-in-symbol-names:4"];

  assert.deepEqual(lint(source, ["no-shape-in-symbol-names"]), expected);
});

test("accumulator copies are errors; filter/map chains stay allowed", () => {
  const source = lines(
    "export const byId = items.reduce((acc, item) => Object.assign({}, acc, { [item.id]: item }), {});",
    "export const all = items.reduce((acc, item) => [...acc, item], []);",
    "export const owned = items.reduce((acc, item) => { acc.push(item); return acc; }, []);",
    "export const emails = [first, second].filter(Boolean).map(String);",
  );
  const rules = ["no-reduce-accumulator-copy", "no-accumulating-spread", "no-array-filter-map"];

  assert.deepEqual(lint(source, rules), ["no-reduce-accumulator-copy:1", "no-accumulating-spread:2"]);
});

test("the Effect overlay still loads with the new Effect rules registered", () => {
  assert.deepEqual(lint("export const value = 1;\n", ["no-service-constructor-imports"], "oxlintrc.effect.json"), []);
});
