---
name: writing-for-agents
description: Write or revise skills, AGENTS.md, CLAUDE.md, prompts, and other instructions consumed by coding agents. Use when agent behavior, skill routing, instruction structure, or prompt maintenance is part of the task.
---

# Writing for agents

Write instructions that lead an agent through the same sound process on repeated runs. Do not try to force identical wording or implementation.

When the document is a skill, also read [references/skill-mechanics.md](references/skill-mechanics.md).

## Start with behavior

State what the agent should do, when the instruction applies, and what proves it is finished. Include only rules that change a decision or prevent a demonstrated failure. Don't add generic encouragement and facts the agent can inspect locally.

## Make context pointers reliable

A context pointer is always-loaded text that tells an agent when to read more, such as a skill description or a line in `AGENTS.md` that names another file.

- Name the material and the distinct situations that require it.
- Put the strongest trigger words early.
- Do not repeat synonyms for the same trigger.
- Keep rules needed on every branch nearby. Move branch-specific detail behind a pointer and say when to read it.

The wording of the pointer determines whether the agent finds the material. A complete reference behind a vague pointer is still unreliable.

## Keep the important steps visible

Separate ordered actions from reference material. Put the normal path and its completion conditions in the main file. Move substantial conditional guidance, schemas, and examples into focused references.

Keep a rule's definition, exceptions, and consequences together. Scattering one idea across several sections makes it harder to apply and harder to maintain.

Every step needs a checkable completion condition. Prefer "every changed public method has a compatibility decision" to "review the API carefully". The best condition is both observable and complete for the stated scope.

## Keep one source of truth

- Store each rule in one authoritative place and point to it elsewhere.
- Treat code, configuration, directory structure, and `--help` output as sources of truth. Do not copy a cheap lookup into prose that can drift.
- Record what the environment cannot reveal: intent, constraints, permission boundaries, and surprising behavior.
- Remove stale branches, repeated meanings, and instructions that do not change agent behavior.

Prefer a positive target over a catalog of unwanted behavior. Keep direct prohibitions for safety, permissions, destructive actions, or a recurring failure that positive wording does not prevent.

Before finishing, apply `unslop` to the changed prose without weakening its behavioral requirements.
