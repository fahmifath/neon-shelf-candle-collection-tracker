import {validate,hasErrors,filterItems,formatDate,createCandle,VIEWS,type Candle,type CandleInput,type BurnStatus,type View} from "./domain.js";
import {load,save} from "./storage.js";

let items: Candle[] = [];
let currentView: View = "shelf";
let searchQuery = "";
let statusFilter = "";
let editingId: string | null = null;
let currentRating: number | null = null;
let armedDeleteId: string | null = null;
let armedDeleteTimer: ReturnType<typeof setTimeout> | null = null;

const $ = (id: string) => document.getElementById(id)!;

function announce(msg: string): void {
  const el = $("announce");
  el.textContent = "";
  requestAnimationFrame(() => { el.textContent = msg; });
}

function reportFailure(message: string): void {
  const banner = $("storage-banner");
  banner.hidden = false;
  requestAnimationFrame(() => { banner.textContent = message; });
  announce(`Error: ${message}`);
}

function clearBanner(): void {
  const b = $("storage-banner");
  b.hidden = true;
  b.textContent = "";
}

function mk(tag: string, cls?: string, txt?: string): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt !== undefined) e.textContent = txt;
  return e;
}

function mkBtn(cls: string, txt: string, action: string, id: string, label: string): HTMLButtonElement {
  const b = mk("button", `btn ${cls}`) as HTMLButtonElement;
  b.type = "button";
  b.textContent = txt;
  b.setAttribute("aria-label", label);
  b.dataset.action = action;
  b.dataset.id = id;
  return b;
}

function statusLabel(s: BurnStatus): string {
  return s === "unlit" ? "🕯 Unlit" : s === "burning" ? "🔥 Burning" : "✦ Finished";
}

function renderStars(r: number | null): string {
  const n = r ?? 0;
  return "★".repeat(n) + "☆".repeat(5 - n);
}

function labeledField(labelTxt: string, valTxt: string, ariaLabel: string): HTMLElement {
  const p = mk("p", "card-field");
  p.setAttribute("aria-label", ariaLabel);
  p.appendChild(mk("span", "card-field-label", labelTxt));
  p.appendChild(mk("span", "card-field-value", valTxt));
  return p;
}

function createCard(c: Candle): HTMLElement {
  const armed = armedDeleteId === c.id;
  const card = mk("article", `candle-card status-${c.burnStatus}${c.burnStatus === "finished" ? " finished" : ""}`);
  card.dataset.id = c.id;
  card.appendChild(mk("span", `status-badge status-badge--${c.burnStatus}`, statusLabel(c.burnStatus)));
  card.appendChild(mk("h3", "card-name", c.name));
  card.appendChild(mk("p", "card-brand", c.brand));
  card.appendChild(labeledField("Scent: ", c.scentNotes, `Scent notes: ${c.scentNotes}`));
  card.appendChild(labeledField("Vessel: ", c.vesselStyle || "—", `Vessel: ${c.vesselStyle || "—"}`));
  const stars = mk("p", "card-rating", renderStars(c.rating));
  stars.setAttribute("aria-label", c.rating ? `Rating: ${c.rating} of 5` : "Unrated");
  card.appendChild(stars);
  card.appendChild(mk("p", "card-date", `Added ${formatDate(c.createdAt)}`));
  const actions = mk("div", "card-actions");
  if (c.view === "wishlist") actions.appendChild(mkBtn("btn-move", "Move to Shelf", "move", c.id, `Move "${c.name}" to shelf`));
  actions.appendChild(mkBtn("btn-edit", "Edit", "edit", c.id, `Edit "${c.name}"`));
  const delBtn = mkBtn(`btn-delete${armed ? " armed" : ""}`, armed ? "Confirm delete" : "Delete", "delete", c.id, armed ? `Confirm delete "${c.name}"` : `Delete "${c.name}"`);
  actions.appendChild(delBtn);
  card.appendChild(actions);
  return card;
}

function updateStats(): void {
  $("stat-owned").textContent = String(items.filter(c => c.view === "shelf").length);
  $("stat-burned").textContent = String(items.filter(c => c.burnStatus === "finished").length);
  $("stat-wishlist").textContent = String(items.filter(c => c.view === "wishlist").length);
}

function render(): void {
  const grid = $("candle-grid");
  const emptyC = $("empty-collection");
  const emptyF = $("empty-filter");
  grid.innerHTML = "";
  emptyC.hidden = true;
  emptyF.hidden = true;
  updateStats();
  const viewItems = items.filter(c => c.view === currentView);
  const filtered = filterItems(viewItems, searchQuery, statusFilter);
  if (viewItems.length === 0) {
    emptyC.hidden = false;
    $("empty-collection-body").textContent = currentView === "shelf"
      ? "Add your first candle to start building your collection."
      : "Add candles to your wish list to track what you want to buy.";
    return;
  }
  if (filtered.length === 0) {
    emptyF.hidden = false;
    const parts: string[] = [];
    if (searchQuery) parts.push(`"${searchQuery}"`);
    if (statusFilter) parts.push(`status "${statusFilter}"`);
    const desc = parts.join(" and ");
    $("empty-filter-body").textContent = `No candles match ${desc}.`;
    announce(`No candles found for ${desc}.`);
    return;
  }
  filtered.forEach(c => grid.appendChild(createCard(c)));
}

function clearErrors(): void {
  ["name","brand","scent","vessel","status"].forEach(f => {
    const errEl = $(`err-${f}`);
    errEl.hidden = true;
    errEl.textContent = "";
    const iid = f === "scent" ? "field-scent" : f === "status" ? "field-status" : `field-${f}`;
    document.getElementById(iid)?.removeAttribute("aria-invalid");
  });
}

const FIELD_MAP: Record<string, [string, string]> = {
  name: ["err-name","field-name"], brand: ["err-brand","field-brand"],
  scentNotes: ["err-scent","field-scent"], vesselStyle: ["err-vessel","field-vessel"],
  burnStatus: ["err-status","field-status"]
};

function showFieldError(field: string, message: string): void {
  const [errId, inputId] = FIELD_MAP[field] ?? [`err-${field}`, `field-${field}`];
  const errEl = document.getElementById(errId);
  if (errEl) { errEl.hidden = false; errEl.textContent = message; }
  document.getElementById(inputId)?.setAttribute("aria-invalid", "true");
}

function getFormInput(): CandleInput {
  return {
    name: ($("field-name") as HTMLInputElement).value,
    brand: ($("field-brand") as HTMLInputElement).value,
    scentNotes: ($("field-scent") as HTMLInputElement).value,
    vesselStyle: ($("field-vessel") as HTMLInputElement).value,
    burnStatus: ($("field-status") as HTMLSelectElement).value,
    view: ($("field-view") as HTMLSelectElement).value,
    rating: currentRating,
  };
}

function updateStarUI(rating: number | null): void {
  document.querySelectorAll<HTMLButtonElement>(".star-btn").forEach((btn, idx) => {
    const active = rating !== null && idx < rating;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
  });
  ($("field-rating") as HTMLInputElement).value = rating !== null ? String(rating) : "";
}

function resetForm(): void {
  ($("candle-form") as HTMLFormElement).reset();
  currentRating = null;
  editingId = null;
  updateStarUI(null);
  clearErrors();
  $("btn-cancel-edit").hidden = true;
  $("btn-add").textContent = "Add Candle";
}

function populateFormForEdit(c: Candle): void {
  ($("field-name") as HTMLInputElement).value = c.name;
  ($("field-brand") as HTMLInputElement).value = c.brand;
  ($("field-scent") as HTMLInputElement).value = c.scentNotes;
  ($("field-vessel") as HTMLInputElement).value = c.vesselStyle;
  ($("field-status") as HTMLSelectElement).value = c.burnStatus;
  ($("field-view") as HTMLSelectElement).value = c.view;
  currentRating = c.rating;
  updateStarUI(c.rating);
  editingId = c.id;
  $("btn-cancel-edit").hidden = false;
  $("btn-add").textContent = "Save Changes";
  $("field-name").focus();
}

function armDelete(id: string): void {
  if (armedDeleteTimer) clearTimeout(armedDeleteTimer);
  armedDeleteId = id;
  render();
  armedDeleteTimer = setTimeout(() => { armedDeleteId = null; armedDeleteTimer = null; render(); }, 3000);
}

function disarmDelete(): void {
  if (armedDeleteTimer) { clearTimeout(armedDeleteTimer); armedDeleteTimer = null; }
  armedDeleteId = null;
  render();
}

function handleFormSubmit(e: Event): void {
  e.preventDefault();
  clearErrors();
  clearBanner();
  const input = getFormInput();
  const errors = validate(input);
  if (hasErrors(errors)) {
    const fieldKeys: Record<string, string> = {name:"name",brand:"brand",scentNotes:"scent",vesselStyle:"vessel",burnStatus:"status"};
    let first: string | null = null;
    Object.entries(errors).forEach(([f, msg]) => {
      if (msg) { showFieldError(f, msg); if (!first) first = fieldKeys[f] ?? f; }
    });
    announce(`Form errors: ${Object.values(errors).filter(Boolean).join(" ")}`);
    if (first) document.getElementById(`field-${first}`)?.focus();
    return;
  }
  if (editingId) {
    const idx = items.findIndex(c => c.id === editingId);
    if (idx === -1) { reportFailure("Could not find candle to edit."); return; }
    const updated = createCandle(input, editingId, items[idx].createdAt);
    const next = items.map((c, i) => i === idx ? updated : c);
    const result = save(next);
    if (!result.ok) { reportFailure(result.message); return; }
    items = next;
    announce(`"${updated.name}" updated.`);
    resetForm();
  } else {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    const newCandle = createCandle(input, id, new Date().toISOString());
    const next = [...items, newCandle];
    const result = save(next);
    if (!result.ok) { reportFailure(result.message); return; }
    items = next;
    announce(`"${newCandle.name}" added to ${newCandle.view === "shelf" ? "your shelf" : "your wish list"}.`);
    resetForm();
  }
  render();
}

function handleGridClick(e: Event): void {
  const btn = (e.target as HTMLElement).closest("[data-action]") as HTMLElement | null;
  if (!btn) return;
  const {action, id} = btn.dataset;
  if (!id) return;
  clearBanner();
  if (action === "delete") {
    if (armedDeleteId === id) {
      if (armedDeleteTimer) clearTimeout(armedDeleteTimer);
      armedDeleteTimer = null;
      armedDeleteId = null;
      const candle = items.find(c => c.id === id);
      const next = items.filter(c => c.id !== id);
      const result = save(next);
      if (!result.ok) { reportFailure(result.message); render(); return; }
      items = next;
      announce(`"${candle?.name ?? "Candle"}" deleted.`);
      if (editingId === id) resetForm();
      render();
    } else {
      disarmDelete();
      armDelete(id);
    }
  } else if (action === "edit") {
    const c = items.find(c => c.id === id);
    if (c) { disarmDelete(); populateFormForEdit(c); }
  } else if (action === "move") {
    const idx = items.findIndex(c => c.id === id);
    if (idx === -1) return;
    const moved = {...items[idx], view: "shelf" as View};
    const next = items.map((c, i) => i === idx ? moved : c);
    const result = save(next);
    if (!result.ok) { reportFailure(result.message); return; }
    items = next;
    announce(`"${moved.name}" moved to your shelf.`);
    render();
  }
}

function handleStarClick(e: Event): void {
  const btn = (e.target as HTMLElement).closest(".star-btn") as HTMLButtonElement | null;
  if (!btn) return;
  const value = Number(btn.dataset.value);
  currentRating = currentRating === value ? null : value;
  updateStarUI(currentRating);
}

function handleViewToggle(e: Event): void {
  const btn = (e.target as HTMLElement).closest("[data-view]") as HTMLElement | null;
  if (!btn) return;
  const view = btn.dataset.view as View;
  if (!VIEWS.includes(view)) return;
  currentView = view;
  disarmDelete();
  document.querySelectorAll<HTMLButtonElement>(".toggle-btn").forEach(b => {
    const active = b.dataset.view === view;
    b.classList.toggle("active", active);
    b.setAttribute("aria-pressed", String(active));
  });
  render();
}

function handleClearFilters(): void {
  ($("search-input") as HTMLInputElement).value = "";
  ($("filter-status") as HTMLSelectElement).value = "";
  searchQuery = "";
  statusFilter = "";
  render();
}

function init(): void {
  const result = load();
  switch (result.status) {
    case "ok": items = result.items; break;
    case "empty": items = []; break;
    case "partial": items = result.items; reportFailure(result.message); break;
    case "error": items = []; reportFailure(result.message); break;
  }
  render();
  $("candle-form").addEventListener("submit", handleFormSubmit);
  $("candle-grid").addEventListener("click", handleGridClick);
  $("rating-input-group").addEventListener("click", handleStarClick);
  document.querySelector(".view-toggle")!.addEventListener("click", handleViewToggle);
  $("search-input").addEventListener("input", (e) => { searchQuery = (e.target as HTMLInputElement).value; disarmDelete(); render(); });
  $("filter-status").addEventListener("change", (e) => { statusFilter = (e.target as HTMLSelectElement).value; disarmDelete(); render(); });
  $("btn-clear-filters").addEventListener("click", handleClearFilters);
  $("btn-cancel-edit").addEventListener("click", resetForm);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && armedDeleteId) disarmDelete(); });
  document.addEventListener("click", (e) => { if (armedDeleteId && !(e.target as HTMLElement).closest("[data-action='delete']")) disarmDelete(); });
}

init();
