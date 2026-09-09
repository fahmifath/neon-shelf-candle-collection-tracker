import { describe, it, expect } from "vitest";
import {
  validate, hasErrors, filterItems, formatDate, createCandle, normalize,
  BURN_STATUSES, VIEWS,
  NAME_MAX, BRAND_MAX, SCENT_MAX, VESSEL_MAX,
  type Candle, type CandleInput,
} from "../src/domain";
function makeInput(overrides: Partial<CandleInput> = {}): CandleInput {
  return { name: "Fireside", brand: "Diptyque", scentNotes: "cedar, vanilla, smoke", vesselStyle: "amber glass", burnStatus: "unlit", rating: null, view: "shelf", ...overrides };
}
function makeCandle(overrides: Partial<Candle> = {}): Candle {
  return { id: "test-1", name: "Fireside", brand: "Diptyque", scentNotes: "cedar, vanilla, smoke", vesselStyle: "amber glass", burnStatus: "unlit", rating: null, view: "shelf", createdAt: "2024-01-15T10:00:00.000Z", ...overrides };
}
describe("validate — required fields", () => {
  it("returns no errors for valid input", () => { expect(hasErrors(validate(makeInput()))).toBe(false); });
  it("errors when name is empty", () => { expect(validate(makeInput({ name: "" })).name).toBeTruthy(); });
  it("errors when name is whitespace only", () => { expect(validate(makeInput({ name: "   " })).name).toBeTruthy(); });
  it("accepts name at exactly NAME_MAX", () => { expect(validate(makeInput({ name: "a".repeat(NAME_MAX) })).name).toBeUndefined(); });
  it("errors when name exceeds NAME_MAX by 1", () => { expect(validate(makeInput({ name: "a".repeat(NAME_MAX + 1) })).name).toBeTruthy(); });
  it("errors when brand is empty", () => { expect(validate(makeInput({ brand: "" })).brand).toBeTruthy(); });
  it("errors when brand is whitespace only", () => { expect(validate(makeInput({ brand: "  " })).brand).toBeTruthy(); });
  it("accepts brand at exactly BRAND_MAX", () => { expect(validate(makeInput({ brand: "b".repeat(BRAND_MAX) })).brand).toBeUndefined(); });
  it("errors when brand exceeds BRAND_MAX by 1", () => { expect(validate(makeInput({ brand: "b".repeat(BRAND_MAX + 1) })).brand).toBeTruthy(); });
  it("errors when scentNotes is empty", () => { expect(validate(makeInput({ scentNotes: "" })).scentNotes).toBeTruthy(); });
  it("errors when scentNotes is whitespace only", () => { expect(validate(makeInput({ scentNotes: "   " })).scentNotes).toBeTruthy(); });
  it("accepts scentNotes at exactly SCENT_MAX", () => { expect(validate(makeInput({ scentNotes: "c".repeat(SCENT_MAX) })).scentNotes).toBeUndefined(); });
  it("errors when scentNotes exceeds SCENT_MAX by 1", () => { expect(validate(makeInput({ scentNotes: "c".repeat(SCENT_MAX + 1) })).scentNotes).toBeTruthy(); });
  it("vessel is optional — no error when empty", () => { expect(validate(makeInput({ vesselStyle: "" })).vesselStyle).toBeUndefined(); });
  it("accepts vesselStyle at exactly VESSEL_MAX", () => { expect(validate(makeInput({ vesselStyle: "v".repeat(VESSEL_MAX) })).vesselStyle).toBeUndefined(); });
  it("errors when vesselStyle exceeds VESSEL_MAX by 1", () => { expect(validate(makeInput({ vesselStyle: "v".repeat(VESSEL_MAX + 1) })).vesselStyle).toBeTruthy(); });
});
describe("validate — enum fields", () => {
  it("accepts all valid burn statuses", () => { BURN_STATUSES.forEach(s => { expect(validate(makeInput({ burnStatus: s })).burnStatus).toBeUndefined(); }); });
  it("errors for invalid burnStatus", () => { expect(validate(makeInput({ burnStatus: "smoldering" })).burnStatus).toBeTruthy(); });
  it("errors for empty burnStatus", () => { expect(validate(makeInput({ burnStatus: "" })).burnStatus).toBeTruthy(); });
  it("accepts all valid views", () => { VIEWS.forEach(v => { expect(validate(makeInput({ view: v })).view).toBeUndefined(); }); });
  it("errors for invalid view", () => { expect(validate(makeInput({ view: "collection" })).view).toBeTruthy(); });
});
describe("filterItems", () => {
  const candles: Candle[] = [
    makeCandle({ id: "1", name: "Fireside", brand: "Diptyque", scentNotes: "cedar, vanilla", burnStatus: "unlit" }),
    makeCandle({ id: "2", name: "Ocean Breeze", brand: "Bath & Body", scentNotes: "sea salt, musk", burnStatus: "burning" }),
    makeCandle({ id: "3", name: "Vanilla Dreams", brand: "Diptyque", scentNotes: "vanilla, sandalwood", burnStatus: "finished" }),
  ];
  it("returns all when query empty, no status filter", () => { expect(filterItems(candles, "", "")).toHaveLength(3); });
  it("matches by name (case insensitive)", () => { const r = filterItems(candles, "fireside", ""); expect(r).toHaveLength(1); expect(r[0].id).toBe("1"); });
  it("matches by brand", () => { expect(filterItems(candles, "diptyque", "")).toHaveLength(2); });
  it("matches by scentNotes", () => { const r = filterItems(candles, "sea salt", ""); expect(r).toHaveLength(1); expect(r[0].id).toBe("2"); });
  it("filters by burn status", () => { const r = filterItems(candles, "", "burning"); expect(r).toHaveLength(1); expect(r[0].id).toBe("2"); });
  it("combines query and status filter", () => { const r = filterItems(candles, "diptyque", "finished"); expect(r).toHaveLength(1); expect(r[0].id).toBe("3"); });
  it("returns empty array when no matches", () => { expect(filterItems(candles, "unicorn", "")).toHaveLength(0); });
  it("returns empty when status filter matches nothing", () => { expect(filterItems(candles.filter(c => c.burnStatus === "unlit"), "", "burning")).toHaveLength(0); });
  it("does not mutate the input array", () => { const copy = [...candles]; filterItems(candles, "fireside", "unlit"); expect(candles).toEqual(copy); });
  it("handles whitespace-padded query", () => { expect(filterItems(candles, "  vanilla  ", "").length).toBeGreaterThan(0); });
});
describe("formatDate", () => {
  it("formats valid ISO date as DD/MM/YYYY", () => { expect(formatDate("2024-01-05T10:00:00.000Z")).toBe("05/01/2024"); });
  it("pads single-digit days and months", () => { expect(formatDate("2024-03-07T00:00:00.000Z")).toMatch(/^0\d\/0\d\/\d{4}$/); });
  it("returns empty string for empty input", () => { expect(formatDate("")).toBe(""); });
  it("returns empty string for invalid date", () => { expect(formatDate("not-a-date")).toBe(""); });
});
describe("createCandle", () => {
  it("uses provided id and timestamp", () => { const c = createCandle(makeInput(), "my-id", "2024-06-01T00:00:00Z"); expect(c.id).toBe("my-id"); expect(c.createdAt).toBe("2024-06-01T00:00:00Z"); });
  it("trims whitespace from text fields", () => { const c = createCandle(makeInput({ name: "  Bloom  ", brand: "  Nest  " }), "id", "now"); expect(c.name).toBe("Bloom"); expect(c.brand).toBe("Nest"); });
  it("stores null rating when rating is empty string", () => { expect(createCandle(makeInput({ rating: "" }), "id", "now").rating).toBeNull(); });
  it("stores numeric rating", () => { expect(createCandle(makeInput({ rating: 4 }), "id", "now").rating).toBe(4); });
  it("stores null rating for out-of-range value", () => { expect(createCandle(makeInput({ rating: 7 }), "id", "now").rating).toBeNull(); });
});
describe("normalize — malformed objects", () => {
  it("returns null for null", () => { expect(normalize(null)).toBeNull(); });
  it("returns null for a bare string", () => { expect(normalize("hello")).toBeNull(); });
  it("returns null for a number", () => { expect(normalize(42)).toBeNull(); });
  it("returns null for an array", () => { expect(normalize([])).toBeNull(); });
  it("returns null for an empty object", () => { expect(normalize({})).toBeNull(); });
  it("returns null for object missing required name", () => { expect(normalize({ brand: "B", scentNotes: "x", burnStatus: "unlit", view: "shelf", id: "1" })).toBeNull(); });
  it("returns null for object with invalid burnStatus", () => { expect(normalize({ id: "1", name: "A", brand: "B", scentNotes: "x", burnStatus: "smoldering", view: "shelf" })).toBeNull(); });
  it("returns null for object with invalid view", () => { expect(normalize({ id: "1", name: "A", brand: "B", scentNotes: "x", burnStatus: "unlit", view: "collection" })).toBeNull(); });
  it("returns null when id is missing", () => { expect(normalize({ name: "A", brand: "B", scentNotes: "x", burnStatus: "unlit", view: "shelf" })).toBeNull(); });
  it("returns a Candle for a fully valid raw object", () => { const r = normalize({ id: "abc", name: "Glow", brand: "Nest", scentNotes: "rose", burnStatus: "unlit", view: "shelf", createdAt: "2024-01-01T00:00:00Z" }); expect(r).not.toBeNull(); expect(r?.id).toBe("abc"); });
  it("returns null for object with name too long", () => { expect(normalize({ id: "1", name: "a".repeat(NAME_MAX + 1), brand: "B", scentNotes: "x", burnStatus: "unlit", view: "shelf" })).toBeNull(); });
  it("coerces missing vesselStyle to empty string", () => { const r = normalize({ id: "1", name: "A", brand: "B", scentNotes: "x", burnStatus: "unlit", view: "shelf" }); expect(r).not.toBeNull(); expect(r?.vesselStyle).toBe(""); });
});
