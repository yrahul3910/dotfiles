import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
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
import effort from "./index.ts";

async function openSession(
    directory: string,
    manager: SessionManager,
    options: { thinkingLevel?: "low" | "high"; interactive?: boolean } = {},
) {
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
        extensionFactories: [effort],
    });
    await resourceLoader.reload();
    const { session } = await createAgentSession({
        cwd: directory,
        agentDir: directory,
        settingsManager,
        resourceLoader,
        sessionManager: manager,
        model: getModel("anthropic", "claude-sonnet-4-5"),
        thinkingLevel: options.thinkingLevel ?? "low",
    });

    if (options.interactive) {
        await session.bindExtensions({
            uiContext: { ...session.extensionRunner.getUIContext() },
            mode: "tui",
        });
    } else {
        await session.bindExtensions({});
    }

    return session;
}

for (const interactive of [false, true]) {
    const description = interactive
        ? "UI sessions reset to low"
        : "headless sessions preserve requested high";

    test(`${description} at startup and before successive turns`, async () => {
        const directory = await mkdtemp(join(tmpdir(), "pi-effort-routing-"));
        const manager = SessionManager.inMemory(directory);

        try {
            const session = await openSession(directory, manager, {
                thinkingLevel: "high",
                interactive,
            });

            try {
                const expected = interactive ? "low" : "high";
                assert.equal(session.thinkingLevel, expected);

                for (const prompt of ["First task", "Follow-up task"]) {
                    session.setThinkingLevel("high");
                    await session.extensionRunner.emitBeforeAgentStart(
                        prompt,
                        undefined,
                        "",
                        { cwd: directory },
                    );
                    assert.equal(session.thinkingLevel, expected);
                }

                await session.prompt("/effort high");
                await session.extensionRunner.emitBeforeAgentStart(
                    "Pinned task",
                    undefined,
                    "",
                    { cwd: directory },
                );
                assert.equal(session.thinkingLevel, "high");
            } finally {
                session.dispose();
            }
        } finally {
            await rm(directory, { recursive: true, force: true });
        }
    });
}

test("effort commands survive session reconstruction and auto releases the pin", async () => {
    const directory = await mkdtemp(join(tmpdir(), "pi-effort-check-"));
    const manager = SessionManager.inMemory(directory);
    try {
        const first = await openSession(directory, manager);
        try {
            await first.prompt("/effort high");
            assert.equal(first.thinkingLevel, "high");
        } finally {
            first.dispose();
        }
        const resumed = await openSession(directory, manager);
        try {
            assert.equal(resumed.thinkingLevel, "high");
            await resumed.prompt("/effort auto");
            assert.equal(resumed.thinkingLevel, "low");
        } finally {
            resumed.dispose();
        }
        const released = await openSession(directory, manager);
        try {
            assert.equal(released.thinkingLevel, "low");
        } finally {
            released.dispose();
        }
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});
