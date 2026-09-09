import { describe, it, expect } from "vitest";
import { validate, hasErrors, filterItems, formatDate, createCandle, normalize, BURN_STATUSES, VIEWS, NAME_MAX, BRAND_MAX, SCENT_MAX, VESSEL_MAX, } from "../src/domain";
function makeInput(overrides = {}) {
    return {
        name: "Fireside",
        brand: "Diptyque",
        scentNotes: "cedar, vanilla, smoke",
        vesselStyle: "amber glass",
        burnStatus: "unlit",
        rating: null,
        view: "shelf",
        ...overrides,
    };
}
function makeCandle(overrides = {}) {
    return {
        id: "test-1",
        name: "Fireside",
        brand: "Diptyque",
        scentNotes: "cedar, vanilla, smoke",
        vesselStyle: "amber glass",
        burnStatus: "unlit",
        rating: null,
        view: "shelf",
        createdAt: "2024-01-15T10:00:00.000Z",
        ...overrides,
    };
}
// === validate() ===
describe("validate — required fields", () => {
    it("returns no errors for a valid input", () => {
        expect(hasErrors(validate(makeInput()))).toBe(false);
    });
    it("errors when name is empty string", () => {
        const e = validate(makeInput({ name: "" }));
        expect(e.name).toBeTruthy();
    });
    it("errors when name is whitespace only", () => {
        const e = validate(makeInput({ name: "   " }));
        expect(e.name).toBeTruthy();
    });
    it("accepts name at exactly NAME_MAX length", () => {
        const e = validate(makeInput({ name: "a".repeat(NAME_MAX) }));
        expect(e.name).toBeUndefined();
    });
    it("errors when name exceeds NAME_MAX by 1", () => {
        const e = validate(makeInput({ name: "a".repeat(NAME_MAX + 1) }));
        expect(e.name).toBeTruthy();
    });
    it("errors when brand is empty", () => {
        const e = validate(makeInput({ brand: "" }));
        expect(e.brand).toBeTruthy();
    });
    it("errors when brand is whitespace only", () => {
        const e = validate(makeInput({ brand: "  " }));
        expect(e.brand).toBeTruthy();
    });
    it("accepts brand at exactly BRAND_MAX length", () => {
        const e = validate(makeInput({ brand: "b".repeat(BRAND_MAX) }));
        expect(e.brand).toBeUndefined();
    });
    it("errors when brand exceeds BRAND_MAX by 1", () => {
        const e = validate(makeInput({ brand: "b".repeat(BRAND_MAX + 1) }));
        expect(e.brand).toBeTruthy();
    });
    it("errors when scentNotes is empty", () => {
        const e = validate(makeInput({ scentNotes: "" }));
        expect(e.scentNotes).toBeTruthy();
    });
    it("errors when scentNotes is whitespace only", () => {
        const e = validate(makeInput({ scentNotes: "   " }));
        expect(e.scentNotes).toBeTruthy();
    });
    it("accepts scentNotes at exactly SCENT_MAX length", () => {
        const e = validate(makeInput({ scentNotes: "c".repeat(SCENT_MAX) }));
        expect(e.scentNotes).toBeUndefined();
    });
    it("errors when scentNotes exceeds SCENT_MAX by 1", () => {
        const e = validate(makeInput({ scentNotes: "c".repeat(SCENT_MAX + 1) }));
        expect(e.scentNotes).toBeTruthy();
    });
    it("vessel is optional — no error when empty", () => {
        const e = validate(makeInput({ vesselStyle: "" }));
        expect(e.vesselStyle).toBeUndefined();
    });
    it("accepts vesselStyle at exactly VESSEL_MAX length", () => {
        const e = validate(makeInput({ vesselStyle: "v".repeat(VESSEL_MAX) }));
        expect(e.vesselStyle).toBeUndefined();
    });
    it("errors when vesselStyle exceeds VESSEL_MAX by 1", () => {
        const e = validate(makeInput({ vesselStyle: "v".repeat(VESSEL_MAX + 1) }));
        expect(e.vesselStyle).toBeTruthy();
    });
});
describe("validate — enum fields", () => {
    it("accepts all valid burn statuses", () => {
        BURN_STATUSES.forEach((s) => {
            expect(validate(makeInput({ burnStatus: s })).burnStatus).toBeUndefined();
        });
    });
    it("errors for invalid burnStatus", () => {
        expect(validate(makeInput({ burnStatus: "smoldering" })).burnStatus).toBeTruthy();
    });
    it("errors for empty burnStatus", () => {
        expect(validate(makeInput({ burnStatus: "" })).burnStatus).toBeTruthy();
    });
    it("accepts all valid views", () => {
        VIEWS.forEach((v) => {
            expect(validate(makeInput({ view: v })).view).toBeUndefined();
        });
    });
    it("errors for invalid view", () => {
        expect(validate(makeInput({ view: "collection" })).view).toBeTruthy();
    });
});
// === filterItems() ===
describe("filterItems", () => {
    const candles = [
        makeCandle({ id: "1", name: "Fireside", brand: "Diptyque", scentNotes: "cedar, vanilla", burnStatus: "unlit" }),
        makeCandle({ id: "2", name: "Ocean Breeze", brand: "Bath & Body", scentNotes: "sea salt, musk", burnStatus: "burning" }),
        makeCandle({ id: "3", name: "Vanilla Dreams", brand: "Diptyque", scentNotes: "vanilla, sandalwood", burnStatus: "finished" }),
    ];
    it("returns all items when query is empty and no status filter", () => {
        expect(filterItems(candles, "", "")).toHaveLength(3);
    });
    it("matches by name (case insensitive)", () => {
        const result = filterItems(candles, "fireside", "");
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("1");
    });
    it("matches by brand", () => {
        const result = filterItems(candles, "diptyque", "");
        expect(result).toHaveLength(2);
    });
    it("matches by scentNotes", () => {
        const result = filterItems(candles, "sea salt", "");
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("2");
    });
    it("filters by burn status", () => {
        const result = filterItems(candles, "", "burning");
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("2");
    });
    it("combines query and status filter", () => {
        const result = filterItems(candles, "diptyque", "finished");
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("3");
    });
    it("returns empty array when no matches", () => {
        expect(filterItems(candles, "unicorn", "")).toHaveLength(0);
    });
    it("returns empty array when status filter matches nothing", () => {
        const unlit = candles.filter(c => c.burnStatus === "unlit");
        expect(filterItems(unlit, "", "burning")).toHaveLength(0);
    });
    it("does not mutate the input array", () => {
        const copy = [...candles];
        filterItems(candles, "fireside", "unlit");
        expect(candles).toEqual(copy);
    });
    it("handles whitespace-padded query", () => {
        const result = filterItems(candles, "  vanilla  ", "");
        expect(result.length).toBeGreaterThan(0);
    });
});
// === formatDate() ===
describe("formatDate", () => {
    it("formats a valid ISO date string as DD/MM/YYYY", () => {
        expect(formatDate("2024-01-05T10:00:00.000Z")).toBe("05/01/2024");
    });
    it("pads single-digit days and months", () => {
        expect(formatDate("2024-03-07T00:00:00.000Z")).toMatch(/^0[0-9]\/0[0-9]\/\d{4}$/);
    });
    it("returns empty string for empty input", () => {
        expect(formatDate("")).toBe("");
    });
    it("returns empty string for invalid date string", () => {
        expect(formatDate("not-a-date")).toBe("");
    });
});
// === createCandle() ===
describe("createCandle", () => {
    it("creates a candle with the provided id and timestamp", () => {
        const c = createCandle(makeInput(), "my-id", "2024-06-01T00:00:00Z");
        expect(c.id).toBe("my-id");
        expect(c.createdAt).toBe("2024-06-01T00:00:00Z");
    });
    it("trims whitespace from text fields", () => {
        const c = createCandle(makeInput({ name: "  Bloom  ", brand: "  Nest  " }), "id", "now");
        expect(c.name).toBe("Bloom");
        expect(c.brand).toBe("Nest");
    });
    it("stores null rating when rating is empty string", () => {
        const c = createCandle(makeInput({ rating: "" }), "id", "now");
        expect(c.rating).toBeNull();
    });
    it("stores numeric rating", () => {
        const c = createCandle(makeInput({ rating: 4 }), "id", "now");
        expect(c.rating).toBe(4);
    });
    it("stores null rating for out-of-range value", () => {
        const c = createCandle(makeInput({ rating: 7 }), "id", "now");
        expect(c.rating).toBeNull();
    });
});
// === normalize() — malformed objects ===
describe("normalize — malformed objects", () => {
    it("returns null for null", () => {
        expect(normalize(null)).toBeNull();
    });
    it("returns null for a bare string", () => {
        expect(normalize("hello")).toBeNull();
    });
    it("returns null for a number", () => {
        expect(normalize(42)).toBeNull();
    });
    it("returns null for an array", () => {
        expect(normalize([])).toBeNull();
    });
    it("returns null for an empty object", () => {
        expect(normalize({})).toBeNull();
    });
    it("returns null for object missing required name", () => {
        expect(normalize({ brand: "B", scentNotes: "x", burnStatus: "unlit", view: "shelf", id: "1" })).toBeNull();
    });
    it("returns null for object with invalid burnStatus", () => {
        expect(normalize({ id: "1", name: "A", brand: "B", scentNotes: "x", burnStatus: "smoldering", view: "shelf" })).toBeNull();
    });
    it("returns null for object with invalid view", () => {
        expect(normalize({ id: "1", name: "A", brand: "B", scentNotes: "x", burnStatus: "unlit", view: "collection" })).toBeNull();
    });
    it("returns null when id is missing", () => {
        expect(normalize({ name: "A", brand: "B", scentNotes: "x", burnStatus: "unlit", view: "shelf" })).toBeNull();
    });
    it("returns a Candle for a fully valid raw object", () => {
        const raw = { id: "abc", name: "Glow", brand: "Nest", scentNotes: "rose", burnStatus: "unlit", view: "shelf", createdAt: "2024-01-01T00:00:00Z" };
        const result = normalize(raw);
        expect(result).not.toBeNull();
        expect(result?.id).toBe("abc");
        expect(result?.name).toBe("Glow");
    });
    it("returns null for object with name too long", () => {
        const raw = { id: "1", name: "a".repeat(NAME_MAX + 1), brand: "B", scentNotes: "x", burnStatus: "unlit", view: "shelf" };
        expect(normalize(raw)).toBeNull();
    });
    it("coerces missing optional vesselStyle to empty string (still valid)", () => {
        const raw = { id: "1", name: "A", brand: "B", scentNotes: "x", burnStatus: "unlit", view: "shelf" };
        const result = normalize(raw);
        expect(result).not.toBeNull();
        expect(result?.vesselStyle).toBe("");
    });
});
