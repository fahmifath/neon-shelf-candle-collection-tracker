export const BURN_STATUSES = ["unlit", "burning", "finished"];
export const VIEWS = ["shelf", "wishlist"];
export const NAME_MAX = 80;
export const BRAND_MAX = 60;
export const SCENT_MAX = 120;
export const VESSEL_MAX = 80;
export function validate(input) {
    const errors = {};
    const name = (input.name ?? "").trim();
    if (!name) {
        errors.name = "Name is required.";
    }
    else if (name.length > NAME_MAX) {
        errors.name = `Name must be ${NAME_MAX} characters or fewer.`;
    }
    const brand = (input.brand ?? "").trim();
    if (!brand) {
        errors.brand = "Brand is required.";
    }
    else if (brand.length > BRAND_MAX) {
        errors.brand = `Brand must be ${BRAND_MAX} characters or fewer.`;
    }
    const scent = (input.scentNotes ?? "").trim();
    if (!scent) {
        errors.scentNotes = "Scent notes are required.";
    }
    else if (scent.length > SCENT_MAX) {
        errors.scentNotes = `Scent notes must be ${SCENT_MAX} characters or fewer.`;
    }
    const vessel = (input.vesselStyle ?? "").trim();
    if (vessel.length > VESSEL_MAX) {
        errors.vesselStyle = `Vessel style must be ${VESSEL_MAX} characters or fewer.`;
    }
    if (!BURN_STATUSES.includes(input.burnStatus)) {
        errors.burnStatus = "Invalid burn status.";
    }
    if (!VIEWS.includes(input.view)) {
        errors.view = "Invalid view.";
    }
    return errors;
}
export function hasErrors(errors) {
    return Object.keys(errors).length > 0;
}
export function filterItems(items, query, statusFilter) {
    const q = query.trim().toLowerCase();
    return items.filter((c) => {
        if (statusFilter && c.burnStatus !== statusFilter)
            return false;
        if (!q)
            return true;
        return (c.name.toLowerCase().includes(q) ||
            c.brand.toLowerCase().includes(q) ||
            c.scentNotes.toLowerCase().includes(q) ||
            c.vesselStyle.toLowerCase().includes(q));
    });
}
export function formatDate(iso) {
    if (!iso)
        return "";
    const d = new Date(iso);
    if (isNaN(d.getTime()))
        return "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}
export function createCandle(input, id, now) {
    const rating = parseRating(input.rating);
    return {
        id,
        name: (input.name ?? "").trim(),
        brand: (input.brand ?? "").trim(),
        scentNotes: (input.scentNotes ?? "").trim(),
        vesselStyle: (input.vesselStyle ?? "").trim(),
        burnStatus: input.burnStatus,
        rating,
        view: input.view,
        createdAt: now,
    };
}
function parseRating(raw) {
    if (raw === null || raw === undefined || raw === "")
        return null;
    const n = typeof raw === "number" ? raw : Number(raw);
    if (!isFinite(n) || n < 1 || n > 5)
        return null;
    return Math.round(n);
}
export function normalize(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
        return null;
    const r = raw;
    const input = {
        name: typeof r.name === "string" ? r.name : "",
        brand: typeof r.brand === "string" ? r.brand : "",
        scentNotes: typeof r.scentNotes === "string" ? r.scentNotes : "",
        vesselStyle: typeof r.vesselStyle === "string" ? r.vesselStyle : "",
        burnStatus: typeof r.burnStatus === "string" ? r.burnStatus : "",
        rating: r.rating !== undefined ? r.rating : null,
        view: typeof r.view === "string" ? r.view : "",
    };
    const errors = validate(input);
    if (hasErrors(errors))
        return null;
    const id = typeof r.id === "string" && r.id ? r.id : null;
    if (!id)
        return null;
    const createdAt = typeof r.createdAt === "string" ? r.createdAt : new Date(0).toISOString();
    return createCandle(input, id, createdAt);
}
