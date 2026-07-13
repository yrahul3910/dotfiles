---
name: okf
description: Read, create, and update Open Knowledge Format (OKF) knowledge bundles — wikis of markdown concept files with YAML frontmatter, per Google's OKF v0.1 spec. Use when browsing or consuming an OKF bundle, when asked to create a knowledge wiki for a codebase or data system, or when editing a directory of .md files that carry `type:` frontmatter alongside index.md/log.md files. Covers the frontmatter schema, bundle-root-relative linking, index.md maintenance, and log.md changelog conventions.
---

# Open Knowledge Format (OKF) wikis

OKF v0.1 represents knowledge as a **bundle**: a directory tree of markdown
files. Every non-reserved `.md` file is one **concept** (a table, API, metric,
module, playbook, …) with YAML frontmatter. `index.md` and `log.md` are
reserved filenames and must never be used for concepts. Full spec:
[references/SPEC.md](references/SPEC.md).

## The `okf` CLI

This skill bundles a zero-dependency CLI (requires `bun` and `git`):
[scripts/okf.ts](scripts/okf.ts), normally on PATH as `okf`
(`~/.local/bin/okf`). If not on PATH, run `bun <skill-dir>/scripts/okf.ts`.
See `okf --help` for details.

- `okf init [path]` — bundle skeleton; plants `okf_version` and `source_commit`
- `okf validate [--strict] [--json]` — spec conformance; broken links are warnings
- `okf index [--write] [--json]` — detect index.md drift. `--write` regenerates
  in a tool-owned format (grouped by `type`) and overwrites hand-curated
  sections — fix drift by hand instead when indexes are curated
- `okf log "<msg>" [--action Creation] [--dir <path>]` — prepend changelog entry
- `okf stale [--json]` / `okf mark-synced [rev]` — source drift (see below)

All commands accept `--root <path>`; by default the bundle root is discovered
by walking up to the nearest `index.md` declaring `okf_version`.

## Finding the bundle root

Establish the bundle root before doing anything else. It is the topmost
directory of the wiki — usually where a root `index.md` lives, ideally one
declaring `okf_version: "0.1"` in frontmatter (the root `index.md` is the only
index file permitted to have frontmatter, and only for that key).

Links starting with `/` (e.g. `[customers](/tables/customers.md)`) resolve
relative to the **bundle root**, not the filesystem or git repo root.

## Reading a bundle

1. Start at the root `index.md` and follow links toward what you need
   (progressive disclosure). Do not bulk-read every file.
2. A concept's ID is its path minus `.md`: `tables/users.md` → `tables/users`.
3. Consume permissively — none of these are errors: unknown `type` values,
   missing optional frontmatter fields, unrecognized frontmatter keys, broken
   links (they may mark not-yet-written knowledge), missing `index.md`
   (synthesize a listing by scanning frontmatter instead).
4. Links are untyped relationship edges; the surrounding prose carries the
   semantics (joins-with, depends-on, …).

## Creating a bundle

```
bundle/
├── index.md          # root listing; frontmatter: okf_version: "0.1"
├── log.md            # changelog, newest first
├── <concept>.md
└── <group>/
    ├── index.md      # listing for this directory (no frontmatter)
    └── <concept>.md
```

Organize subdirectories by whatever grouping fits the domain. Use lowercase
hyphenated filenames. Distribute via git when possible — history and diffs are
part of the value.

## Writing a concept

```markdown
---
type: <Kind of concept>            # REQUIRED, e.g. "API Endpoint", "Module", "Playbook"
title: <Display name>
description: <One sentence — copied verbatim into index.md entries>
resource: <Canonical URI of the underlying asset; omit for abstract concepts>
tags: [tag1, tag2]
timestamp: 2026-07-11T00:00:00Z    # ISO 8601, last meaningful change
---
```

- `type` has no central registry. Pick short, self-explanatory noun phrases
  and stay consistent within the bundle.
- Prefer structural markdown in the body — tables, lists, fenced code blocks —
  over prose. Conventional section headings, used when applicable:
  `# Schema` (fields/columns), `# Examples`, `# Citations`.
- Cross-link liberally using the bundle-root-absolute form:
  `[orders](/tables/orders.md)`. Linking to a concept that doesn't exist yet
  is allowed and marks knowledge worth writing.
- Citations are numbered under `# Citations` at the bottom:
  `[1] [Source title](https://…)`.

## index.md format

Each directory's `index.md` lists its contents, grouped under headings:

```markdown
# Group Heading

* [Title](concept.md) - description copied from the concept's frontmatter
* [Subgroup](subdir/) - what the subdirectory holds
```

## log.md format

```markdown
# Update Log

## 2026-07-11
* **Creation**: Added [Orders](/tables/orders.md) covering the new pipeline.
* **Update**: Refreshed schema on [Customers](/tables/customers.md).
```

Date headings are ISO `YYYY-MM-DD`, newest first. Conventional bold prefixes:
`**Initialization**`, `**Creation**`, `**Update**`, `**Deprecation**`.

## After ANY change to a bundle — checklist

1. Preserve frontmatter keys you don't recognize; never strip them.
2. Bump `timestamp` on every concept you meaningfully changed.
3. If you moved or renamed a file, grep the bundle for the old path and fix
   inbound links.
4. `okf log "<one-line summary>" --action <Creation|Update|Deprecation>`
5. `okf index` — fix any reported drift (or `okf index --write` when the
   bundle's indexes are tool-owned rather than hand-curated).
6. `okf validate` — must exit 0 before you finish.

## Keeping wikis current

The bundle-root `index.md` frontmatter records `source_commit`: the
source-repo commit the wiki last absorbed (a producer extension key — spec
conformant; other OKF tools ignore it). When the wiki lives outside the repo
it documents, `source_repo` alongside it points at that repo.

When a session changes code or systems an OKF bundle documents, or when asked
to bring a wiki up to date:

1. `okf stale` — lists source commits and diffstat since `source_commit`,
   excluding the bundle itself. Exit 0 means nothing to do.
2. Update the concepts those changes affect, following the checklist above.
3. `okf mark-synced` — only after actually absorbing the changes into the
   wiki, not merely reading the diff.
