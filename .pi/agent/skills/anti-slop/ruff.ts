import { execFileSync } from "node:child_process";
import type { Config } from "./config.ts";
import type { Violation } from "./types.ts";

export function runRuff(paths: string[], config: Config): Violation[] {
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
