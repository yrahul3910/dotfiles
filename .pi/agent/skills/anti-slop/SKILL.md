---
name: anti-slop
description: Run anti-slop checks on Python code before committing. Catches low-evidence and low-signal patterns that Ruff alone misses.
---

# Anti-slop

Run `anti-slop` on Python files before declaring done. It wraps Ruff with
broad rule selection and adds custom checks for patterns that agents tend
to produce.

## Usage

```bash
bun run anti-slop.ts <file-or-directory> [...more paths]
```

Exit code 0 means clean, 1 means violations found. Output format is
`path:line:col: RULE message`, one per line.

## Custom rules (SLOP codes)

These are checked in addition to Ruff's output:

- **SLOP001** — Smart punctuation (em-dash, en-dash, curly quotes, ellipsis
  character) in source. Use ASCII equivalents.
- **SLOP002** — `except` block with empty body (`pass` or `...`). Handle the
  error or let it propagate.

## Config

In `pyproject.toml` or `anti-slop.toml`:

```toml
[tool.anti-slop]
em-dash = false          # disable SLOP001
except-pass = false      # disable SLOP002
ruff-ignore = ["D"]      # additional Ruff codes to ignore
```

## When to fix vs. flag

Fix violations you introduced. If a violation exists in code you did not
touch, mention it to the user but do not fix it unless asked.
