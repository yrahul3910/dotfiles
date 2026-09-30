/**
 * Session recaps: what the session is working on, what is done, and what is next.
 *
 * /recap writes one on demand. With `recapIdleMinutes` set in settings.json, a recap is also written once the agent has
 * settled and the terminal has seen no keypresses for that long, so it is waiting when you come back. Recaps are
 * transcript entries only and never enter the model's context.
 */

import { uuidv7, type TextContent } from "@earendil-works/pi-ai";
import {
    buildSessionContext,
    convertToLlm,
    getMarkdownTheme,
    serializeConversation,
    SettingsManager,
    type ExtensionAPI,
    type ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { Box, Markdown, Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";
import { Value } from "typebox/value";

const RECAP_ENTRY = "recap";

// Short sessions are easy to pick back up, so idle recaps skip them.
const MIN_IDLE_RECAP_PROMPTS = 3;

const SYSTEM_PROMPT = `You write a recap of a coding session so the user can pick it back up after time away.

Reply with exactly these three Markdown bullets, each at most 25 words:
- **Working on:** the goal the user is pursuing now.
- **Done:** what is finished.
- **Next:** what remains, including anything waiting on the user.

Do not continue the conversation or answer questions in it. Output only the bullets.`;

const recapSettings = Type.Object({
    recapIdleMinutes: Type.Optional(Type.Number({ minimum: 0 })),
});

type RecapData = { text: string };

/** Resolve the idle threshold in minutes, where project settings override global ones and 0 disables idle recaps. */
export function getRecapIdleMinutes(
    globalSettings: unknown,
    projectSettings: unknown,
) {
    const global = Value.Parse(recapSettings, globalSettings);
    const project = Value.Parse(recapSettings, projectSettings);

    return project.recapIdleMinutes ?? global.recapIdleMinutes ?? 0;
}

function loadRecapIdleMinutes(ctx: ExtensionContext) {
    const settings = SettingsManager.create(ctx.cwd, undefined, {
        projectTrusted: ctx.isProjectTrusted(),
    });
    const errors = settings.drainErrors();
    if (errors.length > 0)
        throw new Error(errors.map((item) => item.error.message).join("\n"));

    return getRecapIdleMinutes(
        settings.getGlobalSettings(),
        settings.getProjectSettings(),
    );
}

function conversationText(ctx: ExtensionContext) {
    const { messages } = buildSessionContext(
        ctx.sessionManager.getEntries(),
        ctx.sessionManager.getLeafId(),
    );
    return serializeConversation(convertToLlm(messages));
}

function countPrompts(ctx: ExtensionContext) {
    return ctx.sessionManager
        .getBranch()
        .filter(
            (entry) =>
                entry.type === "message" && entry.message.role === "user",
        ).length;
}

/**
 * Ask the session's current model to recap `conversation`.
 *
 * The request carries only the recap instructions and the serialized conversation: no tools, no session state, and a
 * fresh cache key, so it cannot change the session or its provider cache. Throws when no model is selected, when the
 * provider reports an error, and when `signal` aborts the request.
 */
async function generateRecap(
    ctx: ExtensionContext,
    conversation: string,
    signal?: AbortSignal,
) {
    if (!ctx.model) throw new Error("no model selected");

    const response = await ctx.modelRegistry.complete(
        ctx.model,
        {
            systemPrompt: SYSTEM_PROMPT,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `<conversation>\n${conversation}\n</conversation>`,
                        },
                    ],
                    timestamp: Date.now(),
                },
            ],
        },
        { signal, cacheRetention: "none", sessionId: uuidv7() },
    );

    if (response.stopReason === "error" || response.stopReason === "aborted")
        throw new Error(
            response.errorMessage ?? `request ${response.stopReason}`,
        );

    return response.content
        .filter((block): block is TextContent => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();
}

export default function (pi: ExtensionAPI) {
    let idleMs = 0;
    let idleTimer: NodeJS.Timeout | undefined;
    let idleRecap: AbortController | undefined;
    let stopWatchingInput: (() => void) | undefined;

    const writeRecap = async (
        ctx: ExtensionContext,
        conversation: string,
        signal?: AbortSignal,
    ) => {
        try {
            const text = await generateRecap(ctx, conversation, signal);
            if (!signal?.aborted)
                pi.appendEntry<RecapData>(RECAP_ENTRY, { text });
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error);
            if (!signal?.aborted)
                ctx.ui.notify(`Recap failed: ${message}`, "error");
        }
    };

    // One recap per idle stretch: the timer is cleared when it fires, so only the next settled run can start another.
    const startIdleTimer = (ctx: ExtensionContext) => {
        clearTimeout(idleTimer);

        idleTimer = setTimeout(() => {
            idleTimer = undefined;
            idleRecap = new AbortController();
            void writeRecap(ctx, conversationText(ctx), idleRecap.signal);
        }, idleMs).unref();
    };

    const stopIdleRecap = () => {
        clearTimeout(idleTimer);
        idleTimer = undefined;
        idleRecap?.abort();
    };

    pi.registerEntryRenderer<RecapData>(
        RECAP_ENTRY,
        (entry, _options, theme) => {
            if (!entry.data) return undefined;

            const box = new Box(1, 1, (text) =>
                theme.bg("customMessageBg", text),
            );
            box.addChild(
                new Text(
                    theme.fg("customMessageLabel", theme.bold("Recap")),
                    0,
                    0,
                ),
            );
            box.addChild(
                new Markdown(entry.data.text, 0, 0, getMarkdownTheme()),
            );

            return box;
        },
    );

    pi.on("session_start", (_event, ctx) => {
        idleMs = ctx.mode === "tui" ? loadRecapIdleMinutes(ctx) * 60_000 : 0;
        if (idleMs === 0) return;

        stopWatchingInput = ctx.ui.onTerminalInput(() => {
            if (idleTimer) startIdleTimer(ctx);
            return undefined;
        });
    });

    pi.on("agent_settled", (_event, ctx) => {
        if (idleMs > 0 && countPrompts(ctx) >= MIN_IDLE_RECAP_PROMPTS)
            startIdleTimer(ctx);
    });

    pi.on("agent_start", stopIdleRecap);

    pi.on("session_shutdown", () => {
        stopIdleRecap();
        stopWatchingInput?.();
        stopWatchingInput = undefined;
    });

    pi.registerCommand("recap", {
        description:
            "Recap what this session is working on, what is done, and what is next",
        handler: async (_args, ctx) => {
            const conversation = conversationText(ctx);

            if (!conversation) {
                ctx.ui.notify("Nothing to recap yet", "info");
                return;
            }

            stopIdleRecap();
            ctx.ui.notify("Writing recap...", "info");
            await writeRecap(ctx, conversation);
        },
    });
}
