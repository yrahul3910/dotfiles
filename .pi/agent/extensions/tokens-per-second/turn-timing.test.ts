import assert from "node:assert/strict";
import test from "node:test";
import { TurnTiming } from "./turn-timing.ts";

test("counts overlapping tools once and excludes time waiting for input", () => {
    const timing = new TurnTiming();
    timing.start(0);
    timing.textReceived(50);
    timing.toolStarted("a", 100);
    timing.toolStarted("b", 200);
    timing.promptStarted(300);
    timing.promptStarted(350);
    timing.promptEnded(400);
    timing.promptEnded(500);
    timing.toolEnded("a", 600);
    timing.toolEnded("b", 700);
    timing.providerFailed();
    timing.finish(1000);
    assert.deepEqual(timing.snapshot(2000), {
        elapsedMs: 1000,
        firstTextMs: 50,
        toolMs: 400,
        inputMs: 200,
        providerErrors: 1,
    });
});

test("a new request does not retain the previous request's failures or text time", () => {
    const timing = new TurnTiming();
    timing.start(0);
    timing.providerFailed();
    timing.textReceived(25);
    timing.finish(50);
    timing.start(100);
    assert.deepEqual(timing.snapshot(150), {
        elapsedMs: 50,
        firstTextMs: undefined,
        toolMs: 0,
        inputMs: 0,
        providerErrors: 0,
    });
});
