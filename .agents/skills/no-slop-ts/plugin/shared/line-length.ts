import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

type MaxLengthOptions = { code?: number };
type RuleSetting = string | number | [string | number, (number | MaxLengthOptions)?, ...unknown[]];
type LintConfig = { rules?: Record<string, RuleSetting>; extends?: unknown; overrides?: unknown };

const limits = new Map<string, number>();

const ESLINT_CONFIG_FILES = [
  "eslint.config.js",
  "eslint.config.mjs",
  "eslint.config.cjs",
  "eslint.config.ts",
  "eslint.config.mts",
  "eslint.config.cts",
  ".eslintrc.js",
  ".eslintrc.cjs",
  ".eslintrc.json",
  ".eslintrc",
  ".eslintrc.yml",
  ".eslintrc.yaml",
];

function isNumber(value: number | MaxLengthOptions | undefined): value is number {
  return typeof value === "number";
}

export function lineLength(filename: string): number | undefined {
  const cachedLimit = limits.get(filename);
  if (cachedLimit !== undefined) return cachedLimit;

  let configPath: string | undefined;
  let eslint: string | undefined;

  for (let directory = dirname(filename); ; directory = dirname(directory)) {
    configPath ??= ESLINT_CONFIG_FILES.map((name) => join(directory, name)).find(existsSync);

    const manifest = join(directory, "package.json");

    if (configPath === undefined && existsSync(manifest)) {
      const pkg: { eslintConfig?: LintConfig } = JSON.parse(readFileSync(manifest, "utf8"));
      if (pkg.eslintConfig) configPath = manifest;
    }

    const binary = join(directory, "node_modules", ".bin", "eslint");
    if (eslint === undefined && existsSync(binary)) eslint = binary;

    if (existsSync(join(directory, ".git")) || dirname(directory) === directory) break;
  }

  let config: LintConfig = {};

  if (configPath && eslint) {
    // ESLint evaluates executable configs and per-file overrides; reading their source cannot determine this file's
    // limit.
    const result = spawnSync(process.execPath, [eslint, "--print-config", filename], {
      cwd: dirname(configPath),
      encoding: "utf8",
    });
    if (result.status !== 0) throw new Error(`Cannot resolve ESLint line limit: ${result.stderr}`);

    config = JSON.parse(result.stdout) ?? {};
  } else if (configPath) {
    if (!configPath.endsWith(".json") && !configPath.endsWith("/.eslintrc")) {
      throw new Error(`Install the project's ESLint to resolve the line limit from ${configPath}`);
    }

    if (configPath.endsWith("/package.json")) {
      const pkg: { eslintConfig?: LintConfig } = JSON.parse(readFileSync(configPath, "utf8"));
      config = pkg.eslintConfig ?? {};
    } else {
      config = JSON.parse(readFileSync(configPath, "utf8"));
    }

    if (config.extends || config.overrides) {
      throw new Error(`Install the project's ESLint to resolve inherited or per-file line limits in ${configPath}`);
    }
  }

  const configured: number[] = [];

  for (const name of ["@stylistic/max-len", "@stylistic/js/max-len", "max-len"]) {
    const setting = config.rules?.[name];
    const severity = Array.isArray(setting) ? setting[0] : setting;
    if (severity === undefined || severity === "off" || severity === 0) continue;

    const option = Array.isArray(setting) ? setting[1] : undefined;
    const width = isNumber(option) ? option : (option?.code ?? 80);
    if (width !== undefined && Number.isInteger(width) && width > 0) configured.push(width);
  }

  const limit = configured.length > 0 ? Math.min(...configured) : undefined;
  if (limit !== undefined) limits.set(filename, limit);

  return limit;
}
