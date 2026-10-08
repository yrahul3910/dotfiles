/**
 * Pure PR-state logic for the babysitter: parse one GraphQL snapshot of a pull request, decide whether CI and the
 * review bots have settled on its head commit, and pick out feedback and failures the agent has not seen yet.
 */

import { Type, type Static, type TSchema } from "typebox";
import { Value } from "typebox/value";

export const SNAPSHOT_QUERY = `query($owner: String!, $name: String!, $number: Int!) {
  viewer { login }
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      state
      headRefOid
      commits(last: 1) { nodes { commit { statusCheckRollup { contexts(first: 100) { nodes {
        __typename
        ... on CheckRun { id name status conclusion detailsUrl }
        ... on StatusContext { id context state targetUrl }
      } } } } } }
      reviewRequests(first: 20) { nodes { requestedReviewer { ... on Bot { login } ... on User { login } } } }
      reviews(last: 100) { nodes { id author { login } body commit { oid } updatedAt url } }
      reactions(last: 100) { nodes { content createdAt user { login } } }
      comments(last: 100) { nodes { id author { login } body updatedAt url } }
      reviewThreads(last: 100) { nodes {
        id isResolved path line
        comments(last: 20) { nodes { id author { login } body updatedAt url } }
      } }
    }
  }
}`;

const Author = Type.Union([Type.Object({ login: Type.String() }), Type.Null()]);
const NullableString = Type.Union([Type.String(), Type.Null()]);

const CommentNode = Type.Object({
    id: Type.String(),
    author: Author,
    body: Type.String(),
    updatedAt: Type.String(),
    url: Type.String(),
});

const CheckNode = Type.Union([
    Type.Object({
        __typename: Type.Literal("CheckRun"),
        id: Type.String(),
        name: Type.String(),
        status: Type.String(),
        conclusion: NullableString,
        detailsUrl: NullableString,
    }),
    Type.Object({
        __typename: Type.Literal("StatusContext"),
        id: Type.String(),
        context: Type.String(),
        state: Type.String(),
        targetUrl: NullableString,
    }),
]);

const Nodes = <T extends TSchema>(item: T) => Type.Object({ nodes: Type.Array(item) });

const SnapshotResponse = Type.Object({
    data: Type.Object({
        viewer: Type.Object({ login: Type.String() }),
        repository: Type.Object({
            pullRequest: Type.Object({
                state: Type.String(),
                headRefOid: Type.String(),
                commits: Nodes(
                    Type.Object({
                        commit: Type.Object({
                            statusCheckRollup: Type.Union([Type.Object({ contexts: Nodes(CheckNode) }), Type.Null()]),
                        }),
                    }),
                ),
                reviewRequests: Nodes(
                    Type.Object({
                        requestedReviewer: Type.Union([
                            Type.Object({
                                login: Type.Optional(Type.String()),
                            }),
                            Type.Null(),
                        ]),
                    }),
                ),
                reviews: Nodes(
                    Type.Object({
                        id: Type.String(),
                        author: Author,
                        body: Type.String(),
                        commit: Type.Union([Type.Object({ oid: Type.String() }), Type.Null()]),
                        updatedAt: Type.String(),
                        url: Type.String(),
                    }),
                ),
                reactions: Nodes(
                    Type.Object({
                        content: Type.String(),
                        createdAt: Type.String(),
                        user: Author,
                    }),
                ),
                comments: Nodes(CommentNode),
                reviewThreads: Nodes(
                    Type.Object({
                        id: Type.String(),
                        isResolved: Type.Boolean(),
                        path: Type.String(),
                        line: Type.Union([Type.Number(), Type.Null()]),
                        comments: Nodes(CommentNode),
                    }),
                ),
            }),
        }),
    }),
});

type CommentData = Static<typeof CommentNode>;

export type Check = {
    id: string;
    name: string;
    state: "pending" | "passed" | "failed";
    url: string | undefined;
};

/** One piece of reviewer feedback; `key` changes when the comment is edited, so edits are delivered again. */
export type Feedback = {
    key: string;
    author: string;
    body: string;
    url: string;
    thread?: { id: string; path: string; line: number | null };
};

export type Snapshot = {
    viewer: string;
    state: string;
    head: string;
    checks: Check[];
    requestedReviewers: string[];
    reviews: { author: string; commit: string | undefined }[];
    reactions: { author: string; content: string; createdAt: number }[];
    feedback: Feedback[];
    unresolvedThreads: number;
};

const FAILED_CONCLUSIONS = new Set([
    "ACTION_REQUIRED",
    "CANCELLED",
    "FAILURE",
    "STALE",
    "STARTUP_FAILURE",
    "TIMED_OUT",
]);

// GraphQL reports bot review authors as `name` but reaction users as `name[bot]`.
const normalizeLogin = (login: string) => login.replace(/\[bot\]$/, "");

const loginOf = (author: { login: string } | null) => (author ? normalizeLogin(author.login) : "ghost");

const STATUS_CONTEXT_STATES = new Map<string, Check["state"]>([
    ["EXPECTED", "pending"],
    ["PENDING", "pending"],
    ["SUCCESS", "passed"],
]);

function checkOf(node: Static<typeof CheckNode>): Check {
    // oxlint-disable-next-line eslint/no-underscore-dangle -- `__typename` is GitHub's GraphQL union discriminator.
    if (node.__typename === "StatusContext")
        return {
            id: node.id,
            name: node.context,
            state: STATUS_CONTEXT_STATES.get(node.state) ?? "failed",
            url: node.targetUrl ?? undefined,
        };

    const failed = FAILED_CONCLUSIONS.has(node.conclusion ?? "");

    return {
        id: node.id,
        name: node.name,
        state: node.status !== "COMPLETED" ? "pending" : failed ? "failed" : "passed",
        url: node.detailsUrl ?? undefined,
    };
}

const feedbackOf = (comment: CommentData, thread?: Feedback["thread"]): Feedback => ({
    key: `${comment.id}@${comment.updatedAt}`,
    author: loginOf(comment.author),
    body: comment.body,
    url: comment.url,
    thread,
});

/**
 * Parse the JSON printed by `gh api graphql` for `SNAPSHOT_QUERY`.
 *
 * Feedback covers top-level PR comments, non-empty review bodies, and comments in unresolved review threads, all
 * excluding the authenticated user's own comments so the agent's replies never come back to it. Throws when the
 * response does not match the query's shape, which includes GraphQL error responses.
 */
export function parseSnapshot(json: string): Snapshot {
    const { viewer, repository } = Value.Parse(SnapshotResponse, JSON.parse(json)).data;
    const pr = repository.pullRequest;
    const self = normalizeLogin(viewer.login);
    const threads = pr.reviewThreads.nodes.filter((thread) => !thread.isResolved);

    const feedback = [
        ...pr.comments.nodes.map((comment) => feedbackOf(comment)),
        ...pr.reviews.nodes.filter((review) => review.body.trim() !== "").map((review) => feedbackOf(review)),
        ...threads.flatMap((thread) =>
            thread.comments.nodes.map((comment) =>
                feedbackOf(comment, {
                    id: thread.id,
                    path: thread.path,
                    line: thread.line,
                }),
            ),
        ),
    ].filter((item) => item.author !== self);

    return {
        viewer: self,
        state: pr.state,
        head: pr.headRefOid,
        checks: (pr.commits.nodes[0]?.commit.statusCheckRollup?.contexts.nodes ?? []).map(checkOf),
        requestedReviewers: pr.reviewRequests.nodes.flatMap((request) =>
            request.requestedReviewer?.login ? [normalizeLogin(request.requestedReviewer.login)] : [],
        ),
        reviews: pr.reviews.nodes.map((review) => ({
            author: loginOf(review.author),
            commit: review.commit?.oid,
        })),
        reactions: pr.reactions.nodes.map((reaction) => ({
            author: loginOf(reaction.user),
            content: reaction.content,
            createdAt: Date.parse(reaction.createdAt),
        })),
        feedback,
        unresolvedThreads: threads.length,
    };
}

export const BOTS = ["copilot", "codex"] as const;
export type Bot = (typeof BOTS)[number];

const isBot: Record<Bot, (login: string) => boolean> = {
    copilot: (login) => login.toLowerCase().startsWith("copilot"),
    codex: (login) => login === "chatgpt-codex-connector",
};

export type Timing = {
    /** How long a bot or CI may stay silent after a push before it is treated as not running for that push. */
    graceMs: number;
    /** How long a bot may stay pending after a push before the babysitter stops waiting for it. */
    timeoutMs: Record<Bot, number>;
};

export type BotStatus = "pending" | "done" | "not-reviewing" | "timed-out";

export type Evaluation = {
    ci: "pending" | "passed" | "failed" | "none";
    bots: Record<Bot, BotStatus>;
    settled: boolean;
};

/**
 * Decide whether `snapshot.head` has settled at `now`, given that the babysitter first saw that head at `seenAt`.
 *
 * Copilot is pending while it is a requested reviewer and done once it has reviewed the head. Codex is pending while
 * its eyes reaction is on the PR and done once it has reviewed the head or added a thumbs-up since `seenAt`. A bot
 * with neither signal after `timing.graceMs` is not reviewing this push, and a pending bot gives up after its timeout.
 * CI with no checks after the grace period counts as `none`. The PR is settled when CI is not pending and no bot is.
 */
export function evaluate(snapshot: Snapshot, seenAt: number, now: number, timing: Timing): Evaluation {
    const elapsedMs = now - seenAt;
    const graceOver = elapsedMs > timing.graceMs;

    const signals: Record<Bot, { started: boolean; done: boolean }> = {
        copilot: {
            started: snapshot.requestedReviewers.some(isBot.copilot),
            done: snapshot.reviews.some((review) => isBot.copilot(review.author) && review.commit === snapshot.head),
        },
        codex: {
            started: snapshot.reactions.some((reaction) => isBot.codex(reaction.author) && reaction.content === "EYES"),
            done:
                snapshot.reviews.some((review) => isBot.codex(review.author) && review.commit === snapshot.head) ||
                snapshot.reactions.some(
                    (reaction) =>
                        isBot.codex(reaction.author) &&
                        reaction.content === "THUMBS_UP" &&
                        reaction.createdAt >= seenAt,
                ),
        },
    };

    // A re-requested Copilot review is pending even if an earlier review already covers the head.
    const botStatus = (bot: Bot): BotStatus => {
        const { started, done } = signals[bot];
        const pending = bot === "copilot" ? started : started && !done;

        if (pending) return elapsedMs > timing.timeoutMs[bot] ? "timed-out" : "pending";
        if (done) return "done";

        return graceOver ? "not-reviewing" : "pending";
    };

    const ciStatus = (): Evaluation["ci"] => {
        const states = new Set(snapshot.checks.map((check) => check.state));

        if (states.size === 0) return graceOver ? "none" : "pending";
        if (states.has("pending")) return "pending";

        return states.has("failed") ? "failed" : "passed";
    };

    const ci = ciStatus();
    const bots = { copilot: botStatus("copilot"), codex: botStatus("codex") };

    return {
        ci,
        bots,
        settled: ci !== "pending" && BOTS.every((bot) => bots[bot] !== "pending"),
    };
}

/** Return the feedback and failed checks in `snapshot` whose keys are not in `delivered`. */
export function unseen(snapshot: Snapshot, delivered: ReadonlySet<string>) {
    return {
        feedback: snapshot.feedback.filter((item) => !delivered.has(item.key)),
        failures: snapshot.checks.filter((check) => check.state === "failed" && !delivered.has(check.id)),
    };
}
