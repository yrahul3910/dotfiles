# Skill mechanics

## Invocation

Make a skill automatically discoverable when an agent must select it without the
user naming it or when another workflow needs it. Its description is then part
of the agent's permanent routing context, so the triggers must be narrow and
concrete.

Make a skill explicit-only when it represents a mode the user intentionally
chooses and automatic activation would add cost, ceremony, or surprising
actions. Follow the target agent's supported metadata rather than assuming every
agent interprets the same frontmatter.

## Descriptions

The description is a routing instruction, not a summary of the body. Say what
the skill changes and when that change is needed. Include a boundary when a
nearby ordinary task should not activate it.

## Composition

Reference another skill only when the workflow genuinely depends on it and the
target environment provides it. Do not restate the called skill's rules. If two
skills need the same substantial reference but cannot invoke one another, move
that reference to a plain shared file and point both skills to it.

Add a router only when users have enough explicit skills that remembering the
right one has become a real problem. A router should choose; it should not copy
the chosen skill's procedure.
