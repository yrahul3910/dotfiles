---
name: design-doc
description: Write a design doc, RFC, or architecture proposal with adversarial review. Use whenever the user asks for a design document, an RFC, an evaluation of approaches with a recommendation, or to think through a significant technical decision before implementing it.
---

# Design doc with adversarial review

This is the one workflow where slow and thorough beats fast. Call
set_reasoning_effort with level "xhigh" before starting, if available.

1. **Understand.** Read the relevant code. Spawn Explore subagents for breadth
   instead of burning the main context; web-search prior art where useful.
   Read-only--no state-changing commands.
2. **Work backwards.** Write the end state first: what is true when this
   ships (API shape, behavior, invariants, numbers that still mean something).
   If you can't write it, you don't understand the problem yet--go back to
   research.
3. **Draft.** The doc must contain:
   - Problem statement and context
   - Goals and non-goals
   - Proposed design, with every piece of added complexity justified
   - Alternatives considered in their strongest form, and why each was
     rejected--real reasons, not strawmen
   - Trade-offs of the chosen design
   - Migration and operational impact (CI time, maintenance, lock-in)
   - Risks, open questions, rollout
   Well-argued prose, not bullet salad.
4. **Adversarial loop.** Spawn the critic agent (Agent tool, subagent_type:
   "critic") with the full draft and pointers to the relevant code. For every
   finding: fix it, or rebut it with reasoning recorded in the doc. Repeat
   until a round yields only minor findings. Do not skip or soften this phase.
5. **Deliver.** Save the doc as markdown (under docs/ if the repo has an
   obvious place, otherwise ask). Summarize what the critic caught and what
   you rebutted.
