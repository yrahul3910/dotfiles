import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadConfig } from "./config.ts";
import { runRuff } from "./ruff.ts";
import { checkSmartPunctuation } from "./rules/smart-punctuation.ts";
import { checkExceptPass } from "./rules/except-pass.ts";
import type { Violation } from "./types.ts";

function main(): void {
  const args = process.argv.slice(2);
  const paths = args.length > 0 ? args.map((p) => resolve(p)) : ["."];

  const config = loadConfig(resolve("."));
  const violations: Violation[] = [];

  violations.push(...runRuff(paths, config));

  for (const path of paths) {
    let source: string;
    try {
      source = readFileSync(path, "utf-8");
    } catch {
      continue;
    }

    if (config.emDash) {
      violations.push(...checkSmartPunctuation(path, source));
    }
    if (config.exceptPass) {
      violations.push(...checkExceptPass(path, source));
    }
  }

  if (violations.length === 0) {
    console.log("anti-slop: clean");
    process.exit(0);
  }

  violations.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

  for (const v of violations) {
    console.log(`${v.file}:${v.line}:${v.col}: ${v.rule} ${v.message}`);
  }

  console.log(`\nanti-slop: ${violations.length} violation(s)`);
  process.exit(1);
}

main();
