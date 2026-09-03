---
name: diagnosing-hard-bugs
description: Diagnose hard, intermittent, flaky, or performance bugs with a tight reproduction and falsifiable hypotheses. Use when ordinary focused debugging has failed, the symptom resists reproduction, or the user specifically asks; do not use for straightforward failures with an obvious local cause.
---

# Diagnosing hard bugs

Build a feedback loop that fails on the reported bug before investing in a theory. The loop must exercise the relevant path, distinguish this bug from a nearby failure, and be quick enough to run repeatedly.

Redact secrets from commands, output, logs, and captured artifacts. Ask for the smallest missing artifact or access when redacted evidence is insufficient.

## Reproduce and reduce

1. State the exact observable symptom.
2. Find the cheapest faithful reproduction: an existing test, a CLI command, an HTTP request, a browser path, a captured-event replay, or a small temporary script.
3. Run it and confirm it detects the user's symptom.
4. Remove inputs, setup, and actors one at a time until each remaining part is necessary.

If you cannot reproduce the issue, stop and report back. For intermittent bugs, improve the reproduction rate with repetition, fixed seeds or time, concurrency, or controlled scheduling. Report the measured rate. If no faithful loop is possible, stop and state what evidence or access is missing. Do not compensate by inventing a theory.

## Test hypotheses

After the loop is red, write a short ranked list of distinct explanations. Each must predict an observation that would support or reject it. Show the list to the user when their domain knowledge could cheaply reorder it, but continue with safe read-only probes if they are away.

Test one prediction at a time. Prefer a debugger or direct inspection, then targeted instrumentation at the boundary that distinguishes two hypotheses. Do not log everything and search afterward. Measure performance before changing performance code.

## Finish at the requested boundary

If the user asked only for diagnosis, report the cause, evidence, remaining uncertainty, and the smallest credible fix. Do not implement it.

If the user asked for a fix:

1. Preserve the reduced reproduction as a regression test when a faithful test location exists.
2. Apply the smallest root-cause fix.
3. Run the reduced case and the original user path.
4. Remove temporary instrumentation and artifacts that should not remain.
5. Report exactly what passed, what was not checked, and why.
