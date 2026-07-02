import { Buffer } from "node:buffer";
import { deflateSync } from "node:zlib";

export type RGBA = [number, number, number, number];

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

/**
 * Renders a character bitmap (rows of palette keys, " " = transparent) to a
 * base64-encoded PNG, scaling each source pixel to a `scale`x`scale` block.
 */
export function bitmapToPngBase64(
    palette: Record<string, RGBA>,
    rows: string[],
    scale: number,
    background: RGBA = [0, 0, 0, 0],
): string {
    const sourceHeight = rows.length;
    const sourceWidth = Math.max(...rows.map((row) => row.length));
    const width = sourceWidth * scale;
    const height = sourceHeight * scale;
    const scanlines: Buffer[] = [];

    for (let y = 0; y < height; y++) {
        const sourceRow = rows[Math.floor(y / scale)] ?? "";
        const line = Buffer.alloc(1 + width * 4);
        line[0] = 0; // PNG filter: none
        for (let x = 0; x < width; x++) {
            const char = sourceRow[Math.floor(x / scale)] ?? " ";
            const pixel =
                char === " " ? background : (palette[char] ?? background);
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
