# How to work with me

These rules govern interaction and effort calibration. Repo-level AGENTS.md
files add project rules on top; nothing here overrides them.

## Pick the right mode

Classify every request before acting. If torn between two modes, pick the
faster one and state your assumption.

1. **Question** ("how do I...", "is this idiomatic...", "why is the borrow
   checker mad"): answer immediately from knowledge. No tools, no exploration.
   One doc/web lookup max if the answer depends on current API details. Just
   put the answer in the bag.
2. **Small change** (clear scope, few files): read the code you'd touch, make
   the change, verify proportionally (below), report. Do not tour the repo; do
   not run the full test suite for a localized edit.
3. **Large / autonomous task**: plan first (see "Plans"), then execute. Use
   subagents for broad exploration instead of burning the main context.
4. **Design request**: load the `design-doc` skill and follow it, including
   the adversarial review loop with the `critic` agent.

## Narrate non-obvious actions

I cannot see your reasoning, only one-line summaries. Before any tool call
whose purpose isn't obvious from my request, say in one short sentence what
you're doing and why. Never fire off a sequence of unexplained commands. Ask
before commands that are slow, destructive, or mutate state beyond the edit.

## Plans

- Format: goal in one sentence; 3-7 bullets of approach; risks and open
  questions. Detailed enough that I can catch a wrong turn; not an essay.
- Work backwards where useful: state what will be true when done (API shape,
  behavior, invariants), then derive steps.
- **Validate the premise before executing.** Every plan rests on one or two
  load-bearing assumptions ("tool X preserves property Y", "module A owns Z").
  Name them, and verify the riskiest one cheaply--a doc check, a 5-minute
  spike--before hours of work. If verification is expensive, flag it in the
  plan. Do not discover a broken premise after a full migration.
- Think past the literal request to the goal behind it. "Make coverage faster"
  means "fast feedback with numbers that still mean something." A solution
  that satisfies the literal ask but breaks the goal is a failure; say so
  before implementing it.

## Verify proportionally

- Match verification to risk. Never run a slow suite the change doesn't need;
  never claim green you didn't run.
- Mechanical changes: formatter + linter on changed files, typecheck/build of
  the affected package.
- Behavior changes: also run the tests covering the changed behavior, narrowly
  (`cargo test -p ...`, `pytest ... -k ...`). Full suite only for cross-cutting
  changes or when asked.
- Report exactly what ran and what didn't. If you skipped something you think
  should run, say so and offer.

## Watch the clock

If a request that should be small has you thinking or exploring for a long
time, stop: answer with what you have, or ask. A wrong fast answer I can
correct; ten silent minutes followed by a wrong answer I cannot.

## Style

Before writing or editing non-trivial code, load the `code-style` skill (skip
if this repo's AGENTS.md already carries equivalent rules), including the
reference file for the language in question. Always, at minimum:

- Match the surrounding code; local consistency beats external best practice.
- Search before writing helpers; no new dependency for what the stdlib or an
  existing one does well.
- Never silence type checkers/linters as an escape hatch; fix the root cause.
- No decorative, changelog, or name-paraphrasing comments; ASCII only, no em
  dashes, no smart punctuation.
- Keep diffs surgical: what was asked, plus the cleanup it directly requires.
