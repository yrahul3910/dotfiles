import type { Usage } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

const CHARS_PER_TOKEN = 4;

type UsageTotals = {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    cost: number;
};

const formatTokens = (count: number) => {
    if (count < 1_000) return count.toString();
    if (count < 10_000) return `${(count / 1_000).toFixed(1)}k`;
    if (count < 1_000_000) return `${Math.round(count / 1_000)}k`;
    if (count < 10_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    return `${Math.round(count / 1_000_000)}M`;
};

export default function (pi: ExtensionAPI) {
    let responseStartedAt: number | undefined;
    let streamedCharacters = 0;
    let tokensPerSecond: number | undefined;
    let requestFooterRender: (() => void) | undefined;

    const updateRate = (tokens: number, startedAt: number) => {
        const elapsedSeconds = Math.max(
            (Date.now() - startedAt) / 1_000,
            0.001,
        );
        tokensPerSecond = tokens / elapsedSeconds;
        requestFooterRender?.();
    };

    pi.on("session_start", (_event, ctx) => {
        ctx.ui.setFooter((tui, theme, footerData) => {
            const unsubscribe = footerData.onBranchChange(() =>
                tui.requestRender(),
            );
            requestFooterRender = () => tui.requestRender();

            return {
                dispose() {
                    unsubscribe();
                    requestFooterRender = undefined;
                },
                invalidate() {},
                render(width: number): string[] {
                    const totals: UsageTotals = {
                        input: 0,
                        output: 0,
                        cacheRead: 0,
                        cacheWrite: 0,
                        cost: 0,
                    };
                    let latestCacheHitRate: number | undefined;

                    const addUsage = (usage: Usage) => {
                        totals.input += usage.input;
                        totals.output += usage.output;
                        totals.cacheRead += usage.cacheRead;
                        totals.cacheWrite += usage.cacheWrite;
                        totals.cost += usage.cost.total;
                    };

                    for (const entry of ctx.sessionManager.getEntries()) {
                        if (
                            entry.type === "message" &&
                            entry.message.role === "assistant"
                        ) {
                            addUsage(entry.message.usage);
                            const promptTokens =
                                entry.message.usage.input +
                                entry.message.usage.cacheRead +
                                entry.message.usage.cacheWrite;
                            latestCacheHitRate =
                                promptTokens > 0
                                    ? (entry.message.usage.cacheRead /
                                          promptTokens) *
                                      100
                                    : undefined;
                        } else if (
                            entry.type === "message" &&
                            entry.message.role === "toolResult" &&
                            entry.message.usage
                        ) {
                            addUsage(entry.message.usage);
                        } else if (
                            (entry.type === "branch_summary" ||
                                entry.type === "compaction") &&
                            entry.usage
                        ) {
                            addUsage(entry.usage);
                        }
                    }

                    const stats = [];
                    if (totals.input)
                        stats.push(`↑${formatTokens(totals.input)}`);
                    if (totals.output)
                        stats.push(`↓${formatTokens(totals.output)} •`);
                    if (totals.cacheRead)
                        stats.push(`R${formatTokens(totals.cacheRead)}`);
                    if (totals.cacheWrite)
                        stats.push(`W${formatTokens(totals.cacheWrite)}`);
                    if (latestCacheHitRate !== undefined)
                        stats.push(`CH${latestCacheHitRate.toFixed(1)}% •`);
                    if (totals.cost) stats.push(`$${totals.cost.toFixed(3)} •`);

                    const contextUsage = ctx.getContextUsage();
                    const contextWindow =
                        contextUsage?.contextWindow ??
                        ctx.model?.contextWindow ??
                        0;
                    const context =
                        contextUsage?.percent === null ||
                        contextUsage === undefined
                            ? `?/${formatTokens(contextWindow)} •`
                            : `${contextUsage.percent.toFixed(1)}%/${formatTokens(contextWindow)}`;
                    stats.push(context);

                    if (tokensPerSecond !== undefined)
                        stats.push(`• ${tokensPerSecond.toFixed(1)} tok/s`);

                    const left = stats.join(" ");
                    const model = ctx.model?.reasoning
                        ? `${ctx.model.id} - ${ctx.thinkingLevel}`
                        : (ctx.model?.id ?? "no-model");
                    const provider =
                        footerData.getAvailableProviderCount() > 1 && ctx.model
                            ? `(${ctx.model.provider}) ${model}`
                            : model;
                    const remaining =
                        width - visibleWidth(left) - visibleWidth(provider);
                    const statsLine =
                        remaining >= 2
                            ? `${left}${" ".repeat(remaining)}${provider}`
                            : truncateToWidth(left, width);

                    const branch = footerData.getGitBranch();
                    const location = branch
                        ? `${ctx.cwd} (${branch})`
                        : ctx.cwd;
                    const lines = [
                        truncateToWidth(
                            theme.fg("dim", location),
                            width,
                            theme.fg("dim", "..."),
                        ),
                        theme.fg("dim", statsLine),
                    ];
                    const statuses = Array.from(
                        footerData.getExtensionStatuses().entries(),
                    )
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([, text]) =>
                            text
                                .replace(/[\r\n\t]/g, " ")
                                .replace(/ +/g, " ")
                                .trim(),
                        );
                    if (statuses.length > 0)
                        lines.push(truncateToWidth(statuses.join(" "), width));
                    return lines;
                },
            };
        });
    });

    pi.on("message_start", (event) => {
        if (event.message.role !== "assistant") return;
        responseStartedAt = Date.now();
        streamedCharacters = 0;
        tokensPerSecond = undefined;
        requestFooterRender?.();
    });

    pi.on("message_update", (event) => {
        if (
            event.assistantMessageEvent.type !== "text_delta" ||
            responseStartedAt === undefined
        )
            return;
        streamedCharacters += event.assistantMessageEvent.delta.length;
        updateRate(
            Math.ceil(streamedCharacters / CHARS_PER_TOKEN),
            responseStartedAt,
        );
    });

    pi.on("message_end", (event) => {
        if (
            event.message.role !== "assistant" ||
            responseStartedAt === undefined
        )
            return;
        updateRate(event.message.usage.output, responseStartedAt);
    });
}
