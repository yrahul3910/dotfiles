/**
 * Automatic reasoning-effort routing.
 *
 * The model classifies each request itself and sets its own thinking level
 * through the set_reasoning_effort tool. Every user turn starts back at the
 * cheap baseline, so a quick question after a hard task never burns minutes
 * of reasoning; escalating costs one fast round-trip at the start of a
 * nontrivial turn (the thinking level is re-read before every LLM call, so
 * the change applies immediately within the same agent loop).
 *
 * Manual override: alt+e opens a picker to pin a level or return to auto
 * (alt+digit chords are taken by tmux window bindings). /effort <level|auto>
 * does the same without the UI. Pinning pauses auto-routing until released.
 * The editor border color always shows the current level.
 */

import { StringEnum } from "@earendil-works/pi-ai";
import type {
    ExtensionAPI,
    ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const LEVELS = ["minimal", "low", "medium", "high", "xhigh"] as const;
type Level = (typeof LEVELS)[number];

const BASELINE: Level = "low";

export default function (pi: ExtensionAPI) {
    // When the user pins a level, auto-reset and the model's tool both stand
    // down until "auto" is picked again.
    let pinned: Level | null = null;

    const describeState = () =>
        pinned ? `${pinned} (pinned)` : `auto, at ${pi.getThinkingLevel()}`;

    const applyChoice = (choice: string, ctx: ExtensionContext) => {
        if (choice === "auto") {
            pinned = null;
            pi.setThinkingLevel(BASELINE);
            ctx.ui.notify(`effort: auto (baseline ${BASELINE})`);
        } else if ((LEVELS as readonly string[]).includes(choice)) {
            pinned = choice as Level;
            pi.setThinkingLevel(pinned);
            ctx.ui.notify(`effort: ${choice} (pinned -- 'auto' to release)`);
        } else {
            ctx.ui.notify(`effort: ${describeState()}`);
        }
    };

    pi.on("session_start", async () => {
        if (!pinned) pi.setThinkingLevel(BASELINE);
    });

    pi.on("before_agent_start", async () => {
        if (!pinned) pi.setThinkingLevel(BASELINE);
    });

    pi.registerTool({
        name: "set_reasoning_effort",
        label: "Reasoning effort",
        description:
            "Set your own reasoning effort for the rest of this user turn. " +
            `Effort resets to '${BASELINE}' at the start of every user turn, ` +
            "so set it again when a new turn continues nontrivial work.",
        promptSnippet: "Set your own reasoning effort for the current task",
        promptGuidelines: [
            "Call set_reasoning_effort as your first action before nontrivial work: " +
                "'medium' for a small focused change, 'high' for multi-file work or " +
                "planning, 'xhigh' for design docs. It takes effect on your next " +
                "reasoning step. Skip it entirely for questions and trivial edits.",
        ],
        parameters: Type.Object({
            level: StringEnum(LEVELS),
            reason: Type.String({
                description: "One short sentence saying why, shown to the user",
            }),
        }),
        async execute(_toolCallId, params) {
            if (pinned) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Effort is pinned to '${pinned}' by the user; not changed.`,
                        },
                    ],
                    details: params,
                };
            }
            pi.setThinkingLevel(params.level);
            return {
                content: [
                    {
                        type: "text",
                        text: `Reasoning effort set to '${params.level}' for this turn.`,
                    },
                ],
                details: params,
            };
        },
    });

    pi.registerShortcut("alt+e", {
        description: "Pick reasoning effort (pin a level or return to auto)",
        handler: async (ctx) => {
            const choice = await ctx.ui.select(
                `Reasoning effort (now ${describeState()}):`,
                ["auto", ...LEVELS],
            );
            if (choice) applyChoice(choice, ctx);
        },
    });

    pi.registerCommand("effort", {
        description: `Pin reasoning effort (${LEVELS.join("|")}) or return to auto`,
        getArgumentCompletions: (prefix) => {
            const options = ["auto", ...LEVELS].filter((o) =>
                o.startsWith(prefix),
            );
            return options.length > 0
                ? options.map((o) => ({ value: o, label: o }))
                : null;
        },
        handler: async (args, ctx) => {
            applyChoice(args.trim(), ctx);
        },
    });
}
