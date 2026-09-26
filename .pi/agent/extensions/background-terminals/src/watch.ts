import type { TerminalSnapshot } from "./domain.ts";

/** Whole seconds that fit Node's signed 32-bit millisecond timer. */
export const MAX_WATCH_INTERVAL_SECONDS = 2_147_483;

type TerminalWatch = {
  intervalSeconds: number;
  read: () => TerminalSnapshot | undefined;
  timer?: ReturnType<typeof setTimeout>;
  due: boolean;
};

export function createTerminalWatches(options: {
  isIdle: () => boolean;
  deliver: (snapshot: TerminalSnapshot) => boolean;
}) {
  const watches = new Map<string, TerminalWatch>();

  const cancel = (id: string) => {
    clearTimeout(watches.get(id)?.timer);
    watches.delete(id);
  };

  const flush = () => {
    for (const [id, watch] of watches) {
      if (!watch.due) continue;
      const snapshot = watch.read();

      if (!snapshot || snapshot.status !== "running") {
        cancel(id);
        continue;
      }

      if (!options.isIdle()) return;
      if (options.deliver(snapshot)) watch.due = false;
      // Failed deliveries retry after an interval. Busy agents hold one check until agent_settled.
      schedule(watch);
    }
  };

  const schedule = (watch: TerminalWatch) => {
    clearTimeout(watch.timer);

    watch.timer = setTimeout(() => {
      watch.due = true;
      flush();
    }, watch.intervalSeconds * 1_000);

    watch.timer.unref();
  };

  return {
    set(id: string, intervalSeconds: number, read: TerminalWatch["read"]) {
      if (
        !Number.isInteger(intervalSeconds) ||
        intervalSeconds < 0 ||
        intervalSeconds > MAX_WATCH_INTERVAL_SECONDS
      ) {
        throw new Error(
          `interval_seconds must be an integer between 0 and ${MAX_WATCH_INTERVAL_SECONDS}.`,
        );
      }

      cancel(id);
      if (intervalSeconds === 0) return;
      const watch: TerminalWatch = { intervalSeconds, read, due: false };
      watches.set(id, watch);
      schedule(watch);
    },
    cancel,
    flush,
    clear() {
      for (const id of watches.keys()) cancel(id);
    },
  };
}
