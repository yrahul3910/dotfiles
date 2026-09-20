import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { SessionMessageEntry } from "@earendil-works/pi-coding-agent";
import { getHistoryScope, getPrompts } from "./history.ts";

describe("prompt history settings", () => {
    test("defaults to project and allows global or session scope", () => {
        assert.equal(getHistoryScope({}, {}), "project");
        assert.equal(
            getHistoryScope(
                { promptHistoryScope: "global", theme: "dark" },
                {},
            ),
            "global",
        );
        assert.equal(
            getHistoryScope({ promptHistoryScope: "session" }, {}),
            "session",
        );
    });

    test("project settings override global settings", () => {
        assert.equal(
            getHistoryScope(
                { promptHistoryScope: "global" },
                { promptHistoryScope: "project" },
            ),
            "project",
        );
    });

    test("rejects invalid scopes", () => {
        assert.throws(() =>
            getHistoryScope({ promptHistoryScope: "typo" }, {}),
        );
    });
});

test("extracts only nonempty user text, preserving multiline prompts", () => {
    const message = {
        type: "message",
        id: "user",
        parentId: null,
        timestamp: "2026-01-01T00:00:00Z",
        message: { role: "user", content: " first\nsecond ", timestamp: 0 },
    } satisfies SessionMessageEntry;
    assert.deepEqual(
        getPrompts([
            message,
            {
                ...message,
                message: {
                    role: "user",
                    content: [{ type: "text", text: "blocks" }],
                    timestamp: 1,
                },
            },
            {
                ...message,
                message: { role: "user", content: "  ", timestamp: 2 },
            },
            {
                ...message,
                message: {
                    role: "bashExecution",
                    command: "ls",
                    output: "ignored",
                    exitCode: 0,
                    cancelled: false,
                    truncated: false,
                    timestamp: 3,
                },
            },
        ]),
        ["first\nsecond", "blocks"],
    );
});
