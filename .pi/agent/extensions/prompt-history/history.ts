import {
    SessionManager,
    SettingsManager,
    type ExtensionContext,
    type SessionEntry,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { Value } from "typebox/value";

const historySettings = Type.Object({
    promptHistoryScope: Type.Optional(
        Type.Union([
            Type.Literal("project"),
            Type.Literal("global"),
            Type.Literal("session"),
        ]),
    ),
});

export function getHistoryScope(
    globalSettings: unknown,
    projectSettings: unknown,
) {
    const global = Value.Parse(historySettings, globalSettings);
    const project = Value.Parse(historySettings, projectSettings);
    return project.promptHistoryScope ?? global.promptHistoryScope ?? "project";
}

export function getPrompts(entries: readonly SessionEntry[]): string[] {
    return entries.flatMap((entry) => {
        if (entry.type !== "message" || entry.message.role !== "user")
            return [];
        const content = entry.message.content;
        const text = Array.isArray(content)
            ? content
                  .filter((block) => block.type === "text")
                  .map((block) => block.text)
                  .join("\n")
            : content;
        return text.trim() ? [text.trim()] : [];
    });
}

/** Load older prompts without adding them to the conversation or writing session files. */
export async function loadPromptHistory(
    ctx: ExtensionContext,
): Promise<string[]> {
    const settings = SettingsManager.create(ctx.cwd, undefined, {
        projectTrusted: ctx.isProjectTrusted(),
    });
    const errors = settings.drainErrors();
    if (errors.length > 0)
        throw new Error(errors.map((item) => item.error.message).join("\n"));
    const scope = getHistoryScope(
        settings.getGlobalSettings(),
        settings.getProjectSettings(),
    );
    if (scope === "session") return [];

    const sessions =
        scope === "global"
            ? await SessionManager.listAll()
            : await SessionManager.list(
                  ctx.cwd,
                  ctx.sessionManager.getSessionDir(),
              );
    const prompts: string[] = [];
    // Pi's editor retains at most 100 prompts, with the current session added last.
    for (const session of sessions) {
        if (session.id === ctx.sessionManager.getSessionId()) continue;
        if (scope === "project" && session.cwd !== ctx.cwd) continue;
        const entries = SessionManager.open(session.path).getEntries();
        prompts.unshift(...getPrompts(entries).slice(-100));
        if (prompts.length >= 100) break;
    }
    return prompts.slice(-100);
}
