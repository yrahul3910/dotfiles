---
name: pr-babysit
description: Watch a GitHub pull request through CI and bot reviews (Copilot, Codex, Claude, Greptile), fix feedback locally as it arrives, and push only once everything has settled. Use when asked to babysit, shepherd, or watch a PR until it is green and reviewed. Not for a one-off look at PR comments or CI status.
---

# PR babysit

The `pr-babysit` extension polls the PR and sends you follow-up messages. You fix things locally between messages and push only through `pr_push`.

## Start

Call `pr_babysit_start` with the PR number, URL, or branch; omit it for the current branch's PR. Feedback already on the PR arrives as the first message. Then end your turn and wait; do not poll GitHub yourself.

## React to each message

A message can hold any of these sections:

- **New feedback**: comments from reviewers, each with author, location, URL, and, for inline comments, a review thread ID. For each one, decide:
  - A clear bug or a concrete, local request: fix it, commit locally, and note the thread ID with a one-line reply describing the fix.
  - Escalate to the user instead of fixing when the comment asks for a design change, contradicts another reviewer, or would touch files outside the PR's diff. Say which thread and why, then keep going with the rest.
  - Wrong, already handled, or noise (progress edits, coverage bots, summaries with no request): note a short reply for threads that need an answer; otherwise skip it.
- **Failed checks**: read the log (`gh run view --log-failed`, or the check's URL), fix the cause, and commit locally.
- **Settled**: CI and every bot working on the pushed head are done. If you have local commits, call `pr_push`, then post your noted replies and resolve the threads you fixed (commands below). If you have nothing to push and only escalated threads remain, call `pr_babysit_stop` and summarize.
- **Settled with nothing outstanding**, or **merged/closed**: the session has ended. Summarize what you fixed, what you escalated, and what you skipped.

Commit fixes as they come; never push with bash. `git push` is blocked while a session is active, and `pr_push` refuses until the PR has settled, explaining what is still pending. Do not @-mention or re-request review bots; their own configuration decides whether they review a push.

Reply and resolve only after `pr_push`, so reviewers see the fix when they read the reply.

## Reply to and resolve a thread

```sh
gh api graphql -f query='mutation($id: ID!, $body: String!) { addPullRequestReviewThreadReply(input: {pullRequestReviewThreadId: $id, body: $body}) { comment { url } } }' -f id=THREAD_ID -f body='Fixed in abc1234: ...'
gh api graphql -f query='mutation($id: ID!) { resolveReviewThread(input: {threadId: $id}) { thread { isResolved } } }' -f id=THREAD_ID
```

Leave escalated and disputed threads unresolved. Answer top-level PR comments with `gh pr comment` only when they ask something.

## Finish

The session is done when it reports nothing outstanding, the PR is merged or closed, or you called `pr_babysit_stop`. Your final message lists each pushed commit, the threads you resolved, and the threads waiting on the user.
