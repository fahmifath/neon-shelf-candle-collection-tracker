import { validate, hasErrors, filterItems, formatDate, createCandle, VIEWS } from "./domain.js";
import { load, save } from "./storage.js";
let items = [];
let currentView = "shelf";
let searchQuery = "";
let statusFilter = "";
let editingId = null;
let currentRating = null;
let armedDeleteId = null;
let armedDeleteTimer = null;
function announce(msg) {
    const el = document.getElementById("announce");
    el.textContent = "";
    requestAnimationFrame(() => { el.textContent = msg; });
}
function reportFailure(message) {
    const banner = document.getElementById("storage-banner");
    banner.hidden = false;
    requestAnimationFrame(() => { banner.textContent = message; });
    announce(`Error: ${message}`);
}
function clearBanner() {
    const banner = document.getElementById("storage-banner");
    banner.hidden = true;
    banner.textContent = "";
}
function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className)
        e.className = className;
    if (text !== undefined)
        e.textContent = text;
    return e;
}
function renderStars(rating) {
    const r = rating ?? 0;
    return "★".repeat(r) + "☆".repeat(5 - r);
}
function statusLabel(s) {
    if (s === "unlit")
        return "🕯 Unlit";
    if (s === "burning")
        return "🔥 Burning";
    return "✦ Finished";
}
function createCard(candle) {
    const isArmed = armedDeleteId === candle.id;
    const card = el("article", `candle-card status-${candle.burnStatus}${candle.burnStatus === "finished" ? " finished" : ""}`);
    card.setAttribute("data-id", candle.id);
    const statusBadge = el("span", `status-badge status-badge--${candle.burnStatus}`, statusLabel(candle.burnStatus));
    const nameEl = el("h3", "card-name", candle.name);
    const brandEl = el("p", "card-brand", candle.brand);
    const scentEl = el("p", "card-scent");
    scentEl.setAttribute("aria-label", `Scent notes: ${candle.scentNotes}`);
    const scentLabel = el("span", "card-field-label", "Scent: ");
    const scentVal = el("span", "card-field-value", candle.scentNotes);
    scentEl.appendChild(scentLabel);
    scentEl.appendChild(scentVal);
    const vesselEl = el("p", "card-vessel");
    vesselEl.setAttribute("aria-label", `Vessel: ${candle.vesselStyle || "—"}`);
    const vesselLabel = el("span", "card-field-label", "Vessel: ");
    const vesselVal = el("span", "card-field-value", candle.vesselStyle || "—");
    vesselEl.appendChild(vesselLabel);
    vesselEl.appendChild(vesselVal);
    const starsEl = el("p", "card-rating");
    starsEl.setAttribute("aria-label", candle.rating ? `Rating: ${candle.rating} out of 5` : "Unrated");
    starsEl.textContent = renderStars(candle.rating);
    const dateEl = el("p", "card-date", `Added ${formatDate(candle.createdAt)}`);
    const actions = el("div", "card-actions");
    if (candle.view === "wishlist") {
        const moveBtn = document.createElement("button");
        moveBtn.type = "button";
        moveBtn.className = "btn btn-move";
        moveBtn.textContent = "Move to Shelf";
        moveBtn.setAttribute("aria-label", `Move "${candle.name}" to shelf`);
        moveBtn.dataset.action = "move";
        moveBtn.dataset.id = candle.id;
        actions.appendChild(moveBtn);
    }
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn btn-edit";
    editBtn.textContent = "Edit";
    editBtn.setAttribute("aria-label", `Edit "${candle.name}"`);
    editBtn.dataset.action = "edit";
    editBtn.dataset.id = candle.id;
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = `btn btn-delete${isArmed ? " armed" : ""}`;
    if (isArmed) {
        deleteBtn.textContent = "Confirm delete";
        deleteBtn.setAttribute("aria-label", `Confirm delete "${candle.name}"`);
    }
    else {
        deleteBtn.textContent = "Delete";
        deleteBtn.setAttribute("aria-label", `Delete "${candle.name}"`);
    }
    deleteBtn.dataset.action = "delete";
    deleteBtn.dataset.id = candle.id;
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    card.appendChild(statusBadge);
    card.appendChild(nameEl);
    card.appendChild(brandEl);
    card.appendChild(scentEl);
    card.appendChild(vesselEl);
    card.appendChild(starsEl);
    card.appendChild(dateEl);
    card.appendChild(actions);
    return card;
}
function updateStats() {
    const owned = items.filter(c => c.view === "shelf").length;
    const burned = items.filter(c => c.burnStatus === "finished").length;
    const wished = items.filter(c => c.view === "wishlist").length;
    document.getElementById("stat-owned").textContent = String(owned);
    document.getElementById("stat-burned").textContent = String(burned);
    document.getElementById("stat-wishlist").textContent = String(wished);
}
function render() {
    armedDeleteId = armedDeleteId;
    const grid = document.getElementById("candle-grid");
    const emptyCollection = document.getElementById("empty-collection");
    const emptyFilter = document.getElementById("empty-filter");
    grid.innerHTML = "";
    emptyCollection.hidden = true;
    emptyFilter.hidden = true;
    const viewItems = items.filter(c => c.view === currentView);
    const filtered = filterItems(viewItems, searchQuery, statusFilter);
    updateStats();
    if (viewItems.length === 0) {
        emptyCollection.hidden = false;
        const body = document.getElementById("empty-collection-body");
        body.textContent = currentView === "shelf"
            ? "Add your first candle to start building your collection."
            : "Add candles to your wish list to track what you want to buy.";
        return;
    }
    if (filtered.length === 0) {
        emptyFilter.hidden = false;
        const body = document.getElementById("empty-filter-body");
        const parts = [];
        if (searchQuery)
            parts.push(`"${searchQuery}"`);
        if (statusFilter)
            parts.push(`status "${statusFilter}"`);
        body.textContent = `No candles match ${parts.join(" and ")}.`;
        announce(`No candles found for ${parts.join(" and ")}.`);
        return;
    }
    filtered.forEach(candle => {
        grid.appendChild(createCard(candle));
    });
}
function clearErrors() {
    ["name", "brand", "scent", "vessel", "status"].forEach(field => {
        const errEl = document.getElementById(`err-${field}`);
        errEl.hidden = true;
        errEl.textContent = "";
        const inputId = field === "scent" ? "field-scent"
            : field === "status" ? "field-status"
                : `field-${field}`;
        const input = document.getElementById(inputId);
        if (input) {
            input.removeAttribute("aria-invalid");
        }
    });
}
function showFieldError(field, message) {
    const errId = `err-${field === "scentNotes" ? "scent" : field === "vesselStyle" ? "vessel" : field === "burnStatus" ? "status" : field}`;
    const inputId = field === "scentNotes" ? "field-scent"
        : field === "vesselStyle" ? "field-vessel"
            : field === "burnStatus" ? "field-status"
                : `field-${field}`;
    const errEl = document.getElementById(errId);
    const inputEl = document.getElementById(inputId);
    if (errEl) {
        errEl.hidden = false;
        errEl.textContent = message;
    }
    if (inputEl) {
        inputEl.setAttribute("aria-invalid", "true");
    }
}
function getFormInput() {
    const form = document.getElementById("candle-form");
    return {
        name: form.querySelector("#field-name").value,
        brand: form.querySelector("#field-brand").value,
        scentNotes: form.querySelector("#field-scent").value,
        vesselStyle: form.querySelector("#field-vessel").value,
        burnStatus: form.querySelector("#field-status").value,
        view: form.querySelector("#field-view").value,
        rating: currentRating,
    };
}
function resetForm() {
    document.getElementById("candle-form").reset();
    currentRating = null;
    editingId = null;
    updateStarUI(null);
    clearErrors();
    document.getElementById("btn-cancel-edit").hidden = true;
    document.getElementById("btn-add").textContent = "Add Candle";
}
function populateFormForEdit(candle) {
    document.getElementById("field-name").value = candle.name;
    document.getElementById("field-brand").value = candle.brand;
    document.getElementById("field-scent").value = candle.scentNotes;
    document.getElementById("field-vessel").value = candle.vesselStyle;
    document.getElementById("field-status").value = candle.burnStatus;
    document.getElementById("field-view").value = candle.view;
    currentRating = candle.rating;
    updateStarUI(candle.rating);
    editingId = candle.id;
    document.getElementById("btn-cancel-edit").hidden = false;
    document.getElementById("btn-add").textContent = "Save Changes";
    document.getElementById("field-name").focus();
}
function updateStarUI(rating) {
    const stars = document.querySelectorAll(".star-btn");
    stars.forEach((btn, idx) => {
        const active = rating !== null && idx < rating;
        btn.classList.toggle("active", active);
        btn.setAttribute("aria-pressed", String(active));
    });
    document.getElementById("field-rating").value = rating !== null ? String(rating) : "";
}
function armDelete(id) {
    if (armedDeleteTimer)
        clearTimeout(armedDeleteTimer);
    armedDeleteId = id;
    render();
    armedDeleteTimer = setTimeout(() => {
        armedDeleteId = null;
        armedDeleteTimer = null;
        render();
    }, 3000);
}
function disarmDelete() {
    if (armedDeleteTimer) {
        clearTimeout(armedDeleteTimer);
        armedDeleteTimer = null;
    }
    armedDeleteId = null;
    render();
}
function handleFormSubmit(e) {
    e.preventDefault();
    clearErrors();
    clearBanner();
    const input = getFormInput();
    const errors = validate(input);
    if (hasErrors(errors)) {
        const fieldMap = {
            name: "name", brand: "brand", scentNotes: "scent",
            vesselStyle: "vessel", burnStatus: "status"
        };
        let firstField = null;
        Object.entries(errors).forEach(([field, msg]) => {
            if (msg) {
                showFieldError(field, msg);
                if (!firstField)
                    firstField = fieldMap[field] ?? field;
            }
        });
        announce(`Form has errors: ${Object.values(errors).filter(Boolean).join(" ")}`);
        if (firstField)
            document.getElementById(`field-${firstField}`)?.focus();
        return;
    }
    if (editingId) {
        const idx = items.findIndex(c => c.id === editingId);
        if (idx === -1) {
            reportFailure("Could not find candle to edit.");
            return;
        }
        const updated = createCandle(input, editingId, items[idx].createdAt);
        const next = items.map((c, i) => i === idx ? updated : c);
        const result = save(next);
        if (!result.ok) {
            reportFailure(result.message);
            return;
        }
        items = next;
        announce(`"${updated.name}" updated.`);
        resetForm();
    }
    else {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const now = new Date().toISOString();
        const newCandle = createCandle(input, id, now);
        const next = [...items, newCandle];
        const result = save(next);
        if (!result.ok) {
            reportFailure(result.message);
            return;
        }
        items = next;
        announce(`"${newCandle.name}" added to ${newCandle.view === "shelf" ? "your shelf" : "your wish list"}.`);
        resetForm();
    }
    render();
}
function handleGridClick(e) {
    const target = e.target;
    const btn = target.closest("[data-action]");
    if (!btn)
        return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (!id)
        return;
    clearBanner();
    if (action === "delete") {
        if (armedDeleteId === id) {
            if (armedDeleteTimer)
                clearTimeout(armedDeleteTimer);
            armedDeleteTimer = null;
            armedDeleteId = null;
            const candle = items.find(c => c.id === id);
            const next = items.filter(c => c.id !== id);
            const result = save(next);
            if (!result.ok) {
                reportFailure(result.message);
                render();
                return;
            }
            items = next;
            const name = candle?.name ?? "Candle";
            announce(`"${name}" deleted.`);
            if (editingId === id)
                resetForm();
            render();
        }
        else {
            disarmDelete();
            armDelete(id);
        }
    }
    else if (action === "edit") {
        const candle = items.find(c => c.id === id);
        if (candle) {
            disarmDelete();
            populateFormForEdit(candle);
        }
    }
    else if (action === "move") {
        const idx = items.findIndex(c => c.id === id);
        if (idx === -1)
            return;
        const moved = { ...items[idx], view: "shelf" };
        const next = items.map((c, i) => i === idx ? moved : c);
        const result = save(next);
        if (!result.ok) {
            reportFailure(result.message);
            return;
        }
        items = next;
        announce(`"${moved.name}" moved to your shelf.`);
        render();
    }
}
function handleStarClick(e) {
    const btn = e.target.closest(".star-btn");
    if (!btn)
        return;
    const value = Number(btn.dataset.value);
    if (currentRating === value) {
        currentRating = null;
        updateStarUI(null);
    }
    else {
        currentRating = value;
        updateStarUI(value);
    }
}
function handleViewToggle(e) {
    const btn = e.target.closest("[data-view]");
    if (!btn)
        return;
    const view = btn.dataset.view;
    if (!VIEWS.includes(view))
        return;
    currentView = view;
    disarmDelete();
    document.querySelectorAll(".toggle-btn").forEach(b => {
        const active = b.dataset.view === view;
        b.classList.toggle("active", active);
        b.setAttribute("aria-pressed", String(active));
    });
    render();
}
function handleSearchInput(e) {
    searchQuery = e.target.value;
    disarmDelete();
    render();
}
function handleStatusFilter(e) {
    statusFilter = e.target.value;
    disarmDelete();
    render();
}
function handleClearFilters() {
    document.getElementById("search-input").value = "";
    document.getElementById("filter-status").value = "";
    searchQuery = "";
    statusFilter = "";
    render();
}
function handleEscapeKey(e) {
    if (e.key === "Escape" && armedDeleteId) {
        disarmDelete();
    }
}
function handleOutsideClick(e) {
    if (!armedDeleteId)
        return;
    const target = e.target;
    if (!target.closest("[data-action='delete']")) {
        disarmDelete();
    }
}
function init() {
    const result = load();
    switch (result.status) {
        case "ok":
            items = result.items;
            break;
        case "empty":
            items = [];
            break;
        case "partial":
            items = result.items;
            reportFailure(result.message);
            break;
        case "error":
            items = [];
            reportFailure(result.message);
            break;
    }
    render();
    document.getElementById("candle-form").addEventListener("submit", handleFormSubmit);
    document.getElementById("candle-grid").addEventListener("click", handleGridClick);
    document.getElementById("rating-input-group").addEventListener("click", handleStarClick);
    document.querySelector(".view-toggle").addEventListener("click", handleViewToggle);
    document.getElementById("search-input").addEventListener("input", handleSearchInput);
    document.getElementById("filter-status").addEventListener("change", handleStatusFilter);
    document.getElementById("btn-clear-filters").addEventListener("click", handleClearFilters);
    document.getElementById("btn-cancel-edit").addEventListener("click", resetForm);
    document.addEventListener("keydown", handleEscapeKey);
    document.addEventListener("click", handleOutsideClick);
}
init();
