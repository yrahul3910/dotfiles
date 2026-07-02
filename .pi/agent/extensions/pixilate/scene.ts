import { bitmapToPngBase64, type RGBA } from "./png";
import {
    CHARACTERS,
    type CharacterSprite,
    FLOWER,
    FRONT_BUSH,
    PALETTE,
} from "./sprites";

// The original guy sprite was 16 source pixels drawn across 10 terminal
// cells; all cell<->pixel conversions keep that ratio.
const PIXELS_PER_CELL = 1.6;
const RENDER_SCALE = 4;

// Vertical offsets (in source pixels) over the course of a jump/hop.
const JUMP_ARC = [1, 3, 5, 6, 6, 5, 3, 1];
const HOP_ARC = [1, 2, 2, 1, 0, 0];

const MAX_SPRITE_HEIGHT = Math.max(
    ...Object.values(CHARACTERS).map((sprite) => sprite.walk[0].length),
);
const CANVAS_HEIGHT = MAX_SPRITE_HEIGHT + Math.max(...JUMP_ARC) + 1;

function flip(rows: string[]): string[] {
    return rows.map((row) => [...row].reverse().join(""));
}

function invertPixel(pixel: RGBA): RGBA {
    const [r, g, b, a] = pixel;
    return [255 - r, 255 - g, 255 - b, a];
}

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

type ActorState = "walk" | "idle" | "jump";

class Actor {
    readonly sprite: CharacterSprite;
    readonly widthPixels: number;
    readonly widthCells: number;

    x: number; // cells, fractional
    direction: 1 | -1;
    private state: ActorState = "walk";
    private stateTicks = 0; // remaining ticks of idle, or elapsed ticks of jump
    private idleElapsed = 0;
    private walkPhase = 0;
    private blinkTicks = 0;

    constructor(sprite: CharacterSprite, x: number, direction: 1 | -1) {
        this.sprite = sprite;
        const arts = [
            ...sprite.walk,
            ...(sprite.jump ? [sprite.jump] : []),
            ...(sprite.idle?.map((pose) => pose.art) ?? []),
        ];
        this.widthPixels = Math.max(...arts.map((art) => art[0]!.length));
        this.widthCells = Math.ceil(this.widthPixels / PIXELS_PER_CELL);
        this.x = x;
        this.direction = direction;
    }

    update(sceneWidthCells: number): void {
        if (this.blinkTicks > 0) {
            this.blinkTicks -= 1;
        } else if (Math.random() < 0.04) {
            this.blinkTicks = 2;
        }

        switch (this.state) {
            case "idle":
                this.stateTicks -= 1;
                this.idleElapsed += 1;
                if (this.stateTicks <= 0) {
                    this.state = "walk";
                    if (Math.random() < 0.4) {
                        this.direction = this.direction === 1 ? -1 : 1;
                    }
                }
                break;
            case "jump":
                this.move(sceneWidthCells, this.sprite.speed);
                this.stateTicks += 1;
                if (this.stateTicks >= JUMP_ARC.length) {
                    this.state = "walk";
                }
                break;
            case "walk":
                this.walkPhase += 1;
                // Hoppers only advance while airborne, in quick bursts.
                if (this.sprite.gait === "hop") {
                    if (this.hopOffset() > 0) {
                        this.move(sceneWidthCells, this.sprite.speed * 1.5);
                    }
                } else {
                    this.move(sceneWidthCells, this.sprite.speed);
                }
                if (Math.random() < 0.015) {
                    this.state = "idle";
                    this.stateTicks = 10 + Math.floor(Math.random() * 25);
                    this.idleElapsed = 0;
                } else if (this.sprite.jump && Math.random() < 0.02) {
                    this.state = "jump";
                    this.stateTicks = 0;
                }
                break;
        }
    }

    private move(sceneWidthCells: number, speed: number): void {
        const maxX = Math.max(0, sceneWidthCells - this.widthCells);
        this.x += this.direction * speed;
        if (this.x >= maxX) {
            this.x = maxX;
            this.direction = -1;
        }
        if (this.x <= 0) {
            this.x = 0;
            this.direction = 1;
        }
    }

    private hopOffset(): number {
        return HOP_ARC[this.walkPhase % HOP_ARC.length]!;
    }

    /** Height above the ground line, in source pixels. */
    liftPixels(): number {
        if (this.state === "jump") return JUMP_ARC[this.stateTicks] ?? 0;
        if (this.state === "walk" && this.sprite.gait === "hop") {
            return this.hopOffset();
        }
        return 0;
    }

    art(): string[] {
        let rows: string[];
        if (this.liftPixels() > 0) {
            rows = this.sprite.jump ?? this.sprite.walk[1];
        } else if (this.state === "idle") {
            rows = this.idlePose();
        } else {
            rows = this.sprite.walk[Math.floor(this.walkPhase / 2) % 2]!;
        }

        if (this.blinkTicks > 0) {
            for (const [from, to] of Object.entries(this.sprite.blink)) {
                rows = rows.map((row) => row.replaceAll(from, to));
            }
        }

        return this.direction === 1 ? rows : flip(rows);
    }

    /** Walks the idle pose sequence by elapsed time; the last pose holds. */
    private idlePose(): string[] {
        const poses = this.sprite.idle;
        if (!poses || poses.length === 0) return this.sprite.walk[0];

        let remaining = this.idleElapsed;
        for (const pose of poses) {
            if (remaining < pose.ticks) return pose.art;
            remaining -= pose.ticks;
        }
        return poses[poses.length - 1]!.art;
    }
}

export class Scene {
    private actors: Actor[];
    private widthCells: number;

    constructor(characterNames: string[], initialWidthCells = 80) {
        this.widthCells = initialWidthCells;
        const sprites = characterNames
            .map((name) => CHARACTERS[name.trim().toLowerCase()])
            .filter((sprite): sprite is CharacterSprite => sprite !== undefined);
        if (sprites.length === 0) sprites.push(CHARACTERS.bunny!);

        // Spread starting positions out and alternate initial headings so the
        // characters don't march in lockstep.
        this.actors = sprites.map(
            (sprite, index) =>
                new Actor(
                    sprite,
                    Math.floor(
                        ((index + 0.5) * initialWidthCells) / sprites.length,
                    ),
                    index % 2 === 0 ? 1 : -1,
                ),
        );
    }

    tick(): void {
        for (const actor of this.actors) {
            actor.update(this.widthCells);
        }
    }

    /** Renders the current frame as a base64 PNG sized for the given width. */
    render(widthCells: number, terminalBackground: "light" | "dark"): string {
        this.widthCells = widthCells;

        const canvasWidth = Math.max(
            Math.max(...this.actors.map((actor) => actor.widthPixels)),
            Math.ceil(widthCells * PIXELS_PER_CELL),
        );
        const canvas = makeCanvas(canvasWidth, CANVAS_HEIGHT);

        // Background scenery first, then characters, then foreground scenery.
        for (const fraction of [0.18, 0.72]) {
            drawBitmap(
                canvas,
                FLOWER,
                Math.round(canvasWidth * fraction),
                CANVAS_HEIGHT - FLOWER.length,
            );
        }

        for (const actor of this.actors) {
            drawBitmap(
                canvas,
                actor.art(),
                Math.round(actor.x * PIXELS_PER_CELL),
                CANVAS_HEIGHT - actor.art().length - actor.liftPixels(),
            );
        }

        drawBitmap(
            canvas,
            FRONT_BUSH,
            Math.round(canvasWidth * 0.45),
            CANVAS_HEIGHT - FRONT_BUSH.length,
        );

        const themePalette = { ...PALETTE };
        if (terminalBackground === "dark") {
            themePalette["K"] = invertPixel(themePalette["K"]!);
        }

        return bitmapToPngBase64(
            themePalette,
            canvas.map((row) => row.join("")),
            RENDER_SCALE,
        );
    }
}
