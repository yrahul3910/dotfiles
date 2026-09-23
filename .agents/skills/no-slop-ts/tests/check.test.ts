import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const skill = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Run the checker in a fresh git repository holding `committed` as `sample.ts`, after overwriting it with `edited`.
 *
 * The file is committed without signing so a global `commit.gpgsign` cannot block the test. With no `paths`, the
 * checker runs in its default changed-lines mode. Returns the checker's output with colors disabled.
 */
function check(committed: string, edited: string, paths: string[] = []): string {
  const directory = mkdtempSync(join(tmpdir(), "no-slop-check-"));
  const identity = ["-c", "user.name=test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false"];
  const git = (...args: string[]) => execFileSync("git", args, { cwd: directory, stdio: "ignore" });

  try {
    git("init", "-q");
    writeFileSync(join(directory, "sample.ts"), committed);
    git("add", "sample.ts");
    git(...identity, "commit", "-qm", "init");
    writeFileSync(join(directory, "sample.ts"), edited);

    const result = spawnSync(process.execPath, [join(skill, "check.ts"), ...paths], {
      cwd: directory,
      encoding: "utf8",
      env: { ...process.env, NO_COLOR: "1" },
    });
    return result.stdout;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("a multi-line finding counts when any line it covers changed", () => {
  const committed = "export const result = transform(\n  value,\n  option,\n);\n";
  const edited = committed.replace("option", "other");
  const output = check(committed, edited);

  assert.match(output, /no-pseudo-wraps/);
  assert.match(output, /1 \| export const result = transform\(/);
  assert.match(output, /3 \| {3}other,/);
});

test("long spans elide their middle lines", () => {
  const paragraph = Array.from({ length: 30 }, (_, index) => `// line ${index + 1} of a paragraph`).join("\n");
  const output = check("", `${paragraph}\nexport const done = true;\n`, ["sample.ts"]);

  assert.match(output, / {2}5 \| \/\/ line 5 of/);
  assert.match(output, /\.\.\.\n 26 \| \/\/ line 26 of/);
  assert.doesNotMatch(output, /line 6 of|line 25 of/);
});

test("scoped plugin rules are named the way a disable comment needs them", () => {
  const output = check("", `export const total = first + second; // ${"word ".repeat(24)}\n`, ["sample.ts"]);
  assert.match(output, /warning\[@stylistic\/max-len\]/);
});
