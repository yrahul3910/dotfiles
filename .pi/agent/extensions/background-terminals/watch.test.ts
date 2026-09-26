import assert from "node:assert/strict";
import test from "node:test";
import type { TerminalSnapshot } from "./src/domain.ts";
import { createTerminalWatches, MAX_WATCH_INTERVAL_SECONDS } from "./src/watch.ts";

function snapshot(id = "bt-1"): TerminalSnapshot {
  return {
    id,
    command: "sleep 999",
    title: "quiet",
    cwd: "/tmp",
    status: "running",
    createdAt: 0,
    stdout: { text: "", totalBytes: 0, truncatedBytes: 0 },
    stderr: { text: "", totalBytes: 0, truncatedBytes: 0 },
  };
}

test("watches repeatedly notify even when output is unchanged", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const delivered: TerminalSnapshot[] = [];

  const watches = createTerminalWatches({
    isIdle: () => true,
    deliver: (snap) => {
      delivered.push(snap);
      return true;
    },
  });

  t.after(() => watches.clear());
  const snap = snapshot();
  watches.set(snap.id, 2, () => snap);
  t.mock.timers.tick(1_999);
  assert.equal(delivered.length, 0);
  t.mock.timers.tick(1);
  t.mock.timers.tick(2_000);
  assert.deepEqual(delivered, [snap, snap]);
});

test("busy agents hold one check per terminal and read fresh output on delivery", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let idle = false;
  let first = snapshot();
  const second = snapshot("bt-2");
  const delivered: TerminalSnapshot[] = [];

  const watches = createTerminalWatches({
    isIdle: () => idle,
    deliver: (snap) => {
      delivered.push(snap);
      return true;
    },
  });

  t.after(() => watches.clear());
  watches.set(first.id, 1, () => first);
  watches.set(second.id, 1, () => second);
  t.mock.timers.tick(20_000);
  watches.flush();
  assert.equal(delivered.length, 0);

  first = {
    ...first,
    stdout: { text: "new output", totalBytes: 10, truncatedBytes: 0 },
  };
  idle = true;
  watches.flush();
  watches.flush();
  assert.deepEqual(delivered, [first, second]);

  t.mock.timers.tick(999);
  assert.equal(delivered.length, 2);
  t.mock.timers.tick(1);
  assert.equal(delivered.length, 4);
});

test("updating a watch replaces its interval and pending check; zero cancels it", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let idle = false;
  let deliveries = 0;

  const watches = createTerminalWatches({
    isIdle: () => idle,
    deliver: () => {
      deliveries++;
      return true;
    },
  });

  const snap = snapshot();
  watches.set(snap.id, 1, () => snap);
  t.mock.timers.tick(1_000);

  watches.set(snap.id, 3, () => snap);
  idle = true;
  watches.flush();
  t.mock.timers.tick(2_999);
  assert.equal(deliveries, 0);
  t.mock.timers.tick(1);
  assert.equal(deliveries, 1);

  watches.set(snap.id, 0, () => snap);
  t.mock.timers.tick(10_000);
  assert.equal(deliveries, 1);
  assert.equal(snap.status, "running");
});

test("settled or removed terminals never receive pending checks", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let idle = false;
  let snap: TerminalSnapshot | undefined = snapshot();
  let deliveries = 0;

  const watches = createTerminalWatches({
    isIdle: () => idle,
    deliver: () => {
      deliveries++;
      return true;
    },
  });

  watches.set("bt-1", 1, () => snap);
  t.mock.timers.tick(1_000);
  snap = { ...snap, status: "done" };
  idle = true;
  watches.flush();
  t.mock.timers.tick(1_000);

  watches.set("bt-1", 1, () => snap);
  snap = undefined;
  t.mock.timers.tick(1_000);
  assert.equal(deliveries, 0);
});

test("cancel and shutdown clear both pending checks and timers", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let idle = false;
  let deliveries = 0;

  const watches = createTerminalWatches({
    isIdle: () => idle,
    deliver: () => {
      deliveries++;
      return true;
    },
  });

  const snap = snapshot();
  watches.set("bt-1", 1, () => snap);
  watches.set("bt-2", 10, () => snapshot("bt-2"));
  t.mock.timers.tick(1_000);
  watches.cancel("bt-1");
  watches.clear();

  idle = true;
  watches.flush();
  t.mock.timers.tick(20_000);
  assert.equal(deliveries, 0);
});

test("failed delivery retries without losing or duplicating the check", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let attempts = 0;
  const watches = createTerminalWatches({
    isIdle: () => true,
    deliver: () => ++attempts > 1,
  });

  t.after(() => watches.clear());
  watches.set("bt-1", 1, () => snapshot());
  t.mock.timers.tick(1_000);
  assert.equal(attempts, 1);
  t.mock.timers.tick(1_000);
  assert.equal(attempts, 2);

  watches.flush();
  assert.equal(attempts, 2);
});

test("invalid intervals leave the existing watch intact", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let deliveries = 0;

  const watches = createTerminalWatches({
    isIdle: () => true,
    deliver: () => {
      deliveries++;
      return true;
    },
  });

  t.after(() => watches.clear());
  watches.set("bt-1", 1, () => snapshot());

  for (const interval of [
    -1,
    0.5,
    NaN,
    Infinity,
    MAX_WATCH_INTERVAL_SECONDS + 1,
  ]) {
    assert.throws(
      () => watches.set("bt-1", interval, () => snapshot()),
      /interval_seconds must be an integer/,
    );
  }

  t.mock.timers.tick(1_000);
  assert.equal(deliveries, 1);
});
