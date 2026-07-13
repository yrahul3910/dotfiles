#!/usr/bin/env bun
// okf — helper CLI for Open Knowledge Format (OKF v0.1) bundles.
// Spec: ../references/SPEC.md (vendored from
// https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
//
// Zero dependencies; requires bun (uses Bun.YAML).

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";

// ---------- shared helpers ----------

type Diag = { level: "error" | "warning" | "info"; file: string; message: string };

interface ParsedDoc {
  fm: Record<string, unknown> | null; // parsed frontmatter, null if absent/invalid
  fmRaw: string | null; // raw frontmatter text between the --- fences
  body: string;
  fmError?: string;
}

const RESERVED = new Set(["index.md", "log.md"]);

function parseDoc(raw: string): ParsedDoc {
  const lines = raw.split("\n");
  if (lines[0]?.trim() !== "---") return { fm: null, fmRaw: null, body: raw };
  let close = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      close = i;
      break;
    }
  }
  if (close === -1) return { fm: null, fmRaw: null, body: raw, fmError: "unterminated frontmatter block" };
  const fmRaw = lines.slice(1, close).join("\n");
  const body = lines.slice(close + 1).join("\n");
  try {
    const fm = Bun.YAML.parse(fmRaw);
    if (fm === null || typeof fm !== "object" || Array.isArray(fm))
      return { fm: null, fmRaw, body, fmError: "frontmatter is not a YAML mapping" };
    return { fm: fm as Record<string, unknown>, fmRaw, body };
  } catch (e) {
    return { fm: null, fmRaw, body, fmError: `frontmatter YAML parse error: ${(e as Error).message}` };
  }
}

// All .md files under dir, skipping dotfiles/dotdirs (.git etc.).
function walkMd(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkMd(p));
    else if (entry.isFile() && entry.name.endsWith(".md")) out.push(p);
  }
  return out;
}

// Bundle root discovery (§11): nearest ancestor whose index.md frontmatter
// declares okf_version. --root overrides.
function findRoot(rootFlag: string | undefined): string {
  if (rootFlag) {
    const r = resolve(rootFlag);
    if (!existsSync(r)) die(`--root ${rootFlag}: no such directory`);
    return r;
  }
  let d = resolve(".");
  while (true) {
    const idx = join(d, "index.md");
    if (existsSync(idx)) {
      const doc = parseDoc(readFileSync(idx, "utf8"));
      if (doc.fm && "okf_version" in doc.fm) return d;
    }
    const parent = dirname(d);
    if (parent === d) die("no bundle root found (no ancestor index.md declares okf_version); pass --root or run `okf init`");
    d = parent;
  }
}

// Markdown links from a body, with code fences and inline code stripped so
// example snippets don't produce false broken-link reports.
function extractLinks(body: string): string[] {
  const stripped = body
    .replace(/^```.*$[\s\S]*?^```\s*$/gm, "")
    .replace(/`[^`\n]*`/g, "");
  const links: string[] = [];
  for (const m of stripped.matchAll(/(!?)\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    if (m[1] === "!") continue; // image
    links.push(m[2]);
  }
  return links;
}

function isExternalLink(url: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith("#");
}

// Resolve an internal link per §5: leading / is bundle-root-relative.
function resolveLink(url: string, fromFile: string, root: string): string {
  const clean = url.split("#")[0];
  return clean.startsWith("/") ? join(root, clean) : resolve(dirname(fromFile), clean);
}

function rel(root: string, p: string): string {
  return relative(root, p) || ".";
}

function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function git(repoDir: string, args: string[]): string {
  return execFileSync("git", ["-C", repoDir, ...args], { encoding: "utf8" }).trimEnd();
}

function die(msg: string): never {
  console.error(`okf: ${msg}`);
  process.exit(2);
}

// Source repo for stale/mark-synced: `source_repo` in root frontmatter
// (path relative to bundle root), else the repo containing the bundle.
function sourceRepo(root: string, fm: Record<string, unknown>): string {
  const sr = fm.source_repo;
  const dir = typeof sr === "string" ? resolve(root, sr) : root;
  try {
    return git(dir, ["rev-parse", "--show-toplevel"]);
  } catch {
    die(`${dir} is not inside a git repository (set source_repo in the root index.md frontmatter?)`);
  }
}

function readRootIndex(root: string): { raw: string; doc: ParsedDoc; path: string } {
  const path = join(root, "index.md");
  if (!existsSync(path)) die(`no index.md at bundle root ${root}; run \`okf init\``);
  const raw = readFileSync(path, "utf8");
  return { raw, doc: parseDoc(raw), path };
}

// ---------- diagnostics output ----------

function report(diags: Diag[], root: string, json: boolean, extra: Record<string, unknown> = {}): void {
  const errors = diags.filter((d) => d.level === "error");
  const warnings = diags.filter((d) => d.level === "warning");
  const infos = diags.filter((d) => d.level === "info");
  if (json) {
    console.log(JSON.stringify({ root, ...extra, errors, warnings, info: infos }, null, 2));
    return;
  }
  for (const d of diags) console.log(`${d.level.padEnd(7)} ${d.file}: ${d.message}`);
  const summary = `${errors.length} error(s), ${warnings.length} warning(s), ${infos.length} info`;
  console.log(diags.length ? summary : `ok — ${summary}`);
}

// ---------- commands ----------

function cmdInit(pathArg: string | undefined): void {
  const target = resolve(pathArg ?? ".");
  mkdirSync(target, { recursive: true });
  const idx = join(target, "index.md");
  if (existsSync(idx)) die(`${idx} already exists`);

  let commitLine = "";
  try {
    commitLine = `source_commit: ${git(target, ["rev-parse", "HEAD"])}\n`;
  } catch {
    // not in a git repo or no commits yet — omit; mark-synced can add it later
  }
  writeFileSync(idx, `---\nokf_version: "0.1"\n${commitLine}---\n`);

  const log = join(target, "log.md");
  if (!existsSync(log))
    writeFileSync(log, `# Update Log\n\n## ${todayISO()}\n* **Initialization**: Created bundle structure.\n`);

  console.log(`initialized OKF bundle at ${target}`);
  console.log(`  ${rel(target, idx)}  (okf_version${commitLine ? " + source_commit" : ""})`);
  console.log(`  ${rel(target, log)}`);
}

function cmdValidate(root: string, strict: boolean, json: boolean): void {
  const diags: Diag[] = [];
  const files = walkMd(root);
  let conceptCount = 0;

  for (const file of files) {
    const name = basename(file);
    const raw = readFileSync(file, "utf8");
    const doc = parseDoc(raw);
    const r = rel(root, file);

    if (RESERVED.has(name)) {
      if (name === "index.md") {
        // §11: frontmatter permitted only in the bundle-root index.md
        if (doc.fmRaw !== null && dirname(file) !== root)
          diags.push({ level: "error", file: r, message: "frontmatter is only permitted in the bundle-root index.md" });
      } else {
        // §7: log date headings must be ISO YYYY-MM-DD
        for (const m of raw.matchAll(/^## +(.+?) *$/gm)) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(m[1]))
            diags.push({ level: "warning", file: r, message: `log date heading not ISO YYYY-MM-DD: "## ${m[1]}"` });
        }
      }
    } else {
      // §9: every concept needs parseable frontmatter with non-empty type
      conceptCount++;
      if (doc.fmRaw === null) diags.push({ level: "error", file: r, message: "missing YAML frontmatter" });
      else if (doc.fmError) diags.push({ level: "error", file: r, message: doc.fmError });
      else if (typeof doc.fm!.type !== "string" || !(doc.fm!.type as string).trim())
        diags.push({ level: "error", file: r, message: 'frontmatter missing non-empty "type"' });
    }

    // §5.3: broken links are not malformed — warnings, fatal only with --strict
    for (const url of extractLinks(doc.body)) {
      if (isExternalLink(url)) continue;
      const target = resolveLink(url, file, root);
      if (!existsSync(target))
        diags.push({ level: "warning", file: r, message: `broken link: ${url} (may be not-yet-written knowledge)` });
    }
  }

  report(diags, root, json, { concepts: conceptCount });
  const errors = diags.filter((d) => d.level === "error").length;
  const warnings = diags.filter((d) => d.level === "warning").length;
  process.exit(errors > 0 || (strict && warnings > 0) ? 1 : 0);
}

interface IndexEntry {
  title: string;
  url: string;
  description: string;
  target: string; // resolved absolute path
}

function parseIndexEntries(idxFile: string, root: string): IndexEntry[] {
  const { body } = parseDoc(readFileSync(idxFile, "utf8"));
  const entries: IndexEntry[] = [];
  for (const m of body.matchAll(/^\s*[*+-]\s+\[([^\]]*)\]\(([^)\s]+)\)\s*(?:[-–—:]\s*(.*?))?\s*$/gm)) {
    const url = m[2];
    if (isExternalLink(url)) continue;
    entries.push({ title: m[1], url, description: m[3] ?? "", target: resolveLink(url, idxFile, root) });
  }
  return entries;
}

function conceptMeta(file: string): { title: string; description: string; type: string } {
  const doc = parseDoc(readFileSync(file, "utf8"));
  const fm = doc.fm ?? {};
  return {
    title: typeof fm.title === "string" ? fm.title : basename(file, ".md"),
    description: typeof fm.description === "string" ? fm.description : "",
    type: typeof fm.type === "string" && fm.type.trim() ? fm.type : "Other",
  };
}

// Directories under root (inclusive) that contain concepts or house subtrees that do.
function bundleDirs(root: string): Map<string, { concepts: string[]; subdirs: string[] }> {
  const all = walkMd(root);
  const map = new Map<string, { concepts: string[]; subdirs: string[] }>();
  const ensure = (d: string) => {
    if (!map.has(d)) map.set(d, { concepts: [], subdirs: [] });
    return map.get(d)!;
  };
  ensure(root);
  for (const f of all) {
    const d = dirname(f);
    if (!RESERVED.has(basename(f))) ensure(d).concepts.push(f);
    // register every ancestor dir up to root so intermediate dirs list their children
    let cur = d;
    while (cur !== root && cur.startsWith(root)) {
      const parent = dirname(cur);
      const sub = ensure(parent).subdirs;
      if (!sub.includes(cur)) sub.push(cur);
      ensure(cur);
      cur = parent;
    }
  }
  return map;
}

function cmdIndex(root: string, write: boolean, json: boolean): void {
  const dirs = bundleDirs(root);
  const diags: Diag[] = [];
  const written: string[] = [];

  for (const [dir, { concepts, subdirs }] of dirs) {
    if (!concepts.length && !subdirs.length) continue;
    const idxFile = join(dir, "index.md");

    if (write) {
      // Tool-owned regeneration: group concepts by type, then list subdirectories.
      // Root index.md keeps its existing frontmatter verbatim.
      const byType = new Map<string, string[]>();
      for (const c of concepts) {
        const t = conceptMeta(c).type;
        if (!byType.has(t)) byType.set(t, []);
        byType.get(t)!.push(c);
      }
      let out = "";
      if (dir === root) {
        const fmRaw = existsSync(idxFile) ? parseDoc(readFileSync(idxFile, "utf8")).fmRaw : null;
        out += `---\n${fmRaw ?? 'okf_version: "0.1"'}\n---\n\n`;
      }
      for (const type of [...byType.keys()].sort()) {
        out += `# ${type}\n\n`;
        const items = byType.get(type)!.map((c) => ({ c, meta: conceptMeta(c) }));
        items.sort((a, b) => a.meta.title.localeCompare(b.meta.title));
        for (const { c, meta } of items)
          out += `* [${meta.title}](${basename(c)})${meta.description ? ` - ${meta.description}` : ""}\n`;
        out += "\n";
      }
      if (subdirs.length) {
        out += `# Directories\n\n`;
        for (const s of [...subdirs].sort()) {
          const n = walkMd(s).filter((f) => !RESERVED.has(basename(f))).length;
          out += `* [${basename(s)}](${basename(s)}/) - ${n} concept${n === 1 ? "" : "s"}\n`;
        }
        out += "\n";
      }
      writeFileSync(idxFile, out.trimEnd() + "\n");
      written.push(rel(root, idxFile));
      continue;
    }

    // Check mode: compare index.md entries against what's on disk.
    const r = rel(root, idxFile);
    if (!existsSync(idxFile)) {
      diags.push({ level: "warning", file: rel(root, dir), message: `missing index.md (${concepts.length} concept(s) unlisted)` });
      continue;
    }
    const entries = parseIndexEntries(idxFile, root);
    const listed = new Set(entries.map((e) => e.target.replace(/\/$/, "")));

    for (const c of concepts)
      if (!listed.has(c)) diags.push({ level: "warning", file: r, message: `concept not listed: ${rel(dir, c)}` });
    for (const s of subdirs)
      if (!listed.has(s) && !listed.has(join(s, "index.md")))
        diags.push({ level: "info", file: r, message: `subdirectory not listed: ${basename(s)}/` });

    for (const e of entries) {
      const isDir = e.url.endsWith("/");
      if (!existsSync(e.target)) {
        diags.push({ level: "warning", file: r, message: `entry points to missing ${isDir ? "directory" : "file"}: ${e.url}` });
        continue;
      }
      if (!isDir && !RESERVED.has(basename(e.target)) && e.target.endsWith(".md")) {
        const meta = conceptMeta(e.target);
        if (e.description && meta.description && e.description !== meta.description)
          diags.push({ level: "info", file: r, message: `description drift for ${e.url} (frontmatter: "${meta.description}")` });
        if (e.title && meta.title && e.title !== meta.title)
          diags.push({ level: "info", file: r, message: `title drift for ${e.url} (frontmatter: "${meta.title}")` });
      }
    }
  }

  if (write) {
    if (json) console.log(JSON.stringify({ root, written }, null, 2));
    else for (const w of written) console.log(`wrote ${w}`);
    return;
  }
  report(diags, root, json);
  process.exit(diags.some((d) => d.level !== "info") ? 1 : 0);
}

function cmdLog(root: string, message: string, action: string, dirFlag: string | undefined): void {
  const dir = dirFlag ? resolve(dirFlag) : root;
  const file = join(dir, "log.md");
  const today = todayISO();
  const entry = `* **${action}**: ${message}`;

  let lines = existsSync(file) ? readFileSync(file, "utf8").split("\n") : ["# Update Log", ""];
  const firstHeading = lines.findIndex((l) => /^## /.test(l));

  if (firstHeading !== -1 && lines[firstHeading].trim() === `## ${today}`) {
    lines.splice(firstHeading + 1, 0, entry); // newest entry first within today
  } else if (firstHeading !== -1) {
    lines.splice(firstHeading, 0, `## ${today}`, entry, "");
  } else {
    if (lines[lines.length - 1] !== "") lines.push("");
    lines.push(`## ${today}`, entry, "");
  }
  writeFileSync(file, lines.join("\n").replace(/\n*$/, "\n"));
  console.log(`logged to ${rel(root, file)} under ## ${today}`);
}

function staleContext(root: string): { repo: string; commit: string; pathspec: string[]; fm: Record<string, unknown> } {
  const { doc } = readRootIndex(root);
  const fm = doc.fm ?? {};
  const commit = fm.source_commit;
  if (typeof commit !== "string" || !commit.trim())
    die("root index.md frontmatter has no source_commit; run `okf mark-synced` first");
  const repo = sourceRepo(root, fm);
  try {
    git(repo, ["cat-file", "-e", `${commit}^{commit}`]);
  } catch {
    die(`source_commit ${commit} not found in ${repo}`);
  }
  // Exclude the bundle itself so wiki edits don't count as source drift.
  const bundleRel = relative(repo, root);
  const pathspec =
    bundleRel && !bundleRel.startsWith("..") ? ["--", ".", `:(exclude)${bundleRel}`] : ["--", "."];
  return { repo, commit, pathspec, fm };
}

function cmdStale(root: string, json: boolean): void {
  const { repo, commit, pathspec } = staleContext(root);
  const head = git(repo, ["rev-parse", "HEAD"]);
  const log = git(repo, ["log", "--oneline", `${commit}..HEAD`, ...pathspec]);
  const numstat = git(repo, ["diff", "--numstat", `${commit}..HEAD`, ...pathspec]);

  if (json) {
    const files = numstat
      ? numstat.split("\n").map((l) => {
          const [added, deleted, path] = l.split("\t");
          return { path, added, deleted };
        })
      : [];
    const commits = log ? log.split("\n").map((l) => ({ sha: l.split(" ")[0], subject: l.slice(l.indexOf(" ") + 1) })) : [];
    console.log(JSON.stringify({ root, repo, source_commit: commit, head, up_to_date: !numstat && !log, commits, files }, null, 2));
    process.exit(files.length || commits.length ? 1 : 0);
  }

  if (!log && !numstat) {
    console.log(`up to date — no source changes since ${commit.slice(0, 12)}`);
    process.exit(0);
  }
  console.log(`source changes since ${commit.slice(0, 12)} (${repo}):\n`);
  if (log) console.log(log + "\n");
  console.log(git(repo, ["diff", "--stat", `${commit}..HEAD`, ...pathspec]));
  console.log(`\nreview these against the wiki, update affected concepts, then run \`okf mark-synced\``);
  process.exit(1);
}

function cmdMarkSynced(root: string, shaArg: string | undefined): void {
  const { raw, doc, path } = readRootIndex(root);
  const repo = sourceRepo(root, doc.fm ?? {});
  let sha: string;
  try {
    sha = git(repo, ["rev-parse", `${shaArg ?? "HEAD"}^{commit}`]);
  } catch {
    die(`cannot resolve "${shaArg ?? "HEAD"}" in ${repo}`);
  }

  // Line-based frontmatter edit: preserves every other key and its formatting.
  const lines = raw.split("\n");
  if (lines[0]?.trim() === "---") {
    const close = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
    if (close === -1) die(`${path}: unterminated frontmatter block`);
    const keyIdx = lines.findIndex((l, i) => i > 0 && i < close && /^source_commit\s*:/.test(l));
    const old = keyIdx !== -1 ? lines[keyIdx].split(":").slice(1).join(":").trim() : null;
    if (keyIdx !== -1) lines[keyIdx] = `source_commit: ${sha}`;
    else lines.splice(close, 0, `source_commit: ${sha}`);
    writeFileSync(path, lines.join("\n"));
    console.log(`source_commit: ${old ? `${old.slice(0, 12)} → ` : ""}${sha}`);
  } else {
    writeFileSync(path, `---\nokf_version: "0.1"\nsource_commit: ${sha}\n---\n\n${raw}`);
    console.log(`source_commit: ${sha} (added frontmatter block to root index.md)`);
  }
}

// ---------- entry point ----------

const HELP = `okf — Open Knowledge Format (OKF v0.1) bundle helper

Usage: okf <command> [args] [options]

Commands:
  init [path]           Create a bundle skeleton (index.md with okf_version +
                        source_commit when in a git repo, log.md)
  validate              Check spec conformance (§9). Broken links are warnings
                        per §5.3; exit 1 on errors (or warnings with --strict)
  index                 Compare index.md files against concepts on disk;
                        exit 1 on drift. --write regenerates them (tool-owned
                        format: concepts grouped by type; overwrites curation)
  log <message>         Prepend an entry to the bundle-root log.md under
                        today's date (--action Update|Creation|Deprecation|…,
                        --dir <path> to target a subdirectory's log.md)
  stale                 Show source-repo changes since source_commit in the
                        root index.md frontmatter; exit 1 if wiki is behind
  mark-synced [rev]     Set source_commit to rev (default HEAD)

Options:
  --root <path>         Bundle root (default: nearest ancestor whose index.md
                        declares okf_version)
  --json                Machine-readable output (validate, index, stale)
  --strict              validate: broken links and other warnings become fatal
  --write               index: regenerate instead of check
  --action <word>       log: bold action prefix (default: Update)
  --dir <path>          log: directory whose log.md to write (default: root)
`;

function main(): void {
  const argv = process.argv.slice(2);
  const pos: string[] = [];
  const opts: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json" || a === "--strict" || a === "--write") opts[a.slice(2)] = true;
    else if (a === "--root" || a === "--action" || a === "--dir") {
      const v = argv[++i];
      if (v === undefined) die(`${a} requires a value`);
      opts[a.slice(2)] = v;
    } else if (a === "--help" || a === "-h") {
      console.log(HELP);
      process.exit(0);
    } else if (a.startsWith("-")) die(`unknown option ${a} (see --help)`);
    else pos.push(a);
  }

  const [cmd, ...rest] = pos;
  if (!cmd) {
    console.log(HELP);
    process.exit(2);
  }
  if (cmd === "init") return cmdInit(rest[0]);

  const root = findRoot(opts.root as string | undefined);
  switch (cmd) {
    case "validate":
      return cmdValidate(root, !!opts.strict, !!opts.json);
    case "index":
      return cmdIndex(root, !!opts.write, !!opts.json);
    case "log":
      if (!rest[0]) die("log requires a message");
      return cmdLog(root, rest.join(" "), (opts.action as string) ?? "Update", opts.dir as string | undefined);
    case "stale":
      return cmdStale(root, !!opts.json);
    case "mark-synced":
      return cmdMarkSynced(root, rest[0]);
    default:
      die(`unknown command "${cmd}" (see --help)`);
  }
}

main();
