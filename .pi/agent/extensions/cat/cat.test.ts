import { describe, expect, test } from "bun:test";
import { fetchRandomCatUrl, parseCataasResponse, parseTheCatApiResponse } from "./index";

describe("parseTheCatApiResponse", () => {
    test("extracts url from valid array", () => {
        const input = [{ url: "https://cdn.example.com/cat.jpg" }];
        expect(parseTheCatApiResponse(input)).toBe("https://cdn.example.com/cat.jpg");
    });

    test("returns null for empty array or invalid objects", () => {
        expect(parseTheCatApiResponse([])).toBeNull();
        expect(parseTheCatApiResponse(null)).toBeNull();
        expect(parseTheCatApiResponse([{}])).toBeNull();
        expect(parseTheCatApiResponse([{ url: "" }])).toBeNull();
    });
});

describe("parseCataasResponse", () => {
    test("extracts full url from cataas object", () => {
        const input = { url: "https://cataas.com/cat/123" };
        expect(parseCataasResponse(input)).toBe("https://cataas.com/cat/123");
    });

    test("prepends host if relative url", () => {
        const input = { url: "/cat/123" };
        expect(parseCataasResponse(input)).toBe("https://cataas.com/cat/123");
    });

    test("constructs url from id if url missing", () => {
        const input = { id: "abc" };
        expect(parseCataasResponse(input)).toBe("https://cataas.com/cat/abc");
    });

    test("returns null for invalid inputs", () => {
        expect(parseCataasResponse(null)).toBeNull();
        expect(parseCataasResponse({})).toBeNull();
    });
});

describe("fetchRandomCatUrl", () => {
    test("fetches a valid URL from live APIs", async () => {
        const url = await fetchRandomCatUrl();
        expect(url).toBeString();
        expect(url?.startsWith("http")).toBeTrue();
    });
});
