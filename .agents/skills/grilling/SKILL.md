---
name: grilling
description: Resolve material product and design decisions before planning or implementing an ambiguous large feature. Use when the user asks to be grilled or when several valid interpretations would produce meaningfully different behavior, architecture, cost, or migration work; do not use for questions, small changes, or facts the repository can answer.
---

# Grill the feature

Prevent an expensive implementation from resting on an invented product or design decision.

## Establish the decision boundary

Read the request, relevant code, and existing project instructions first. Find facts yourself. Ask the user only for choices that cannot be learned from the repository or a cheap read-only check.

Map the unresolved decisions and their dependencies internally. A decision is material when different answers change user-visible behavior, ownership, data shape, compatibility, operational cost, or a hard-to-reverse choice.

## Ask

Ask one material question at a time. Use the interactive question tool when available.

- State the decision in plain language.
- Give the realistic options and your recommended answer. Make this the top option.
- Explain the consequence of the recommendation in one or two sentences.
- Do not ask a downstream question until its prerequisite decision is settled.
- Do not ask for preferences whose answers would not change the work.

Recompute the remaining decisions after each answer. Stop when every material branch is resolved; exhaustive interviewing is not the goal.

If the user is unavailable, continue gathering independent facts. Do not invent a product decision merely to start implementation.

## Hand back

Summarize the resolved decisions, any explicit assumptions, and remaining open questions. Then continue with the requested plan, design, or implementation workflow. Do not create documentation, tickets, or code merely because the grilling session occurred.
