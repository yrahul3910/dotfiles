import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { deleteKittyImage, getCapabilities, Image } from "@mariozechner/pi-tui";
import { classifyBackground, getTerminalBackgroundColor } from "./osc11";
import { Scene } from "./scene";

const DEFAULT_CHARACTERS = "bunny,cat,guy";

export default function (pi: ExtensionAPI) {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let tuiRef: { requestRender: () => void } | null = null;

    pi.on("session_start", async (_event, ctx) => {
        if (!ctx.hasUI || !!process.env.TMUX) return;

        let background: "light" | "dark" = "dark";
        try {
            const backgroundColor = await getTerminalBackgroundColor();
            background = classifyBackground(backgroundColor);
        } catch {}

        const characterNames = (
            process.env.PIXILATE_CHARACTERS ?? DEFAULT_CHARACTERS
        ).split(",");
        const scene = new Scene(characterNames);
        let imageId: number | undefined;

        ctx.ui.setWidget("pixilate", (tui, theme) => {
            tuiRef = tui;
            return {
                render(width: number): string[] {
                    const base64Data = scene.render(width, background);
                    const previousImageId = imageId;
                    const image = new Image(
                        base64Data,
                        "image/png",
                        { fallbackColor: (str) => theme.fg("accent", str) },
                        { maxWidthCells: width, maxHeightCells: 3, imageId },
                    );

                    const lines = image.render(width + 2);
                    imageId = image.getImageId();

                    const clearPreviousImage =
                        previousImageId !== undefined &&
                            getCapabilities().images === "kitty"
                            ? deleteKittyImage(previousImageId)
                            : "";

                    return [
                        " ".repeat(width),
                        ...lines.map((line, index) =>
                            index === 0 ? `${clearPreviousImage}${line}` : line,
                        ),
                    ];
                },
                invalidate(): void { },
            };
        });

        intervalId = setInterval(() => {
            scene.tick();
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
