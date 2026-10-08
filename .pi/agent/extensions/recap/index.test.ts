import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { test } from "node:test";
import { fauxAssistantMessage, fauxProvider, type Context } from "@earendil-works/pi-ai";
import {
    createAgentSession,
    DefaultResourceLoader,
    ModelRuntime,
    SessionManager,
    SettingsManager,
} from "@earendil-works/pi-coding-agent";
import recap, { getRecapIdleMinutes } from "./index.ts";

const RECAP = "- **Working on:** recap tests";

test("idle recaps default to off, and project settings override global ones", () => {
    assert.equal(getRecapIdleMinutes({}, {}), 0);
    assert.equal(getRecapIdleMinutes({ recapIdleMinutes: 5, theme: "dark" }, {}), 5);
    assert.equal(getRecapIdleMinutes({ recapIdleMinutes: 5 }, { recapIdleMinutes: 0 }), 0);
    assert.throws(() => getRecapIdleMinutes({ recapIdleMinutes: -1 }, {}));
});

test("recaps once per idle stretch and on /recap, without adding to the model context", async () => {
    const directory = await mkdtemp(join(tmpdir(), "pi-recap-"));
    const previousAgentDir = process.env.PI_CODING_AGENT_DIR;
    process.env.PI_CODING_AGENT_DIR = directory;
    await writeFile(join(directory, "settings.json"), JSON.stringify({ recapIdleMinutes: 0.001 }));

    const faux = fauxProvider();
    const recapRequests: Context[] = [];

    const answerRecap = (context: Context) => {
        recapRequests.push(context);
        return fauxAssistantMessage(RECAP);
    };

    faux.setResponses([
        fauxAssistantMessage("one"),
        fauxAssistantMessage("two"),
        fauxAssistantMessage("three"),
        answerRecap,
        answerRecap,
    ]);

    const modelRuntime = await ModelRuntime.create({
        authPath: join(directory, "auth.json"),
        modelsPath: null,
        allowModelNetwork: false,
    });
    modelRuntime.registerNativeProvider(faux.provider);

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
        extensionFactories: [recap],
    });
    await resourceLoader.reload();

    const { session } = await createAgentSession({
        cwd: directory,
        agentDir: directory,
        settingsManager,
        resourceLoader,
        modelRuntime,
        sessionManager: SessionManager.inMemory(directory),
        model: faux.getModel(),
    });
    await session.bindExtensions({
        uiContext: { ...session.extensionRunner.getUIContext() },
        mode: "tui",
    });

    const recaps = () =>
        session.sessionManager
            .getEntries()
            .flatMap((entry) => (entry.type === "custom" && entry.customType === "recap" ? [entry.data] : []));

    try {
        for (const prompt of ["first task", "second task", "third task"]) await session.prompt(prompt);

        // The threshold is 60 ms; wait several of them to show later timeouts add nothing.
        await sleep(500);
        assert.deepEqual(recaps(), [{ text: RECAP }]);
        assert.match(JSON.stringify(recapRequests[0]?.messages), /third task/);
        assert.equal(recapRequests[0]?.tools, undefined);

        await session.prompt("/recap");
        assert.equal(recaps().length, 2);
        assert.doesNotMatch(JSON.stringify(session.messages), /recap tests/);
    } finally {
        session.dispose();
        await rm(directory, { recursive: true, force: true });

        if (previousAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
        else process.env.PI_CODING_AGENT_DIR = previousAgentDir;
    }
});
