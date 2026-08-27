---
description: Run a multi-agent swarm debate on a question and synthesize the result
argument-hint: "<question>"
---
Run a swarm debate on: $@

Setup:

1. Load the roster: read `.pi/swarm/config.json` if it exists (project
   override), otherwise `~/.pi/agent/swarm/config.json`. It defines
   `rounds` and `members` (name, model, persona). A null model means the
   session's current model.
2. Pick a slug for this debate and create `.pi/swarm/<slug>/` in the project.
   Write `BRIEF.md` there containing the question, any constraints from our
   conversation, and the debate rules below. This directory is the
   blackboard; agents communicate only through it.

Rules for every swarm member (include these in BRIEF.md):

- Read `BRIEF.md` and every file in the current and previous round
   directories before answering.
- If you have no write access, use your final message as your
   position paper and mention that to the orchestrator so it can write 
   the file for you. Otherwise, write to the blackboard as
   `round-<N>/<your-name>.md`; make it complete and self-contained.
- Take a clear position and argue for it; length is whatever the argument
   needs. In rounds after the first, respond to other members by name:
   concede where they are right, attack where they are wrong, and update
   your position if the evidence warrants it.
- No hedging lists; take a position.

Execution:

3. For each round N from 1 to `rounds`: spawn every member in parallel with
   the Agent tool (run_in_background, `model` from the roster, `general-purpose`
   type). Each member's prompt is: their persona from the roster, the
   blackboard path, the round number, and the rules. Wait for all to finish,
   then write each member's final message verbatim to
   `round-<N>/<name>.md` (do not summarize; the next round reads these).
4. After the final round, read the whole board and synthesize: where the
   swarm converged, the strongest surviving dissent (if any), and your
   recommended answer to the question. Present that synthesis, and note the
   blackboard path so I can inspect the debate.
