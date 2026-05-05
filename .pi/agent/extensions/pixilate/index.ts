import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { truncateToWidth } from "@mariozechner/pi-tui";
import { GUY_FRAMES } from "./characters";

// Two-frame walking animation (5x4)
const FRAMES = [
  ["  ◯  ", " /|\\ ", "  |  ", " / \\ "],
  ["  ◯  ", " /|\\ ", "  |  ", "  |\\ "],
];

export default function (pi: ExtensionAPI) {
  let intervalId: ReturnType<typeof setInterval> | null = null;

  // Remember the `tui` arg so we can use it in `setInterval`.
  let tuiRef: { requestRender: () => void } | null = null;

  pi.on("session_start", async (_event, ctx) => {
    if (!ctx.hasUI) return;

    let tick = 0;
    let x = 0;
    let direction = 1;

    ctx.ui.setWidget("pixilate", (tui, theme) => {
      tuiRef = tui;
      return {
        render(width: number): string[] {
          const frame = tick % 10 === 0 ? GUY_FRAMES.blink : GUY_FRAMES.default;

          const guyWidth = frame.length;
          const clampedX = Math.max(
            0,
            Math.min(x, Math.max(0, width - guyWidth)),
          );

          const lines: string[] = [];
          // Empty line above the guy
          lines.push(" ".repeat(width));

          for (const row of frame) {
            const padding = " ".repeat(clampedX);
            const colored = padding + theme.fg("accent", row) + "\x1b[0m";
            lines.push(truncateToWidth(colored, width));
          }

          return lines;
        },
        invalidate(): void {},
      };
    });

    intervalId = setInterval(() => {
      tick += 1;
      x += direction;
      // Bounce back and forth across a reasonable range
      if (x >= 60) direction = -1;
      if (x <= 0) direction = 1;
      tuiRef?.requestRender();
    }, 200);
  });

  pi.on("session_shutdown", async () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    tuiRef = null;
  });
}
