---
name: verify-real-surface
description: Verify a requested behavior through its real UI, CLI, or API surface when tests alone are insufficient. Use after user-facing behavior changes or when asked to prove behavior; do not use for structural-only edits or broad exploratory audits.
---

# Verify the real surface

Prove the behavior the user asked for through the surface they would actually
use. The goal is focused evidence for the stated task, not an excuse to broaden
the work into a product audit or build a new test framework.

## Scope and questions

1. State the specific user journey or observable outcome to verify. Derive it
   from the request, acceptance criteria, and the changed code.
2. Read the repo's documentation and existing tests or harnesses to learn the
   normal way to start and drive that surface.
3. Ask the user before proceeding when a material fact is not observable:
   intended behavior among several valid choices, required credentials or test
   data, an external service or paid resource, a destructive action, or a
   visual target with no reference. Ask every concrete question needed to make
   the verification target unambiguous. Group independent questions when the
   interface supports it; otherwise ask them sequentially without guessing.
   Explain what the answers unblock.
4. Do not ask about facts the repo or a safe local experiment can establish.
   Do not add unrelated probes, dependencies, seed data, or permanent
   verification infrastructure unless the user asks for it.

## Verify

1. Prefer the repository's existing harness. Use browser automation for web or
   desktop UI, an existing terminal/PTY harness for CLI or TUI software, and
   real HTTP requests for services. Unit tests and internal setters support the
   check, but do not substitute for the requested surface.
2. Start only the local processes needed for the stated journey. Record a
   concrete readiness signal such as a responding endpoint, a rendered page,
   or a usable prompt.
3. Drive one representative user path using stable selectors, commands, or
   requests. Verify both the immediate result and any relevant observable side
   effect. A success message, dry-run label, or green build alone is not proof.
4. Capture compact evidence appropriate to the surface: command and exit code,
   response body, screenshot, terminal transcript, log line, or persisted
   state. Keep secrets and private data out of evidence.
5. Clean up only processes and data created for this verification. Do not stop
   an existing user-owned server or session.

## Verdict

Report one of:

- **Verified.** Name the journey, the real-surface evidence, and the command
  or repeatable steps.
- **Not verified.** State what failed and include the relevant evidence.
- **Blocked.** Ask the smallest concrete question or name the missing access.

Say exactly what was not checked. Do not claim that the whole product works
when only one requested path was exercised.
