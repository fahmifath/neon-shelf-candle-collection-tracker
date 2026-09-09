import { normalize } from "./domain.js";
const STORAGE_KEY = "neon-shelf-candles";
export function load() {
    let raw;
    try {
        raw = localStorage.getItem(STORAGE_KEY);
    }
    catch (e) {
        return { status: "error", message: "Could not read from storage." };
    }
    if (raw === null)
        return { status: "empty" };
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        return { status: "error", message: "Stored data is corrupted and could not be parsed." };
    }
    if (!Array.isArray(parsed)) {
        return { status: "error", message: "Stored data has an unexpected format." };
    }
    const valid = [];
    const skipped = [];
    parsed.forEach((item, idx) => {
        const c = normalize(item);
        if (c)
            valid.push(c);
        else
            skipped.push(idx);
    });
    if (valid.length === 0 && skipped.length > 0) {
        return { status: "error", message: `All ${skipped.length} stored candles were unreadable.` };
    }
    if (skipped.length > 0) {
        return { status: "partial", items: valid, message: `${skipped.length} candle(s) could not be loaded and were skipped.` };
    }
    if (valid.length === 0)
        return { status: "empty" };
    return { status: "ok", items: valid };
}
export function save(items) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        return { ok: true };
    }
    catch (e) {
        const msg = e instanceof DOMException && e.name === "QuotaExceededError"
            ? "Storage quota exceeded. Try removing some candles."
            : "Could not save to storage.";
        return { ok: false, message: msg };
    }
}
