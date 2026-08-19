import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface Config {
  emDash: boolean;
  exceptPass: boolean;
  ruffIgnore: string[];
}

export function loadConfig(root: string): Config {
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
  const standalone = join(root, "anti-slop.toml");
  if (existsSync(standalone)) return standalone;

  const pyproject = join(root, "pyproject.toml");
  if (existsSync(pyproject)) {
    const text = readFileSync(pyproject, "utf-8");
    if (text.includes("[tool.anti-slop]")) return pyproject;
  }

  return null;
}

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
