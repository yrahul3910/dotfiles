import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
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
