/**
 * Automatic reasoning-effort routing.
 *
 * The model sets its own thinking level through set_reasoning_effort. UI sessions reset to the cheap baseline
 * before each user turn; headless sessions, including subagents, keep their caller's level. Pi re-reads the
 * thinking level before each LLM call, so a tool change takes effect within the same agent loop.
 *
 * Manual override: alt+e opens a picker to pin a level or return to auto
 * (alt+digit chords are taken by tmux window bindings). /effort <level|auto>
 * does the same without the UI. Pins are saved in the session until released.
 * The editor border color always shows the current level.
 */

import { StringEnum } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const LEVELS = ["minimal", "low", "medium", "high", "xhigh"] as const;
type Level = (typeof LEVELS)[number];

const BASELINE: Level = "low";
const PIN_ENTRY = "effort-pin";

export default function (pi: ExtensionAPI) {
    // When the user pins a level, auto-reset and the model's tool both stand
    // down until "auto" is picked again.
    let pinned: Level | null = null;

    const describeState = () => (pinned ? `${pinned} (pinned)` : `auto, at ${pi.getThinkingLevel()}`);

    const applyChoice = (choice: string, ctx: ExtensionContext) => {
        const selected = LEVELS.find((level) => level === choice);
        if (choice === "auto") {
            pinned = null;
            pi.setThinkingLevel(BASELINE);
            pi.appendEntry(PIN_ENTRY, null);
            ctx.ui.notify(`effort: auto (baseline ${BASELINE})`);
        } else if (selected) {
            pinned = selected;
            pi.setThinkingLevel(pinned);
            pi.appendEntry(PIN_ENTRY, pinned);
            ctx.ui.notify(`effort: ${pinned} pinned; effective ${pi.getThinkingLevel()} ('auto' to release)`);
        } else {
            ctx.ui.notify(`effort: ${describeState()}`);
        }
    };

    pi.on("session_start", async (_event, ctx) => {
        pinned = null;

        for (const entry of ctx.sessionManager.getBranch().toReversed()) {
            if (entry.type === "custom" && entry.customType === PIN_ENTRY) {
                pinned = LEVELS.find((level) => level === entry.data) ?? null;
                break;
            }
        }

        if (pinned !== null || ctx.hasUI) pi.setThinkingLevel(pinned ?? BASELINE);
    });

    pi.on("before_agent_start", async (_event, ctx) => {
        if (pinned !== null || ctx.hasUI) pi.setThinkingLevel(pinned ?? BASELINE);
    });

    pi.on("model_select", (_event, ctx) => {
        if (pinned === null) return;
        pi.setThinkingLevel(pinned);
        ctx.ui.notify(`effort: ${pinned} pinned; effective ${pi.getThinkingLevel()}`);
    });

    pi.registerTool({
        name: "set_reasoning_effort",
        label: "Reasoning effort",
        description:
            "Set your own reasoning effort for the rest of this user turn unless the user pinned it. " +
            `In UI sessions, effort resets to '${BASELINE}' at the start of every user turn, ` +
            "so set it again when a new turn continues nontrivial work. " +
            "Headless sessions, including subagents, keep their caller's level until explicitly changed.",
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
                            text: `Effort is pinned to '${pinned}' by the user; effective level is '${pi.getThinkingLevel()}'.`,
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
                        text: `Requested '${params.level}' for this turn; effective level is '${pi.getThinkingLevel()}'.`,
                    },
                ],
                details: params,
            };
        },
    });

    pi.registerShortcut("alt+e", {
        description: "Pick reasoning effort (pin a level or return to auto)",
        handler: async (ctx) => {
            const choice = await ctx.ui.select(`Reasoning effort (now ${describeState()}):`, ["auto", ...LEVELS]);
            if (choice) applyChoice(choice, ctx);
        },
    });

    pi.registerCommand("effort", {
        description: `Pin reasoning effort (${LEVELS.join("|")}) or return to auto`,
        getArgumentCompletions: (prefix) => {
            const options = ["auto", ...LEVELS].filter((o) => o.startsWith(prefix));
            return options.length > 0 ? options.map((o) => ({ value: o, label: o })) : null;
        },
        handler: async (args, ctx) => {
            applyChoice(args.trim(), ctx);
        },
    });
}
