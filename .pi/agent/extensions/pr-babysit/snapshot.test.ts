import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluate, parseSnapshot, unseen, type Timing } from "./snapshot.ts";

const HEAD = "a".repeat(40);
const OLD = "b".repeat(40);
const SEEN_AT = Date.parse("2026-10-07T12:00:00Z");
const MINUTE = 60_000;

const TIMING: Timing = {
    graceMs: MINUTE,
    timeoutMs: { copilot: 15 * MINUTE, codex: 20 * MINUTE },
};

const comment = (id: string, login: string, body = `comment ${id}`) => ({
    id,
    author: { login },
    body,
    updatedAt: "2026-10-07T12:00:00Z",
    url: `https://github.com/o/r/pull/1#${id}`,
});

type Fixture = {
    checks?: unknown[];
    requested?: string[];
    reviews?: { login: string; commit: string; body?: string }[];
    reactions?: { login: string; content: string; at: number }[];
    comments?: ReturnType<typeof comment>[];
    threads?: {
        id: string;
        resolved: boolean;
        comments: ReturnType<typeof comment>[];
    }[];
};

const snapshot = (fixture: Fixture = {}) =>
    parseSnapshot(
        JSON.stringify({
            data: {
                viewer: { login: "me" },
                repository: {
                    pullRequest: {
                        state: "OPEN",
                        headRefOid: HEAD,
                        commits: {
                            nodes: [
                                {
                                    commit: {
                                        statusCheckRollup: {
                                            contexts: {
                                                nodes: fixture.checks ?? [],
                                            },
                                        },
                                    },
                                },
                            ],
                        },
                        reviewRequests: {
                            nodes: (fixture.requested ?? []).map((login) => ({
                                requestedReviewer: { login },
                            })),
                        },
                        reviews: {
                            nodes: (fixture.reviews ?? []).map((review, index) => ({
                                ...comment(`review-${index}`, review.login, review.body ?? ""),
                                commit: { oid: review.commit },
                            })),
                        },
                        reactions: {
                            nodes: (fixture.reactions ?? []).map((reaction) => ({
                                content: reaction.content,
                                createdAt: new Date(reaction.at).toISOString(),
                                user: { login: reaction.login },
                            })),
                        },
                        comments: { nodes: fixture.comments ?? [] },
                        reviewThreads: {
                            nodes: (fixture.threads ?? []).map((thread) => ({
                                id: thread.id,
                                isResolved: thread.resolved,
                                path: "src/main.ts",
                                line: 3,
                                comments: { nodes: thread.comments },
                            })),
                        },
                    },
                },
            },
        }),
    );

const checkRun = (name: string, status: string, conclusion: string | null) => ({
    __typename: "CheckRun",
    id: `check-${name}`,
    name,
    status,
    conclusion,
    detailsUrl: null,
});

const PASSED = checkRun("build", "COMPLETED", "SUCCESS");
const CODEX = "chatgpt-codex-connector[bot]";

test("evaluates settled state for each reviewer signal", () => {
    const cases: {
        name: string;
        fixture: Fixture;
        elapsed: number;
        ci: string;
        copilot: string;
        codex: string;
        settled: boolean;
    }[] = [
        {
            name: "nothing has registered yet within the grace period",
            fixture: {},
            elapsed: 30_000,
            ci: "pending",
            copilot: "pending",
            codex: "pending",
            settled: false,
        },
        {
            name: "silence after the grace period means nothing runs for this push",
            fixture: {},
            elapsed: 2 * MINUTE,
            ci: "none",
            copilot: "not-reviewing",
            codex: "not-reviewing",
            settled: true,
        },
        {
            name: "a requested Copilot review stays pending even with a review on the head",
            fixture: {
                checks: [PASSED],
                requested: ["Copilot"],
                reviews: [{ login: "copilot-pull-request-reviewer", commit: HEAD }],
            },
            elapsed: 5 * MINUTE,
            ci: "passed",
            copilot: "pending",
            codex: "not-reviewing",
            settled: false,
        },
        {
            name: "Copilot is done once it reviewed the head and left the requests",
            fixture: {
                checks: [PASSED],
                reviews: [{ login: "copilot-pull-request-reviewer", commit: HEAD }],
            },
            elapsed: 5 * MINUTE,
            ci: "passed",
            copilot: "done",
            codex: "not-reviewing",
            settled: true,
        },
        {
            name: "a Codex thumbs-up from before the push does not end its review",
            fixture: {
                checks: [PASSED],
                reactions: [
                    {
                        login: CODEX,
                        content: "THUMBS_UP",
                        at: SEEN_AT - MINUTE,
                    },
                    { login: CODEX, content: "EYES", at: SEEN_AT + 10_000 },
                ],
            },
            elapsed: 5 * MINUTE,
            ci: "passed",
            copilot: "not-reviewing",
            codex: "pending",
            settled: false,
        },
        {
            name: "a Codex thumbs-up after the push ends its review",
            fixture: {
                checks: [PASSED],
                reactions: [
                    { login: CODEX, content: "EYES", at: SEEN_AT + 10_000 },
                    {
                        login: CODEX,
                        content: "THUMBS_UP",
                        at: SEEN_AT + 3 * MINUTE,
                    },
                ],
            },
            elapsed: 5 * MINUTE,
            ci: "passed",
            copilot: "not-reviewing",
            codex: "done",
            settled: true,
        },
        {
            name: "a Codex review of an older commit does not count for the head",
            fixture: {
                checks: [PASSED],
                reviews: [{ login: "chatgpt-codex-connector", commit: OLD }],
                reactions: [{ login: CODEX, content: "EYES", at: SEEN_AT }],
            },
            elapsed: 5 * MINUTE,
            ci: "passed",
            copilot: "not-reviewing",
            codex: "pending",
            settled: false,
        },
        {
            name: "a stuck Codex review times out",
            fixture: {
                checks: [PASSED],
                reactions: [{ login: CODEX, content: "EYES", at: SEEN_AT }],
            },
            elapsed: 21 * MINUTE,
            ci: "passed",
            copilot: "not-reviewing",
            codex: "timed-out",
            settled: true,
        },
        {
            name: "failed CI does not settle while a bot is still reviewing",
            fixture: {
                checks: [checkRun("test", "COMPLETED", "FAILURE"), PASSED],
                requested: ["Copilot"],
            },
            elapsed: 5 * MINUTE,
            ci: "failed",
            copilot: "pending",
            codex: "not-reviewing",
            settled: false,
        },
        {
            name: "a running check keeps CI pending",
            fixture: {
                checks: [checkRun("Greptile Review", "IN_PROGRESS", null), PASSED],
            },
            elapsed: 5 * MINUTE,
            ci: "pending",
            copilot: "not-reviewing",
            codex: "not-reviewing",
            settled: false,
        },
    ];

    for (const item of cases) {
        const result = evaluate(snapshot(item.fixture), SEEN_AT, SEEN_AT + item.elapsed, TIMING);

        assert.deepEqual(
            {
                ci: result.ci,
                copilot: result.bots.copilot,
                codex: result.bots.codex,
                settled: result.settled,
            },
            {
                ci: item.ci,
                copilot: item.copilot,
                codex: item.codex,
                settled: item.settled,
            },
            item.name,
        );
    }
});

test("delivers other people's open feedback and failures once", () => {
    const current = snapshot({
        checks: [checkRun("test", "COMPLETED", "FAILURE"), PASSED],
        reviews: [
            { login: "greptile-apps", commit: HEAD, body: "Summary" },
            { login: "claude", commit: HEAD },
        ],
        comments: [comment("c1", "claude"), comment("c2", "me")],
        threads: [
            {
                id: "open",
                resolved: false,
                comments: [comment("t1", "chatgpt-codex-connector"), comment("t2", "me")],
            },
            {
                id: "closed",
                resolved: true,
                comments: [comment("t3", "claude")],
            },
        ],
    });

    const first = unseen(current, new Set());

    assert.deepEqual(
        first.feedback.map((item) => [item.author, item.thread?.id]),
        [
            ["claude", undefined],
            ["greptile-apps", undefined],
            ["chatgpt-codex-connector", "open"],
        ],
    );
    assert.deepEqual(
        first.failures.map((check) => check.name),
        ["test"],
    );
    assert.equal(current.unresolvedThreads, 1);

    const delivered = new Set([...first.feedback.map((item) => item.key), ...first.failures.map((check) => check.id)]);

    assert.deepEqual(unseen(current, delivered), {
        feedback: [],
        failures: [],
    });
});
