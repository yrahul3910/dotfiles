import assert from "node:assert/strict";
import { mkdir, mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { getModel } from "@earendil-works/pi-ai/compat";
import {
    createAgentSession,
    DefaultResourceLoader,
    SessionManager,
    SettingsManager,
} from "@earendil-works/pi-coding-agent";
import fish from "./index.ts";

async function createFishSession(directory: string) {
    const settingsManager = SettingsManager.inMemory({
        packages: [],
        retry: { enabled: false },
    });
    const resourceLoader = new DefaultResourceLoader({
        cwd: directory,
        agentDir: directory,
        settingsManager,
        noExtensions: true,
        noSkills: true,
        noThemes: true,
        noPromptTemplates: true,
        noContextFiles: true,
        extensionFactories: [fish],
    });
    await resourceLoader.reload();
    const { session } = await createAgentSession({
        cwd: directory,
        agentDir: directory,
        settingsManager,
        resourceLoader,
        sessionManager: SessionManager.inMemory(directory),
        model: getModel("anthropic", "claude-sonnet-4-5"),
    });
    return session;
}

test("headless worktree lifecycle never changes the interactive parent's process cwd", async () => {
    const directory = await mkdtemp(join(tmpdir(), "pi-cwd-check-"));
    const previousCwd = process.cwd();
    const childDirectory = join(directory, "worktree");
    await mkdir(childDirectory);
    const parent = await createFishSession(directory);
    try {
        await parent.bindExtensions({
            uiContext: { ...parent.extensionRunner.getUIContext() },
        });
        assert.equal(process.cwd(), await realpath(directory));
        const child = await createFishSession(childDirectory);
        try {
            await child.bindExtensions({});
            assert.equal(process.cwd(), await realpath(directory));
            await child.extensionRunner.emitBeforeAgentStart(
                "fixture",
                undefined,
                "fixture",
                { cwd: childDirectory },
            );
            assert.equal(process.cwd(), await realpath(directory));
        } finally {
            child.dispose();
        }
        await rm(childDirectory, { recursive: true, force: true });
        assert.equal(process.cwd(), await realpath(directory));
    } finally {
        parent.dispose();
        process.chdir(previousCwd);
        await rm(directory, { recursive: true, force: true });
    }
});

test(
    "Pi user-shell execution receives stdout, stderr, and output larger than a pipe buffer",
    { timeout: 10000 },
    async () => {
        const directory = await mkdtemp(join(tmpdir(), "pi-fish-check-"));
        const previousCwd = process.cwd();
        try {
            const session = await createFishSession(directory);
            try {
                await session.bindExtensions({});
                const chunks: string[] = [];
                const command =
                    "pwd -P; printf stdout-marker; printf stderr-marker >&2; string repeat -n 100000 x";
                const intercepted = await session.extensionRunner.emitUserBash({
                    type: "user_bash",
                    command,
                    cwd: directory,
                    excludeFromContext: true,
                });
                assert.ok(intercepted?.operations);
                const result = await session.executeBash(
                    command,
                    (chunk) => chunks.push(chunk),
                    { operations: intercepted.operations },
                );
                assert.equal(result.exitCode, 0);
                const output = chunks.join("");
                assert.ok(output.includes(await realpath(directory)));
                assert.ok(output.includes("stdout-marker"));
                assert.ok(output.includes("stderr-marker"));
                // stderr can arrive between stdout chunks without losing output.
                assert.ok(
                    output
                        .replaceAll("stderr-marker", "")
                        .includes("x".repeat(100000)),
                );
            } finally {
                session.dispose();
            }
        } finally {
            process.chdir(previousCwd);
            await rm(directory, { recursive: true, force: true });
        }
    },
);
