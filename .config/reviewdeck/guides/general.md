---
name: General
languages: []
always: true
---

# General review standards

Source: personal code-style rules (`~/.agents/skills/code-style`). Optimize for the person who reads the code next, not for finishing the diff.

## Fit in before you stand out

- [R1] Match the surrounding code: naming, structure, error handling, logging, idioms. Local consistency beats external "best practice."
- [R2] Use the repo's established way of doing things (config, HTTP, dates, validation, DI). Introducing a second way to do the same thing is a regression even if the new way is nicer.
- [R3] Follow the repo's written standards and formatter/linter configuration. Project rules take precedence over these guides on style, not correctness; don't request formatting that conflicts with the project's formatter.

## Don't reinvent or duplicate

- [R10] Search before writing helpers: flag new utilities that duplicate something in the repo or its dependencies.
- [R11] Rule of Three: copying once is fine; the third occurrence earns a proper abstraction. A shared helper with a special-case flag bolted on is worse than two copies.
- [R12] No new dependency for what the stdlib or an existing dependency already does well.
- [R13] Use language and framework built-ins rather than reimplementing them.

## Earn every abstraction

- [R20] Don't extract a function used once unless it names genuinely non-obvious intent, removes deep nesting, or enables meaningful testing or composition. Being more granular is not enough.
- [R21] Inline pass-through one-liners that only rename or forward to another function and serve no testing or composition purpose.
- [R22] YAGNI: no parameters, options, config hooks, or interfaces added "in case we need them later." Generalize when the second real caller appears.

## Be honest with the tools

- [R30] No silencing the type checker or linter as an escape hatch (noqa, type: ignore, ts-ignore, blanket any, gratuitous casts, non-null assertions). A suppression is acceptable only when the tool is genuinely wrong, scoped to a single line, and commented with why.
- [R31] Don't weaken types to compile; loosening a type to get past an error hides a bug.
- [R32] Don't make tests pass by deleting, skipping, or weakening them. If a test is genuinely wrong, explain why its expectation must change; don't quietly remove coverage.

## Code shape

- [R40] Data clumps: arguments that always travel together (userId/orgId/accountId, start/end, x/y) belong in a struct or type.
- [R41] One function returns one shape: not sometimes a list, sometimes a single item, sometimes null.
- [R42] Rely on invariants the types already guarantee; don't recheck what the type system or a caller already established. Document the invariant instead.
- [R43] Restructure to eliminate special cases rather than piling on branches. Most ugly code is a symptom of the wrong data structure.
- [R44] Make illegal states unrepresentable; prefer structures where the bad case can't be constructed over runtime checks that hope to catch it.
- [R45] Reduce nesting: guard clauses and early returns over deep if/else pyramids.
- [R46] Separate logical blocks with blank lines.

## Comments

- [R50] Comments explain why, not what. No narrating code that already says what it does; no comment that paraphrases the function name.
- [R51] No changelog or diff-narration comments: no "added X", "fixed bug", "instead of the old Y", "previously". Keep rationale that explains a current choice, including why an alternative deadlocks or violates an invariant. Explain the live decision, not the edit history.
- [R52] Delete commented-out code.
- [R53] No decorative separators or banner comments. If a file needs visual dividers, it needs splitting.
- [R54] Match the codebase's comment tone. Replace unsupported promotional claims such as "robust" or "production-ready" with the actual guarantee or constraint, or remove them. Judge context; a keyword match alone is not a defect.

## Characters and punctuation

- [R60] Plain ASCII in code, comments, commit messages, and output: no emojis, no em-dash characters, no smart quotes. Use "-" or "--" and straight quotes.

## Naming

- [R70] Names reveal intent and match the codebase's conventions; avoid abbreviations that aren't already standard in the repo or domain.
- [R71] Booleans read as yes/no questions: isActive, hasAccess, canEdit; not activeFlag, access, edit.

## Errors

- [R80] Match the repo's error strategy (exceptions vs result types vs error returns); don't introduce a competing one.
- [R81] Don't swallow errors: no empty catch, no catch-log-continue that hides failure. Fail where failure is meaningful and let callers decide.
- [R82] Handle real empty, null, boundary, and concurrent cases. Prefer a structure that handles them naturally over adding defensive branches.

## Scope

- [R90] Diffs stay surgical: what was asked plus the cleanup it directly requires. Flag unrelated refactors, wholesale renames, and "while I'm here" changes so they can be split out.
- [R91] When existing code already uses the code-shape smells above, preserve local consistency and suggest the broader refactor separately. Don't demand an unrelated rewrite to make a focused change conform.

## Verification and checker findings

- [R100] Check the available formatter, linter, typecheck/build, and test evidence for the affected code. Behavior changes need focused behavior tests; reserve full-suite expectations for cross-cutting changes. State missing or failed checks without claiming they passed or treating missing evidence alone as a demonstrated code bug.
- [R101] When interpreting no-slop findings, consult the applicable skill (`~/.agents/skills/no-sloppy/SKILL.md` or `~/.agents/skills/no-slop-ts/SKILL.md`) and its active configuration. Vendored but disabled rules are not policy. Don't reproduce the entire Ruff/Oxlint catalog as review comments.
- [R102] Distinguish checker errors, advisory warnings, and Python heuristics. Require contextual evidence for a review finding; heuristics never fail the Python check, even under --strict. Default checker runs cover changed lines, not every line in the repo, so a clean result is not proof of complete coverage.
