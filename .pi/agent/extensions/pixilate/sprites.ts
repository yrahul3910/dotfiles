import type { RGBA } from "./png";

export const PALETTE: Record<string, RGBA> = {
    K: [28, 28, 36, 255], // character outline; inverted on dark terminal bg
    E: [28, 28, 36, 255], // eyes (kept dark regardless of terminal bg)
    B: [79, 156, 255, 160], // translucent blue (bunny shading / guy shirt)
    D: [41, 89, 172, 255], // dark blue (guy pants)
    S: [255, 213, 160, 255], // skin
    W: [255, 255, 255, 255], // white (bunny fur, cat muzzle)
    P: [255, 128, 180, 255], // pink (cheeks, noses, flower petals)
    O: [235, 148, 60, 255], // orange (cat fur)
    N: [186, 98, 32, 255], // dark orange (cat stripes)
    Y: [255, 214, 90, 255], // yellow (flower centers)
    L: [88, 204, 88, 255], // light green (leaves)
    T: [28, 120, 48, 255], // dark green (bush)
    R: [96, 56, 32, 255], // brown (bush trunk)
};

export interface IdlePose {
    art: string[];
    /** Ticks to hold this pose; the last pose holds until the idle ends. */
    ticks: number;
}

export interface CharacterSprite {
    name: string;
    /** Two-frame walk cycle, drawn facing right. */
    walk: [string[], string[]];
    /**
     * Art shown while airborne. Characters without one never do the big
     * jump; hoppers fall back to walk[1] for their hop arcs.
     */
    jump?: string[];
    /** Poses played in order while standing still; defaults to walk[0]. */
    idle?: IdlePose[];
    /** Palette keys substituted while blinking, e.g. { E: "W" }. */
    blink: Record<string, string>;
    /** hop: advances in little arcs (bunny); walk: alternates leg frames. */
    gait: "walk" | "hop";
    /** Terminal cells advanced per tick while moving. */
    speed: number;
}

/** Pads every row of a sprite to the same width so flips stay aligned. */
function pad(rows: string[]): string[] {
    const width = Math.max(...rows.map((row) => row.length));
    return rows.map((row) => row.padEnd(width, " "));
}

const BUNNY_STAND = pad([
    "        K K   ",
    "       K K K  ",
    "       K K K  ",
    "       KBKBK  ",
    "       KBWWWK ",
    "    KKKBWWWWWK",
    "   KWBBWWWEWWK",
    "KKKBBWWBWWEWWK",
    "KWKBWBWWBWWWWK",
    "KKBWWWBWWBWKK ",
    "KBBBKKBWWBK   ",
    "K     KKK  K  ",
    "KKKKKK   KKK  ",
]);

// Ears swept back mid-hop.
const BUNNY_AIR = pad([
    "              ",
    "       K K K  ",
    "       K K K  ",
    "       K K K  ",
    "       KK K K ",
    "    KKKBWWWWWK",
    "   KWBBWWWEWWK",
    "KKKBBWWBWWEWWK",
    "KWKBWBWWBWWWWK",
    "KKBWWWBWWBWKK ",
    "KBBBKKBWWBK   ",
    "K     KKK  K  ",
    "KKKKKK   KKK  ",
]);

export const BUNNY: CharacterSprite = {
    name: "bunny",
    walk: [BUNNY_STAND, BUNNY_AIR],
    jump: BUNNY_AIR,
    blink: { E: "W" },
    gait: "hop",
    speed: 1,
};

// A round-faced little guy, front-facing, legs alternating as he shuffles.
const GUY_WALK_A = pad([
    "   KKKK   ",
    "  KKKKKK  ",
    "  KSSSSK  ",
    "  KSESEK  ",
    "  KPSSPK  ",
    "   KSSK   ",
    "  KBBBBK  ",
    " KSBBBBSK ",
    "  KBBBBK  ",
    "   KDDK   ",
    "  KD  DK  ",
    " KK    KK ",
]);

const GUY_WALK_B = pad([
    "   KKKK   ",
    "  KKKKKK  ",
    "  KSSSSK  ",
    "  KSESEK  ",
    "  KPSSPK  ",
    "   KSSK   ",
    "  KBBBBK  ",
    " KSBBBBSK ",
    "  KBBBBK  ",
    "   KDDK   ",
    "   KDDK   ",
    "  KK KK   ",
]);

// Arms up, legs tucked.
const GUY_JUMP = pad([
    "   KKKK   ",
    "  KKKKKK  ",
    "  KSSSSK  ",
    "  KSESEK  ",
    " SKPSSPKS ",
    " K KSSK K ",
    " KKBBBBKK ",
    "  KBBBBK  ",
    "  KBBBBK  ",
    "   KDDK   ",
    "  KD  DK  ",
    "  K    K  ",
]);

export const GUY: CharacterSprite = {
    name: "guy",
    walk: [GUY_WALK_A, GUY_WALK_B],
    jump: GUY_JUMP,
    blink: { E: "S" },
    gait: "walk",
    speed: 0.5,
};

// An orange cat trotting right, tail curled up behind.
const CAT_WALK_A = pad([
    "          KK  KK",
    "          KOKKOK",
    "  KK      KOOOOK",
    " K  K     KOEOEK",
    " K  K     KOOOOK",
    "  K K     KOWWPK",
    "   KKKOONOOOOOK ",
    "    KOOOONOOOK  ",
    "    KOOOOOOOK   ",
    "    KOK  KOK    ",
    "    KK    KK    ",
]);

const CAT_WALK_B = pad([
    "          KK  KK",
    "          KOKKOK",
    "  KK      KOOOOK",
    " K  K     KOEOEK",
    " K  K     KOOOOK",
    "  K K     KOWWPK",
    "   KKKOONOOOOOK ",
    "    KOOOONOOOK  ",
    "    KOOOOOOOK   ",
    "     KOK KOK    ",
    "      KK  KK    ",
]);

// Mid-pounce: legs stretched, tail streaming.
const CAT_JUMP = pad([
    "          KK  KK",
    "          KOKKOK",
    "          KOOOOK",
    "KKK       KOEOEK",
    "   KK     KOOOOK",
    "     KOONOKOWWPK",
    "    KOOOONOOOOK ",
    "   KOOOOOOOOOK  ",
    "  KOK KOOKOK    ",
    " KK    KK KK    ",
]);

// A big stretch: rump and tail up, chest low, front legs reaching forward.
const CAT_STRETCH = pad([
    "  KK              ",
    "  K K             ",
    "   KOK            ",
    "  KOOOK           ",
    "  KOONOK    KK  KK",
    "   KOOOOK   KOKKOK",
    "    KOOOOK  KOOOOK",
    "    KOOOOOOOKOEOEK",
    "     KOOOOOOKOWWPK",
    "    KK KOOOOOOOKK ",
]);

// The classic loaf: paws tucked, head up, going nowhere.
const CAT_LOAF = pad([
    "        KK  KK ",
    "        KOKKOK ",
    "        KOOOOK ",
    "        KOEOEK ",
    "        KOWWPK ",
    "  KOOONOOOOOOK ",
    " KOOOOOOONOOOK ",
    " KOOOOOOOOOOOK ",
    "  KKKKKKKKKKK  ",
]);

export const CAT: CharacterSprite = {
    name: "cat",
    walk: [CAT_WALK_A, CAT_WALK_B],
    jump: CAT_JUMP,
    idle: [
        { art: CAT_STRETCH, ticks: 6 },
        { art: CAT_LOAF, ticks: 1 },
    ],
    blink: { E: "O" },
    gait: "walk",
    speed: 0.7,
};

export const CHARACTERS: Record<string, CharacterSprite> = {
    bunny: BUNNY,
    guy: GUY,
    cat: CAT,
};

// One foreground bush. Spaces are transparent, so only the leaf/trunk pixels
// draw; it's rendered after the characters so they walk behind it.
export const FRONT_BUSH = pad([
    "   TTTT  ",
    " TLLLLTT ",
    "TLLLLLLLT",
    "TLLTLLLLT",
    " TTLLLTT ",
    "   RR    ",
    "  RRRR   ",
]);

// Background flowers the characters walk in front of.
export const FLOWER = pad([
    " P ",
    "PYP",
    " P ",
    " L ",
]);
