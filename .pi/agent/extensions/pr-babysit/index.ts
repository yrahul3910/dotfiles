/**
 * PR babysitting: watch a pull request's CI and review bots, wake the agent only when something new arrives, and allow
 * a push only once everything working on the current head has settled.
 *
 * `pr_babysit_start` begins polling one PR, `pr_babysit_stop` ends it, and `pr_push` pushes when the PR has settled.
 * While a session is active, bash `git push` is blocked so every push goes through that gate. Events that arrive while
 * the agent is busy are held and delivered together once it settles.
 */

import {
    isToolCallEventType,
    SettingsManager,
    type ExtensionAPI,
    type ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { Value } from "typebox/value";
import {
    BOTS,
    evaluate,
    parseSnapshot,
    SNAPSHOT_QUERY,
    unseen,
    type Evaluation,
    type Feedback,
    type Timing,
} from "./snapshot.ts";

const POLL_MS = 60_000;
const MAX_PUSHES = 5;
const MAX_BODY_CHARS = 4000;
const MESSAGE_TYPE = "pr-babysit";

const DEFAULT_TIMING: Timing = {
    graceMs: 60_000,
    timeoutMs: { copilot: 15 * 60_000, codex: 20 * 60_000 },
};

const babysitSettings = Type.Object({
    prBabysit: Type.Optional(
        Type.Object({
            graceSeconds: Type.Optional(Type.Number({ minimum: 0 })),
            timeoutMinutes: Type.Optional(
                Type.Object({
                    copilot: Type.Optional(Type.Number({ minimum: 0 })),
                    codex: Type.Optional(Type.Number({ minimum: 0 })),
                }),
            ),
        }),
    ),
});

/** Resolve bot timing; project settings override global ones field by field, and unset fields keep the defaults. */
export function getTiming(globalSettings: unknown, projectSettings: unknown): Timing {
    const global = Value.Parse(babysitSettings, globalSettings).prBabysit;
    const project = Value.Parse(babysitSettings, projectSettings).prBabysit;
    const graceSeconds = project?.graceSeconds ?? global?.graceSeconds;

    const timeoutMs = { ...DEFAULT_TIMING.timeoutMs };

    for (const bot of BOTS) {
        const minutes = project?.timeoutMinutes?.[bot] ?? global?.timeoutMinutes?.[bot];
        if (minutes !== undefined) timeoutMs[bot] = minutes * 60_000;
    }

    return {
        graceMs: graceSeconds === undefined ? DEFAULT_TIMING.graceMs : graceSeconds * 1000,
        timeoutMs,
    };
}

function loadTiming(ctx: ExtensionContext) {
    const settings = SettingsManager.create(ctx.cwd, undefined, {
        projectTrusted: ctx.isProjectTrusted(),
    });
    const errors = settings.drainErrors();
    if (errors.length > 0) throw new Error(errors.map((item) => item.error.message).join("\n"));

    return getTiming(settings.getGlobalSettings(), settings.getProjectSettings());
}

type Session = {
    owner: string;
    name: string;
    number: number;
    cwd: string;
    timing: Timing;
    head: string;
    seenAt: number;
    /** Set by `pr_push` until GitHub reports the pushed commit, so a lagging snapshot does not reset the head. */
    pushedHead: string | undefined;
    settledHead: string | undefined;
    delivered: Set<string>;
    pushes: number;
    timer: NodeJS.Timeout | undefined;
};

const shortSha = (sha: string) => sha.slice(0, 7);

const truncate = (text: string) =>
    text.length > MAX_BODY_CHARS ? `${text.slice(0, MAX_BODY_CHARS)}\n[truncated; read the rest at the URL]` : text;

function describeFeedback(item: Feedback) {
    const where = item.thread
        ? `thread ${item.thread.id} on ${item.thread.path}${item.thread.line === null ? "" : `:${item.thread.line}`}`
        : "PR conversation";

    return `### ${item.author}, ${where}\n${item.url}\n\n${truncate(item.body.trim())}`;
}

function describeStatus(evaluation: Evaluation) {
    const bots = BOTS.map((bot) => `${bot} ${evaluation.bots[bot]}`);
    return `CI ${evaluation.ci}; ${bots.join(", ")}`;
}

export default function (pi: ExtensionAPI) {
    let session: Session | undefined;
    let sessionContext: ExtensionContext | undefined;
    const queued: string[] = [];

    const flush = () => {
        if (queued.length === 0) return;

        pi.sendMessage(
            {
                customType: MESSAGE_TYPE,
                content: queued.join("\n\n"),
                display: true,
            },
            { deliverAs: "followUp", triggerTurn: true },
        );
        queued.length = 0;
    };

    // While the agent is busy, events accumulate and go out together on `agent_settled`.
    const deliver = (text: string) => {
        queued.push(text);
        if (sessionContext?.isIdle()) flush();
    };

    const stop = () => {
        clearTimeout(session?.timer);
        session = undefined;
    };

    const gh = async (args: string[], cwd: string) => {
        const result = await pi.exec("gh", args, { cwd });

        if (result.code !== 0) throw new Error(`gh ${args[0]} failed: ${result.stderr.trim() || result.stdout.trim()}`);

        return result.stdout;
    };

    const fetchSnapshot = async (current: Session) =>
        parseSnapshot(
            await gh(
                [
                    "api",
                    "graphql",
                    "-f",
                    `query=${SNAPSHOT_QUERY}`,
                    "-f",
                    `owner=${current.owner}`,
                    "-f",
                    `name=${current.name}`,
                    "-F",
                    `number=${current.number}`,
                ],
                current.cwd,
            ),
        );

    const localHead = async (cwd: string) => {
        const result = await pi.exec("git", ["rev-parse", "HEAD"], { cwd });
        if (result.code !== 0) throw new Error(result.stderr.trim());

        return result.stdout.trim();
    };

    /**
     * Fetch the PR, queue a message for anything new, and return the evaluation of the head GitHub reports.
     *
     * Returns `undefined` when `current` is no longer the active session, while GitHub still reports the commit before
     * a `pr_push`, and after the PR is merged or closed, which also ends the session. A settled PR with no unresolved
     * threads, no new feedback, and no unpushed local commits ends the session too. Feedback and failures are marked
     * delivered as soon as they are queued, and `hasNews` says whether this poll found any.
     */
    const poll = async (current: Session) => {
        const snapshot = await fetchSnapshot(current);
        const label = `PR ${current.owner}/${current.name}#${current.number}`;
        if (session !== current) return undefined;

        if (snapshot.state !== "OPEN") {
            stop();
            deliver(`${label} is ${snapshot.state.toLowerCase()}; babysitting stopped.`);

            return undefined;
        }

        if (current.pushedHead && snapshot.head !== current.pushedHead) return undefined;

        current.pushedHead = undefined;

        if (snapshot.head !== current.head) {
            current.head = snapshot.head;
            current.seenAt = Date.now();
        }

        const evaluation = evaluate(snapshot, current.seenAt, Date.now(), current.timing);
        const { feedback, failures } = unseen(snapshot, current.delivered);
        const sections: string[] = [];

        if (feedback.length > 0) sections.push(`## New feedback\n\n${feedback.map(describeFeedback).join("\n\n")}`);

        if (failures.length > 0)
            sections.push(
                `## Failed checks\n\n${failures.map((check) => `- ${check.name}: ${check.url ?? "no details URL"}`).join("\n")}`,
            );

        for (const item of feedback) current.delivered.add(item.key);
        for (const check of failures) current.delivered.add(check.id);

        const done =
            evaluation.settled &&
            evaluation.ci !== "failed" &&
            snapshot.unresolvedThreads === 0 &&
            feedback.length === 0 &&
            (await localHead(current.cwd)) === snapshot.head;

        if (evaluation.settled && current.settledHead !== snapshot.head) {
            current.settledHead = snapshot.head;
            sections.push(
                done
                    ? `## Settled with nothing outstanding\n\n${describeStatus(evaluation)}. Babysitting stopped.`
                    : `## Settled\n\n${describeStatus(evaluation)}. Push any local fixes with \`pr_push\`.`,
            );
        }

        if (done) stop();

        if (sections.length > 0) deliver(`# ${label} at ${shortSha(snapshot.head)}\n\n${sections.join("\n\n")}`);

        return {
            snapshot,
            evaluation,
            hasNews: feedback.length > 0 || failures.length > 0,
        };
    };

    const schedule = (current: Session) => {
        current.timer = setTimeout(() => {
            void poll(current)
                .catch((error: unknown) => {
                    const message = error instanceof Error ? error.message : String(error);
                    sessionContext?.ui.notify(`PR babysit poll failed: ${message}`, "warning");
                })
                .finally(() => {
                    if (session === current) schedule(current);
                });
        }, POLL_MS);
    };

    pi.on("session_start", (_event, ctx) => {
        sessionContext = ctx;
    });

    pi.on("agent_settled", flush);

    pi.on("session_shutdown", () => {
        stop();
        queued.length = 0;
    });

    pi.on("tool_call", (event) => {
        if (!session || !isToolCallEventType("bash", event)) return undefined;
        if (!/\bgit\b[^;&|\n]*\bpush\b/.test(event.input.command)) return undefined;

        return {
            block: true,
            reason: "A PR babysit session is active; push with pr_push, or call pr_babysit_stop first.",
        };
    });

    pi.registerTool({
        name: "pr_babysit_start",
        label: "Start PR Babysit",
        description:
            "Watch a GitHub pull request's CI and review bots (Copilot, Codex, and any reviewer that reports a check). " +
            "New review feedback, failed checks, and the moment everything settles on the pushed head arrive as " +
            "follow-up messages. While the session is active, bash `git push` is blocked; push with `pr_push`.",
        promptSnippet: "Watch a pull request's CI and review bots",
        parameters: Type.Object({
            pr: Type.Optional(
                Type.String({
                    description: "PR number, URL, or branch. Defaults to the PR for the current branch.",
                }),
            ),
        }),
        async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
            sessionContext = ctx;

            const view = JSON.parse(
                await gh(["pr", "view", ...(params.pr ? [params.pr] : []), "--json", "number,url"], ctx.cwd),
            );
            const { number, url } = Value.Parse(Type.Object({ number: Type.Number(), url: Type.String() }), view);
            const match = /github\.com\/([^/]+)\/([^/]+)\/pull\//.exec(url);
            if (!match?.[1] || !match[2]) throw new Error(`unrecognized PR URL: ${url}`);

            stop();

            const current: Session = {
                owner: match[1],
                name: match[2],
                number,
                cwd: ctx.cwd,
                timing: loadTiming(ctx),
                head: "",
                seenAt: Date.now(),
                pushedHead: undefined,
                settledHead: undefined,
                delivered: new Set(),
                pushes: 0,
                timer: undefined,
            };

            session = current;

            const result = await poll(current);
            if (session === current) schedule(current);

            const status = result ? describeStatus(result.evaluation) : "stopped";

            return {
                content: [
                    {
                        type: "text",
                        text: `Babysitting ${url}: ${status}. Anything already on the PR arrives as a follow-up message.`,
                    },
                ],
                details: { url },
            };
        },
    });

    pi.registerTool({
        name: "pr_babysit_stop",
        label: "Stop PR Babysit",
        description: "Stop watching the pull request and unblock bash `git push`.",
        parameters: Type.Object({}),
        async execute() {
            const active = session !== undefined;
            stop();

            return {
                content: [
                    {
                        type: "text",
                        text: active ? "Babysitting stopped." : "No PR babysit session was active.",
                    },
                ],
                details: {},
            };
        },
    });

    pi.registerTool({
        name: "pr_push",
        label: "Push Settled PR",
        description:
            "Push local commits to the babysat PR, but only once CI and every review bot working on the pushed head " +
            "have settled and no undelivered feedback is waiting. Refuses otherwise, with the current status. " +
            "Runs a plain `git push`; it never force-pushes.",
        parameters: Type.Object({}),
        async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
            sessionContext = ctx;

            const current = session;

            if (!current) throw new Error("No PR babysit session is active; use git push directly.");

            if (current.pushes >= MAX_PUSHES)
                throw new Error(`This session already pushed ${MAX_PUSHES} times; ask the user how to continue.`);

            const result = await poll(current);

            if (!result) throw new Error("GitHub has not reported the previous push yet, or the PR is no longer open.");

            if (!result.evaluation.settled) throw new Error(`Not settled: ${describeStatus(result.evaluation)}.`);

            if (result.hasNews)
                throw new Error(
                    "New feedback or failures just arrived and will be delivered when this turn ends; handle them first.",
                );

            const head = await localHead(current.cwd);
            if (head === result.snapshot.head) throw new Error("Nothing to push: the PR head matches HEAD.");

            const push = await pi.exec("git", ["push"], { cwd: current.cwd });
            if (push.code !== 0) throw new Error(`git push failed: ${push.stderr.trim()}`);

            current.pushes += 1;
            current.pushedHead = head;
            current.head = head;
            current.seenAt = Date.now();

            return {
                content: [
                    {
                        type: "text",
                        text: `Pushed ${shortSha(head)} (push ${current.pushes} of ${MAX_PUSHES}). Reviewers and CI now start over on the new head.`,
                    },
                ],
                details: { head },
            };
        },
    });
}
