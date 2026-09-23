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
 * Lint `source` with the skill's own overlay config (or `config`, a file in the skill directory or an absolute path)
 * and return `rule:line` for each finding from `rules`, in line order.
 *
 * Going through the real overlay checks that the vendored rules are registered and configured the way the checker runs
 * them, not only that they work in isolation.
 */
function lint(source: string, rules: string[], config = "oxlintrc.json"): string[] {
  // `config` is relative to the skill directory unless it is absolute.
  const directory = mkdtempSync(join(tmpdir(), "vendored-"));
  mkdirSync(join(directory, ".git"));

  try {
    writeFileSync(join(directory, "sample.ts"), source);

    const args = [oxlint, "-c", resolve(skill, config), "--format", "json", "sample.ts"];
    const result = spawnSync(process.execPath, args, {
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

test("safety comments accept the default marker, or only the configured markers", () => {
  const source = lines(
    "// SAFETY: validated by the schema above.",
    "export const first = raw as User;",
    "// CHECKED: validated by the schema above.",
    "export const second = raw as User;",
  );
  const rule = "require-safety-comment-for-type-assertion";
  const directory = mkdtempSync(join(tmpdir(), "markers-"));
  const custom = join(directory, "markers.json");

  try {
    // A whitespace-only marker satisfies the schema but is dropped, leaving only CHECKED.
    const plugin = { name: "anti-slop", specifier: join(skill, "plugin/index.ts") };
    const rules = { [`anti-slop/${rule}`]: ["error", { markers: ["CHECKED", " "] }] };
    writeFileSync(custom, JSON.stringify({ jsPlugins: [plugin], rules }));

    assert.deepEqual(lint(source, [rule]), [`${rule}:4`]);
    assert.deepEqual(lint(source, [rule], custom), [`${rule}:2`]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("the Effect overlay enforces tagged-error handlers and constructors, not Match style", () => {
  const source = lines(
    'export const recovered = Effect.catchAll((error) => error._tag === "NotFound" ? recover : Effect.fail(error));',
    'export const ready = { _tag: "Ready", payload };',
    'export const isReady = value._tag === "Ready";',
    'export const label = kind === "a" ? first : kind === "b" ? second : fallback;',
    'export const handled = Effect.catchTag("NotFound", () => recover);',
  );
  const rules = [
    "no-manual-effect-error-tag",
    "no-manual-tagged-construction",
    "no-manual-tag-comparison",
    "prefer-effect-match",
  ];

  assert.deepEqual(lint(source, rules, "oxlintrc.effect.json"), [
    "no-manual-effect-error-tag:1",
    "no-manual-tagged-construction:2",
  ]);
});
