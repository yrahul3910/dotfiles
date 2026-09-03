#!/usr/bin/env bun
// no-slop-ts - deterministic slop check for TypeScript/JavaScript.
//
// Runs an oxlint overlay (oxlintrc.json in this directory) plus the vendored
// anti-slop jsPlugin rules from https://github.com/dmmulroy/anti-slop,
// independent of the project's own lint setup. By default only findings on
// lines changed relative to HEAD are reported (staged, unstaged, and
// untracked files), so output is about the code just written.
//
// Usage:
//     no-slop-ts                 # changed files, findings on changed lines only
//     no-slop-ts --base <ref>    # diff against another ref (e.g. main)
//     no-slop-ts --all           # changed files, whole-file findings
//     no-slop-ts --strict        # warnings also fail the check
//     no-slop-ts --effect        # force the Effect rules on (--no-effect: off)
//     no-slop-ts PATH...         # explicit files/dirs, whole-file findings
//
// The Effect rule group is enabled automatically when the repo's root
// package.json declares a direct `effect` dependency.
//
// Requires bun and git; oxlint comes from this skill's own node_modules
// (bun install in this directory).

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const SKILL_DIR = dirname(realpathSync(Bun.main));
const OXLINT_BIN = join(SKILL_DIR, "node_modules", "oxlint", "bin", "oxlint");
const WHOLE_FILE: [number, number] = [1, Number.MAX_SAFE_INTEGER];

const EXTENSIONS = ["ts", "tsx", "mts", "cts", "js", "jsx", "mjs", "cjs"];
const DECLARATION_FILE = /\.d\.(ts|mts|cts)$/;

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const BLUE = "\x1b[1;34m";
const GREEN = "\x1b[1;32m";
const LEVEL_COLORS = { error: "\x1b[1;31m", warn: "\x1b[1;33m" };

type Level = keyof typeof LEVEL_COLORS;

interface Finding {
  path: string; // absolute
  line: number;
  column: number;
  span: number; // caret width on the start line
  code: string;
  message: string;
  help?: string;
  level: Level;
}

function colorEnabled(): boolean {
  if ("NO_COLOR" in process.env) return false;
  if ("FORCE_COLOR" in process.env) return true;
  return process.stdout.isTTY === true;
}

function git(...args: string[]): string {
  try {
    return execFileSync("git", args, { encoding: "utf-8" });
  } catch (error) {
    // SAFETY: execFileSync failures carry the child's stderr on the thrown error.
    const stderr = (error as { stderr?: string }).stderr ?? String(error);
    console.error(`no-slop-ts: git ${args[0]} failed: ${stderr.toString().trim()}`);
    process.exit(2);
  }
}

/** Map changed source files (absolute paths) to their changed line ranges. */
function changedLines(base: string): Map<string, [number, number][]> {
  const root = git("rev-parse", "--show-toplevel").trim();
  const pathspecs = EXTENSIONS.map((ext) => `*.${ext}`);
  const changed = new Map<string, [number, number][]>();

  const diff = git("-C", root, "diff", "-U0", base, "--", ...pathspecs);
  let current: string | null = null;
  for (const line of diff.split("\n")) {
    if (line.startsWith("+++ ")) {
      const name = line.slice(4);
      current = name.startsWith("b/") ? resolve(root, name.slice(2)) : null;
    } else if (line.startsWith("@@") && current !== null) {
      const match = /^@@ -\S+ \+(\d+)(?:,(\d+))? @@/.exec(line);
      if (!match) continue;
      const start = Number(match[1]);
      const count = match[2] === undefined ? 1 : Number(match[2]);
      if (count === 0) continue;
      const ranges = changed.get(current) ?? [];
      ranges.push([start, start + count - 1]);
      changed.set(current, ranges);
    }
  }

  const untracked = git("-C", root, "ls-files", "--others", "--exclude-standard", "--", ...pathspecs);
  for (const name of untracked.split("\n")) {
    if (name) changed.set(resolve(root, name), [WHOLE_FILE]);
  }

  for (const path of changed.keys()) {
    if (!existsSync(path) || DECLARATION_FILE.test(path) || path.startsWith(SKILL_DIR + "/")) {
      changed.delete(path);
    }
  }
  return changed;
}

/** Whether the repo's root package.json declares a direct `effect` dependency. */
function usesEffect(): boolean {
  const root = spawnSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf-8" });
  const dir = root.status === 0 ? root.stdout.trim() : process.cwd();
  const manifest = join(dir, "package.json");
  if (!existsSync(manifest)) return false;

  try {
    // SAFETY: only probed for an "effect" key; a malformed manifest lands in the catch.
    const pkg = JSON.parse(readFileSync(manifest, "utf-8")) as Record<string, Record<string, string>>;
    const sections = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];
    return sections.some((section) => pkg[section] !== undefined && "effect" in pkg[section]);
  } catch {
    return false;
  }
}

interface OxlintLabel {
  span: { offset: number; length: number; line: number; column: number };
}

interface OxlintDiagnostic {
  message: string;
  code: string;
  severity: string;
  help?: string;
  filename: string;
  labels?: OxlintLabel[];
}

function runOxlint(paths: string[], effect: boolean): Finding[] {
  const config = join(SKILL_DIR, effect ? "oxlintrc.effect.json" : "oxlintrc.json");
  const proc = spawnSync(
    process.execPath,
    [OXLINT_BIN, "-c", config, "--format", "json", ...paths],
    { encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 },
  );

  let raw: { diagnostics?: OxlintDiagnostic[] };
  try {
    raw = JSON.parse(proc.stdout);
  } catch {
    console.error(`no-slop-ts: oxlint failed:\n${(proc.stderr || proc.stdout).trim()}`);
    process.exit(2);
  }

  const findings: Finding[] = [];
  for (const diag of raw.diagnostics ?? []) {
    const label = diag.labels?.[0];
    if (!label) continue; // no span to anchor a finding to
    findings.push({
      path: resolve(diag.filename),
      line: label.span.line,
      column: label.span.column,
      span: label.span.length,
      code: diag.code.replace(/^([\w-]+)\((.+)\)$/, "$1/$2"),
      message: diag.message,
      help: diag.help,
      level: diag.severity === "warning" ? "warn" : "error",
    });
  }
  return findings;
}

/** Render a rustc-style block with the offending source line. */
function render(finding: Finding, lineText: string | undefined, color: boolean): string {
  const label = finding.level === "warn" ? "warning" : "error";
  const tint = color ? LEVEL_COLORS[finding.level] : "";
  const accent = color ? BLUE : "";
  const bold = color ? BOLD : "";
  const reset = color ? RESET : "";
  const rel = relative(process.cwd(), finding.path) || finding.path;
  const indent = " ".repeat(String(finding.line).length);

  const out = [
    `${tint}${label}[${finding.code}]${reset}${bold}: ${finding.message}${reset}`,
    `  ${accent}-->${reset} ${rel}:${finding.line}:${finding.column}`,
  ];

  if (lineText !== undefined) {
    const display = lineText.replaceAll("\t", " ");
    const width = Math.max(Math.min(finding.span, display.length - finding.column + 1), 1);
    const num = String(finding.line);
    out.push(
      `${indent} ${accent}|${reset}`,
      `${accent}${num} |${reset} ${display}`,
      `${indent} ${accent}|${reset} ${" ".repeat(finding.column - 1)}${tint}${"^".repeat(width)}${reset}`,
    );
  }

  if (finding.help) out.push(`${indent} ${accent}=${reset} help: ${finding.help}`);
  return out.join("\n");
}

function main(): number {
  const paths: string[] = [];
  let base = "HEAD";
  let all = false;
  let strict = false;
  let effect: boolean | null = null;

  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--base") base = argv[++i] ?? base;
    else if (arg === "--all") all = true;
    else if (arg === "--strict") strict = true;
    else if (arg === "--effect") effect = true;
    else if (arg === "--no-effect") effect = false;
    else if (arg === "--help" || arg === "-h") {
      console.log("usage: no-slop-ts [--base REF] [--all] [--strict] [--effect|--no-effect] [PATH...]");
      return 0;
    } else if (arg.startsWith("-")) {
      console.error(`no-slop-ts: unknown option ${arg}`);
      return 2;
    } else paths.push(arg);
  }

  let scope: Map<string, [number, number][]>;
  if (paths.length > 0) {
    scope = new Map<string, [number, number][]>(paths.map((p) => [resolve(p), [WHOLE_FILE]]));
  } else {
    scope = changedLines(base);
    if (all) {
      for (const path of scope.keys()) scope.set(path, [WHOLE_FILE]);
    }
  }

  if (scope.size === 0) {
    console.log("no-slop-ts: no changed TypeScript/JavaScript files");
    return 0;
  }

  const targets = [...scope.keys()].toSorted();
  const findings = runOxlint(targets, effect ?? usesEffect())
    .filter((f) => {
      const ranges = scope.get(f.path) ?? [WHOLE_FILE];
      return ranges.some(([lo, hi]) => f.line >= lo && f.line <= hi);
    })
    .toSorted((a, b) => a.path.localeCompare(b.path) || a.line - b.line || a.column - b.column);

  const color = colorEnabled();
  if (findings.length === 0) {
    const [green, reset] = color ? [GREEN, RESET] : ["", ""];
    console.log(`${green}no-slop-ts: clean (${targets.length} path(s) checked)${reset}`);
    return 0;
  }

  const sources = new Map<string, string[]>();
  const blocks = findings.map((finding) => {
    if (!sources.has(finding.path)) {
      let lines: string[] = [];
      try {
        if (statSync(finding.path).isFile()) lines = readFileSync(finding.path, "utf-8").split("\n");
      } catch {
        // unreadable file: render without the source line
      }
      sources.set(finding.path, lines);
    }
    const lineText = sources.get(finding.path)?.[finding.line - 1];
    return render(finding, lineText, color);
  });
  console.log(blocks.join("\n\n"));

  const errors = findings.filter((f) => f.level === "error").length;
  const warns = findings.length - errors;
  const style = (level: Level) => (color ? LEVEL_COLORS[level] : "");
  const reset = color ? RESET : "";
  const counts = [];
  if (errors) counts.push(`${style("error")}${errors} error(s)${reset}`);
  if (warns) counts.push(`${style("warn")}${warns} warning(s)${reset}`);
  const fileCount = new Set(findings.map((f) => f.path)).size;
  console.log(`\nno-slop-ts: ${counts.join(", ")} in ${fileCount} file(s)`);
  return errors > 0 || (warns > 0 && strict) ? 1 : 0;
}

process.exit(main());
