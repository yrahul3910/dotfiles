import { Buffer } from "node:buffer";
import { deflateSync } from "node:zlib";

const PALETTE: Record<string, [number, number, number, number]> = {
    " ": [0, 0, 0, 0],
    K: [28, 28, 36, 255], // character outline
    b: [0, 0, 0, 0],  // black
    B: [79, 156, 255, 160], // blue (shirt)
    D: [41, 89, 172, 255], // dark blue (pants/shadow)
    S: [255, 213, 160, 255], // skin; a pale, blush color
    W: [255, 255, 255, 255], // white (eyes)
    P: [255, 128, 180, 255], // pink (cheeks)
    L: [88, 204, 88, 255], // light green (leaf)
    T: [28, 120, 48, 255], // trees (dark green)
    R: [96, 56, 32, 255], // tree root (brown)
};

const WALK_RIGHT = [
    "                ",
    "                ",
    "                ",
    "                ",
    "                ",
    "                ",
    "                ",
    "     KKKK       ",
    "   KSWSSWSK     ",
    " KKKSSSSSSSKKK  ",
    "  KSSSSSSSSK    ",
    "   KDKKKKDK     ",
    "     D  D       ",
];

const WALK_RIGHT_JUMP = [
    "                ",
    "                ",
    "                ",
    "                ",
    "                ",
    "                ",
    "                ",
    "     KKKK       ",
    " K KSWSSWSK K   ",
    "  KKSSSSSSSKK   ",
    "  KSSSSSSSSK    ",
    "   KDKKKKDK     ",
    "     D  D       ",
];
const EYES_ROW = 2;

const BUNNY_JUMP = [
    "              ",
    "       K K K  ",
    "       K K K  ",
    "       K K K  ",
    "       KK K K ",
    "    KKKB     K",
    "   K BB   K  K",
    "KKKBB  B  K  K",
    "K KB B  B    K",
    "KKB   B  B KK ",
    "KBBBKKB  BK   ",
    "K     KKK  K  ",
    "KKKKKK   KKK  "
];

const BUNNY = [
    "        K K   ",
    "       K K K  ",
    "       K K K  ",
    "       KBKBK  ",
    "       KB   K ",
    "    KKKB     K",
    "   K BB   K  K",
    "KKKBB  B  K  K",
    "K KB B  B    K",
    "KKB   B  B KK ",
    "KBBBKKB  BK   ",
    "K     KKK  K  ",
    "KKKKKK   KKK  "
];

const LINES = BUNNY.length + 10;

// One foreground bush. Spaces are transparent, so only the leaf/trunk pixels draw.
// Because this is drawn after the guy in `renderScene`, he can walk behind it.
const FRONT_BUSH = [
    "   TTTT   ",
    " TLLLLTT ",
    "TLLLLLLLT",
    "TLLTLLLLT",
    " TTLLLTT ",
    "   RR    ",
    "  RRRR   ",
];

function flip(rows: string[]): string[] {
    return rows.map((row) => [...row].reverse().join(""));
}

function crc32(buf: Buffer): number {
    let crc = 0xffffffff;
    for (const byte of buf) {
        crc ^= byte;
        for (let i = 0; i < 8; i++) {
            crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
        }
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
    const typeBuf = Buffer.from(type, "ascii");
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    typeBuf.copy(out, 4);
    data.copy(out, 8);
    out.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 8 + data.length);
    return out;
}

function bitmapToPngBase64(
    rows: string[],
    scale = 4.5,
    options: {
        canvasWidth?: number;
        offsetX?: number;
        background?: [number, number, number, number];
    } = {},
): string {
    const sourceHeight = rows.length;
    const spriteWidth = Math.max(...rows.map((row) => row.length));
    const sourceWidth = Math.max(
        spriteWidth + (options.offsetX ?? 0),
        options.canvasWidth ?? spriteWidth,
    );
    const width = sourceWidth * scale;
    const height = sourceHeight * scale;
    const scanlines: Buffer[] = [];
    const offsetX = options.offsetX ?? 0;
    const background = options.background ?? PALETTE[" "]!;

    for (let y = 0; y < height; y++) {
        const sourceRow = rows[Math.floor(y / scale)] ?? "";
        const line = Buffer.alloc(1 + width * 4);
        line[0] = 0; // PNG filter: none
        for (let x = 0; x < width; x++) {
            const sourceX = Math.floor(x / scale) - offsetX;
            const char =
                sourceX >= 0 && sourceX < spriteWidth
                    ? sourceRow[sourceX]
                    : " ";
            const pixel =
                char === " "
                    ? background
                    : (PALETTE[char ?? " "] ?? background);
            line.set(pixel, 1 + x * 4);
        }
        scanlines.push(line);
    }

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 6; // RGBA

    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk("IHDR", ihdr),
        chunk("IDAT", deflateSync(Buffer.concat(scanlines))),
        chunk("IEND", Buffer.alloc(0)),
    ]).toString("base64");
}

const SPRITE_WIDTH = Math.max(...WALK_RIGHT.map((row) => row.length));
const SPRITE_WIDTH_CELLS = 10;
// const BACKGROUND: [number, number, number, number] = [64, 176, 72, 255];
const BACKGROUND: [number, number, number, number] = [0, 0, 0, 0];

function makeCanvas(width: number, height: number): string[][] {
    return Array.from({ length: height }, () =>
        Array.from({ length: width }, () => " "),
    );
}

function drawBitmap(
    canvas: string[][],
    bitmap: string[],
    x: number,
    y: number,
): void {
    for (let row = 0; row < bitmap.length; row++) {
        const canvasRow = canvas[y + row];
        if (!canvasRow) continue;

        for (let col = 0; col < bitmap[row]!.length; col++) {
            const pixel = bitmap[row]![col];
            if (!pixel || pixel === " ") continue;

            const canvasX = x + col;
            if (canvasX >= 0 && canvasX < canvasRow.length) {
                canvasRow[canvasX] = pixel;
            }
        }
    }
}

function canvasToRows(canvas: string[][]): string[] {
    return canvas.map((row) => row.join(""));
}

export function guyImageForFrame(options: {
    widthCells: number;
    xCells: number;
    direction: 1 | -1;
    frameIndex: number;
    blink: boolean;
    jump: number;
}): string {
    // apply transforms one at a time; assumes no padding lines
    const flipFunction = (lines: string[]) =>
        options.direction === 1 ? lines : flip(lines);
    const blinkFunction = (lines: string[]) =>
        options.blink
            ? lines.map((line, i) =>
                i === EYES_ROW ? line.replaceAll("W", "S") : line,
            )
            : lines;
    // get the baseline guy
    const jumpFunction = () => (options.jump ? BUNNY_JUMP : BUNNY);

    let guy: string[] = jumpFunction();
    let transforms = [blinkFunction, flipFunction];

    for (let transform of transforms) {
        guy = transform(guy);
    }

    const paddingTop = LINES - guy.length - options.jump;
    const paddingBottom = options.jump;

    const paddingContent = "";

    const finalGuy: string[] = [
        ...Array(paddingTop).fill(paddingContent),
        ...guy,
        ...Array(paddingBottom).fill(paddingContent),
    ];

    const canvasWidth = Math.max(
        SPRITE_WIDTH,
        Math.ceil((options.widthCells * SPRITE_WIDTH) / SPRITE_WIDTH_CELLS),
    );
    const canvasHeight = LINES;
    const guyX = Math.round(
        (options.xCells * SPRITE_WIDTH) / SPRITE_WIDTH_CELLS,
    );

    const canvas = makeCanvas(canvasWidth, canvasHeight);

    // Layer order controls what appears in front. Put background scenery here first.
    drawBitmap(canvas, finalGuy, guyX, 0);

    // Foreground scenery goes last. This bush will cover the guy when he overlaps it.
    const bushX = Math.round(canvasWidth * 0.45);
    const bushY = canvasHeight - FRONT_BUSH.length;
    drawBitmap(canvas, FRONT_BUSH, bushX, bushY);

    return bitmapToPngBase64(canvasToRows(canvas), 4, {
        background: BACKGROUND,
    });
}
