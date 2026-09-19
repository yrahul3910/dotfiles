import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { convertToPng } from "@earendil-works/pi-coding-agent";
import { Box, Container, Image, Spacer, Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";
import { Value } from "typebox/value";

const CAT_ENTRY_TYPE = "random-cat-entry";

export interface CatImageResult {
    readonly base64: string;
    readonly mimeType: string;
    readonly sourceUrl: string;
}

export interface CatEntryData {
    readonly base64: string;
    readonly mimeType: string;
    readonly sourceUrl: string;
}

const TheCatApiArraySchema = Type.Array(
    Type.Object({
        url: Type.String({ minLength: 1 }),
    }),
);

const CataasSchema = Type.Object({
    url: Type.Optional(Type.String({ minLength: 1 })),
    id: Type.Optional(Type.String({ minLength: 1 })),
});

export function parseTheCatApiResponse(json: unknown): string | null {
    if (!Value.Check(TheCatApiArraySchema, json)) {
        return null;
    }
    const [first] = json;
    return first?.url ?? null;
}

export function parseCataasResponse(json: unknown): string | null {
    if (!Value.Check(CataasSchema, json)) {
        return null;
    }
    if (json.url) {
        return json.url.startsWith("http") ? json.url : `https://cataas.com${json.url}`;
    }
    if (json.id) {
        return `https://cataas.com/cat/${json.id}`;
    }
    return null;
}

async function fetchFromTheCatApi(signal?: AbortSignal): Promise<string | null> {
    const res = await fetch("https://api.thecatapi.com/v1/images/search", { signal });
    if (!res.ok) {
        return null;
    }
    const data: unknown = await res.json();
    return parseTheCatApiResponse(data);
}

async function fetchFromCataas(signal?: AbortSignal): Promise<string | null> {
    const res = await fetch("https://cataas.com/cat?json=true", { signal });
    if (!res.ok) {
        return null;
    }
    const data: unknown = await res.json();
    return parseCataasResponse(data);
}

export async function fetchRandomCatUrl(signal?: AbortSignal): Promise<string | null> {
    try {
        const catApiUrl = await fetchFromTheCatApi(signal);
        if (catApiUrl) {
            return catApiUrl;
        }
    } catch {
        // Fall back to secondary service
    }

    try {
        return await fetchFromCataas(signal);
    } catch {
        return null;
    }
}

export async function fetchCatImage(signal?: AbortSignal): Promise<CatImageResult> {
    const imageUrl = await fetchRandomCatUrl(signal);
    if (!imageUrl) {
        throw new Error("Failed to find a cat image from available providers");
    }

    const imageRes = await fetch(imageUrl, { signal });
    if (!imageRes.ok) {
        throw new Error(`Failed to download cat image: HTTP ${imageRes.status}`);
    }

    const buffer = Buffer.from(await imageRes.arrayBuffer());
    const originalMime = imageRes.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
    const rawBase64 = buffer.toString("base64");

    const converted = await convertToPng(rawBase64, originalMime);
    if (converted) {
        return {
            base64: converted.data,
            mimeType: converted.mimeType,
            sourceUrl: imageUrl,
        };
    }

    return {
        base64: rawBase64,
        mimeType: originalMime,
        sourceUrl: imageUrl,
    };
}

export default function (pi: ExtensionAPI): void {
    pi.registerEntryRenderer<CatEntryData>(CAT_ENTRY_TYPE, (entry, { expanded }, theme) => {
        const data = entry.data;
        if (!data?.base64) {
            return undefined;
        }

        const container = new Container();
        const box = new Box(1, 1);

        box.addChild(new Text(theme.fg("customMessageLabel", theme.bold("\u{1F431} Random Cat")), 0, 0));

        const image = new Image(
            data.base64,
            data.mimeType,
            { fallbackColor: (str: string) => str },
            { maxWidthCells: 60, maxHeightCells: 24 },
        );
        box.addChild(image);

        if (expanded && data.sourceUrl) {
            box.addChild(new Spacer(1));
            box.addChild(new Text(`Source: ${data.sourceUrl}`, 0, 0));
        }

        container.addChild(box);
        return container;
    });

    pi.registerCommand("cat", {
        description: "Fetch and display a random picture of a cat",
        handler: async (_args, ctx) => {
            if (!ctx.hasUI) {
                return;
            }

            ctx.ui.notify("Fetching a cat...", "info");

            try {
                const cat = await fetchCatImage();
                pi.appendEntry<CatEntryData>(CAT_ENTRY_TYPE, {
                    base64: cat.base64,
                    mimeType: cat.mimeType,
                    sourceUrl: cat.sourceUrl,
                });
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                ctx.ui.notify(`Cat fetch failed: ${message}`, "error");
            }
        },
    });
}
