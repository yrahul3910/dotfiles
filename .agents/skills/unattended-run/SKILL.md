---
name: unattended-run
description: Persist on one explicitly authorized task while the user is away, continuing through verified units and evidence-backed pivots until its finish line is met. Use only for requests such as "keep working", "run until done", or "going to bed"; do not use to expand ordinary work autonomously.
---

# Unattended run

Run a clearly scoped task without waiting for routine feedback. Checkpoints are
how the run continues, not places to stop. Autonomy is bounded by the user's
request. New discoveries are follow-ups, not permission to change the
assignment.

## Start with a run contract

Before the first change, state:

- **Scope.** The requested outcome and the files, systems, or behavior it
  covers. Do not add adjacent improvements, refactors, or cleanup.
- **Done predicate.** A concrete, observable condition such as a reproduced
  bug now passing, a requested UI flow working, or named checks succeeding.
- **Evidence.** The command, test, or real-surface path that will establish
  the predicate.
- **Run horizon.** Continue through successive verified units until the done
  predicate is met. Honor an explicit time or cost limit when the user gives
  one; otherwise the predicate is the limit.
- **Checkpoint.** The first meaningful unit and the next likely unit. A
  checkpoint records progress, then the run starts the next safe unit.
- **Stop-and-ask conditions.** A product or design choice, unclear acceptance
  criterion, new required access or data, destructive action, material scope
  expansion, or evidence that further progress depends on a user decision.

If the scope or done predicate is materially ambiguous, ask every concrete
question needed to make it unambiguous before starting. Group independent
questions when the interface supports it; otherwise ask them sequentially.
Never replace a missing user decision with an invented default.

## Work in verified units

1. Take the smallest change or investigation step justified by current
   evidence.
2. Run the named evidence check. For user-facing behavior, use the real-surface
   verification procedure when it applies.
3. Keep a change only when it advances the done predicate. Revert or isolate
   a disproven hypothesis rather than letting speculative work accumulate.
4. At each meaningful checkpoint, record: action, evidence, verdict, and next
   step. For an explicitly requested long run, a durable trail is part of the
   work: reuse an existing project task log, or use an existing ignored scratch
   location. Do not edit `.gitignore` or commit the trail unless asked.
5. Start the next safe, in-scope unit immediately after a checkpoint. Do not
   stop merely because one check passed, a build is pending, or one hypothesis
   failed.
6. When a hypothesis fails, pivot rather than quit. Do not retry the same
   disproven mechanism. Test the next distinct, evidence-backed explanation
   that remains within scope. Ask only when the remaining paths require a user
   decision or are genuinely blocked by unavailable access or infrastructure.
7. Treat unrelated bugs, flaky tooling, style issues, and possible follow-ups
   as notes. Do not fix them unless they block the predicate or the user adds
   them to scope.

## Waiting and recovery

Use an available event or background-process mechanism only when it directly
serves the predicate, such as waiting for a build or a local verification
server. Choose an event wake when one exists; otherwise use a bounded interval
that matches when the result is worth re-checking. While waiting, do the next
independent in-scope unit or record that no such work exists. Do not busy-poll
and do not claim to monitor something without an actual mechanism.

If the host or session interrupts the run, resume from the durable trail or a
compact resume note. Reconstruct the run contract, current evidence,
working-tree or branch state, and the next exact action; do not redo completed
investigation without a reason. Never leave a deliberately broken state just
to reach a checkpoint.

## Finish or block

Stop only when the done predicate is verified, the user-specified horizon is
reached, or a stop-and-ask condition occurs. A failed hypothesis or a plateau
alone is a reason to pivot, not a reason to end the run. Report the predicate,
evidence, units completed, discarded hypotheses, and anything deliberately
left as a follow-up.

If a stop-and-ask condition occurs, stop the run and ask every concrete
question needed to unblock the next verified unit. Report what is already
proven and what remains unknown. Do not keep exploring unrelated possibilities
while waiting.
