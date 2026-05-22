import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { allocateImageId, deleteKittyImage, getCapabilities, Image } from "@mariozechner/pi-tui";
import { guyImageForFrame } from "./characters";

export default function (pi: ExtensionAPI) {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let tuiRef: { requestRender: () => void } | null = null;

  pi.on("session_start", async (_event, ctx) => {
    if (!ctx.hasUI) return;

    let tick = 0;
    let x = 0;
    let direction: 1 | -1 = 1;
    let lastWidth = 80;
    // Allocate a stable Kitty image id once. Reusing the same id every frame is
    // what lets `deleteKittyImage` work: `d=I` deletes the image and all of its
    // placements wherever they are on screen, so the previous frame is wiped
    // before the next is drawn. Without a stable id the sequence carries no `i=`,
    // each frame becomes an undeletable placement, and old frames linger when the
    // viewport scrolls (e.g. on permission prompts or tool results).
    const imageId = allocateImageId();

    ctx.ui.setWidget("pixilate", (tui, theme) => {
      tuiRef = tui;
      return {
        render(width: number): string[] {
          lastWidth = width;

          const frameIndex = Math.floor(tick / 2) % 2;
          const guyWidthCells = Math.min(10, Math.max(1, width));
          const clampedX = Math.max(0, Math.min(x, Math.max(0, width - guyWidthCells)));
          const base64Data = guyImageForFrame({
            widthCells: width,
            xCells: clampedX,
            direction,
            frameIndex,
            blink: tick % 28 === 0,
          });
          const image = new Image(
            base64Data,
            "image/png",
            { fallbackColor: (str) => theme.fg("accent", str) },
            { maxWidthCells: width, maxHeightCells: 5, imageId },
          );

          const lines = image.render(width + 2);

          // Delete the previous placement of this id before drawing the next
          // frame. Harmless no-op on the first frame; on later frames it removes
          // any stale placement left behind when the viewport scrolled.
          const clearPreviousImage =
            getCapabilities().images === "kitty" ? deleteKittyImage(imageId) : "";

          return [
            " ".repeat(width),
            // Keep the image at a fixed cursor position. The generated PNG uses
            // an opaque grass-green canvas so each frame covers the previous one.
            ...lines.map((line, index) =>
              index === 0 ? `${clearPreviousImage}${line}` : line,
            ),
          ];
        },
        invalidate(): void {},
      };
    });

    intervalId = setInterval(() => {
      tick += 1;
      const maxX = Math.max(0, lastWidth - 10);
      x += direction;
      if (x >= maxX) {
        x = maxX;
        direction = -1;
      }
      if (x <= 0) {
        x = 0;
        direction = 1;
      }
      tuiRef?.requestRender();
    }, 160);
  });

  pi.on("session_shutdown", async () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    tuiRef = null;
  });
}
