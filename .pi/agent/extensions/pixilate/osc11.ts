import { type RGBA } from "./characters.ts";

/**
 * Normalizes a hex color channel of 1-4 hex digits (as used by OSC 11 responses)
 * into a 0-255 integer. Terminals reply with 16-bit-per-channel hex
 * (e.g. "1e1e") or sometimes shorter; we take the most significant byte.
 */
function hexChannelTo8Bit(hex: string): number {
    // Pad/truncate to 2 most-significant hex digits regardless of input width
    const padded = hex.length >= 2 ? hex.slice(0, 2) : hex.padEnd(2, hex);
    return parseInt(padded, 16);
}

/**
 * Parses an OSC 11 response body, e.g.:
 *   "rgb:1e1e/1e1e/1e1e"
 *   "rgb:1e/1e/1e"
 *   "rgba:1e1e/1e1e/1e1e/ffff"  (some terminals/forks include alpha)
 */
function parseOSC11Response(raw: string): RGBA {
    const match = raw.match(
        /rgba?:([0-9a-fA-F]+)\/([0-9a-fA-F]+)\/([0-9a-fA-F]+)(?:\/([0-9a-fA-F]+))?/,
    );
    if (!match) {
        throw `Could not parse OSC 11 response: ${JSON.stringify(raw)}`;
    }
    const [, rHex, gHex, bHex, aHex] = match;
    return [
        hexChannelTo8Bit(rHex!),
        hexChannelTo8Bit(gHex!),
        hexChannelTo8Bit(bHex!),
        aHex !== undefined ? hexChannelTo8Bit(aHex) / 255 : 1,
    ];
}

/**
 * Builds the OSC 11 query, wrapping it in tmux's DCS passthrough envelope
 * when running inside tmux (requires `set -g allow-passthrough on`).
 */
function buildQuery(): string {
    const ESC = "\x1b";
    const inner = `${ESC}]11;?${ESC}\\`;

    if (process.env.TMUX) {
        // tmux passthrough: wrap in \033Ptmux;...\033\\ and double every literal ESC inside
        const doubled = inner.replace(/\x1b/g, `${ESC}${ESC}`);
        return `${ESC}Ptmux;${doubled}${ESC}\\`;
    }

    return inner;
}

/**
 * Queries the terminal's background color via OSC 11.
 * Must be run in a TTY (interactive terminal), not piped/redirected.
 */
export function getTerminalBackgroundColor(
    timeoutMs: number = 1000,
): Promise<RGBA> {
    return new Promise((resolve, reject) => {
        if (!process.stdin.isTTY || !process.stdout.isTTY) {
            reject(
                new Error(
                    "stdin/stdout is not a TTY - OSC 11 query requires an interactive terminal",
                ),
            );
            return;
        }

        const stdin = process.stdin;
        const wasRaw = stdin.isRaw;
        // Remember whether stdin was already flowing (e.g. a TUI reading keys).
        // We must not leave it paused on cleanup, or the owner stops receiving
        // input — in raw mode that includes Ctrl-C (delivered as the byte \x03).
        const wasPaused = stdin.isPaused();
        let buffer = "";
        let settled = false;

        const cleanup = () => {
            stdin.removeListener("data", onData);
            clearTimeout(timer);
            stdin.setRawMode?.(wasRaw ?? false);
            if (wasPaused) stdin.pause();
        };

        const finish = (fn: () => void) => {
            if (settled) return;
            settled = true;
            cleanup();
            fn();
        };

        const onData = (chunk: Buffer) => {
            buffer += chunk.toString("latin1"); // preserve raw bytes 1:1, avoid utf8 mangling
            // Response terminates in BEL (\x07) or ST (\x1b\\)
            if (buffer.includes("\x07") || buffer.includes("\x1b\\")) {
                finish(() => {
                    try {
                        resolve(parseOSC11Response(buffer));
                    } catch (err) {
                        reject(err);
                    }
                });
            }
        };

        const timer = setTimeout(() => {
            finish(() =>
                reject(
                    new Error(
                        "Terminal did not respond to OSC 11 query in time (unsupported terminal, or non-TTY stdin/stdout",
                    ),
                ),
            );
        }, timeoutMs);

        stdin.setRawMode(true);
        stdin.resume();
        stdin.on("data", onData);

        process.stdout.write(buildQuery());
    });
}

/** Computes perceived luminance (0-1) from RGB using the standard Rec. 709 coefficients.

See: https://en.wikipedia.org/wiki/Rec._709#Luma_coefficients
*/
export function relativeLuminance(pixel: RGBA): number {
    const [r, g, b, _] = pixel;
    return (0.2125 * r + 0.7154 * g + 0.0721 * b) / 255;
}

/** Convenience helper: returns "dark" or "light" based on a luminance threshold. */
export function classifyBackground(color: RGBA): "dark" | "light" {
    return relativeLuminance(color) < 0.5 ? "dark" : "light";
}
