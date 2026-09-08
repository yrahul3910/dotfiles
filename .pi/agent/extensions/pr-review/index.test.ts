import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
    installWorkflow,
    WORKFLOW_CONTENT,
    WORKFLOW_RELATIVE_PATH,
} from "./index.ts";

test("creates the workflow", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "pi-review-create-"));

    const result = await installWorkflow(repoRoot, async () => false);

    assert.equal(result.kind, "created");
    assert.equal(
        await readFile(join(repoRoot, WORKFLOW_RELATIVE_PATH), "utf8"),
        WORKFLOW_CONTENT,
    );
});

test("leaves the current workflow unchanged", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "pi-review-current-"));
    await installWorkflow(repoRoot, async () => false);

    let confirmationRequested = false;
    const result = await installWorkflow(repoRoot, async () => {
        confirmationRequested = true;
        return true;
    });

    assert.equal(result.kind, "unchanged");
    assert.equal(confirmationRequested, false);
});

test("does not replace a changed workflow without confirmation", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "pi-review-cancel-"));
    const workflowPath = join(repoRoot, WORKFLOW_RELATIVE_PATH);
    await installWorkflow(repoRoot, async () => false);
    await writeFile(workflowPath, "custom workflow\n", "utf8");

    const result = await installWorkflow(repoRoot, async () => false);

    assert.equal(result.kind, "cancelled");
    assert.equal(await readFile(workflowPath, "utf8"), "custom workflow\n");
});

test("replaces a changed workflow after confirmation", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "pi-review-replace-"));
    const workflowPath = join(repoRoot, WORKFLOW_RELATIVE_PATH);
    await installWorkflow(repoRoot, async () => false);
    await writeFile(workflowPath, "custom workflow\n", "utf8");

    const result = await installWorkflow(repoRoot, async () => true);

    assert.equal(result.kind, "replaced");
    assert.equal(await readFile(workflowPath, "utf8"), WORKFLOW_CONTENT);
});

const reviewScript = WORKFLOW_CONTENT.match(
    /      - name: Review pull request\n[\s\S]*?        run: \|\n([\s\S]*?)\n      - name: Publish review\n/,
)?.[1]?.replace(/^          /gm, "");
assert.ok(reviewScript, "The workflow must contain a review shell step");

const reviewHarness = String.raw`
git() {
    printf '%s\n' 'diff --git a/example.txt b/example.txt'
}
pi() {
    printf '%s\n' "$@" > "$RUNNER_TEMP/pi-arguments.txt"
    cat > "$RUNNER_TEMP/pi-input.diff"
    printf '%s\n' 'No substantive findings.'
}
`;

test("runs a read-only OpenRouter Nitro review with the shared skills", async (t) => {
    const directory = await mkdtemp(join(tmpdir(), "pi-review-command-"));
    t.after(() => rm(directory, { recursive: true, force: true }));

    const result = spawnSync(
        "bash",
        ["-eu", "-o", "pipefail", "-c", reviewHarness + reviewScript],
        {
            encoding: "utf8",
            env: {
                ...process.env,
                RUNNER_TEMP: directory,
                BASE_SHA: "base",
                HEAD_SHA: "head",
                OPENROUTER_API_KEY: "test-placeholder",
            },
        },
    );

    assert.equal(result.status, 0, result.stderr);
    const args = (await readFile(join(directory, "pi-arguments.txt"), "utf8"))
        .trim()
        .split("\n");
    assert.deepEqual(args.slice(0, -1), [
        "--provider",
        "openrouter",
        "--model",
        "z-ai/glm-5.3:nitro",
        "--thinking",
        "high",
        "--print",
        "--no-session",
        "--no-extensions",
        "--no-approve",
        "--skill",
        join(directory, "pi-review-home/.agents/skills"),
        "--tools",
        "read,grep,find,ls",
    ]);
    assert.match(args.at(-1) ?? "", /Review this pull request/);
    assert.match(
        await readFile(join(directory, "pi-input.diff"), "utf8"),
        /diff --git/,
    );
    assert.equal(
        await readFile(join(directory, "pi-review.md"), "utf8"),
        "No substantive findings.\n",
    );
    assert.ok(
        WORKFLOW_CONTENT.includes(
            "OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}",
        ),
    );
    assert.ok(
        WORKFLOW_CONTENT.includes(
            "sudo apt-get install --yes stow ripgrep fd-find",
        ),
    );
    assert.ok(
        WORKFLOW_CONTENT.includes(
            "PI_CODING_AGENT_DIR: ${{ runner.temp }}/pi-review-home/.pi/agent",
        ),
    );
    assert.doesNotMatch(WORKFLOW_CONTENT, /MODAL_API_KEY|\r/);
    assert.match(WORKFLOW_CONTENT, /--model z-ai\/glm-5\.3:nitro \\\n/);
});

test("rejects a missing OpenRouter secret before invoking Pi", async (t) => {
    const directory = await mkdtemp(join(tmpdir(), "pi-review-secret-"));
    t.after(() => rm(directory, { recursive: true, force: true }));

    const result = spawnSync(
        "bash",
        ["-eu", "-o", "pipefail", "-c", reviewHarness + reviewScript],
        {
            encoding: "utf8",
            env: {
                ...process.env,
                RUNNER_TEMP: directory,
                OPENROUTER_API_KEY: "",
            },
        },
    );

    assert.equal(result.status, 1);
    assert.match(
        result.stderr,
        /OPENROUTER_API_KEY repository secret is not configured/,
    );
    assert.equal(existsSync(join(directory, "pi-arguments.txt")), false);
});
