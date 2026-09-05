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
   blackboard; only the orchestrator writes it.

Rules for every swarm member (include these in BRIEF.md):

- Read `BRIEF.md` and, after round 1, every paper in the completed previous round. Do not read the current round's papers; every member must answer from the same completed inputs.
- Return your complete, self-contained position paper as your final message. Do not write files. The orchestrator saves the paper verbatim after all members finish.
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
   then write each member's complete final message verbatim once to
   `round-<N>/<name>.md` (do not summarize; the next round reads these).
4. Treat configured `rounds` as the maximum unless the user explicitly requests an exact number. After a completed round, stop early if no material disagreement or unanswered criticism remains; record why. If a member fails or returns an incomplete paper, resolve that before starting another round, rather than silently omitting its position.
5. After the final round, read the whole board and synthesize: where the
   swarm converged, the strongest surviving dissent (if any), and your
   recommended answer to the question. Present that synthesis, and note the
   blackboard path so I can inspect the debate.
