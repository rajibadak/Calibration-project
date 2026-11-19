function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

function pretty(iso) {
  if (!iso) return "—";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const parts = String(iso).slice(0, 10).split("-");
  if (parts.length < 3 || !months[Number(parts[1]) - 1]) return esc(iso);
  return Number(parts[2]) + " " + months[Number(parts[1]) - 1] + " " + parts[0];
}

function icon(name) {
  const names = {
    dashboard: "dashboard", customers: "team", instruments: "sensor", enquiries: "chat-check", quotations: "file-list-3",
    work: "briefcase-4", visits: "calendar-event", funds: "wallet-3", certificates: "award", invoices: "bill",
    stock: "box-3", gst: "percent", mail: "mail", reports: "bar-chart-box", bell: "notification-3", search: "search",
    settings: "settings-3", menu: "menu", panel: "layout-left", empty: "inbox",
  };
  return '<i class="ri-' + (names[name] || names.dashboard) + '-line shrink-0 text-[18px] leading-none" aria-hidden="true"></i>';
}

function badge(status) {
  const map = {
    Open: "neutral",
    Chasing: "warn",
    Converted: "good",
    Lost: "neutral",
    Draft: "neutral",
    Sent: "neutral",
    Accepted: "good",
    Rejected: "bad",
    Scheduled: "neutral",
    Calibrated: "neutral",
    Invoiced: "good",
    Closed: "neutral",
    Cancelled: "bad",
    Empty: "warn",
    Saved: "good",
    Submitted: "warn",
    Released: "good",
    Issued: "good",
    Superseded: "neutral",
    "Partly paid": "warn",
    Paid: "good",
    "In stock": "good",
    Quarantined: "bad",
    Expired: "bad",
    Prepared: "warn",
    "Opened in mail app": "neutral",
    "Opened in WhatsApp": "good",
    "Not filed": "warn",
    Sensor: "neutral",
    "Spare part": "neutral",
    Consumable: "neutral",
    Filed: "good",
    "Single gas": "neutral",
    "Multi gas": "neutral",
    Overdue: "bad",
    "Due soon": "warn",
    Reorder: "warn",
    "Due today": "bad",
    "In date": "good",
    "No due date": "neutral",
  };
  const tone = map[status] || "neutral";
  return '<span class="pill pill-' + tone + '">' + esc(status || "—") + "</span>";
}

function dueBadge(iso) {
  if (!iso) return badge("No due date");
  const days = Store.diffDays(Store.today(), iso);
  if (days < 0) return badge("Overdue");
  if (days === 0) return badge("Due today");
  if (days <= 15) return badge("Due soon");
  return badge("In date");
}

const control = "w-full rounded-lg border border-[#e4e7ea] bg-white px-3 text-sm text-[#0B2540] outline-none";

function field(label, inner) {
  return '<label class="block"><span class="mb-1.5 block text-[13px] font-medium text-[#24364a]">' + label + "</span>" + inner + "</label>";
}

function textInput(name, value, attrs) {
  return '<input name="' + name + '" value="' + esc(value ?? "") + '" ' + (attrs || "") + ' class="' + control + ' h-9" />';
}

function areaInput(name, value, attrs) {
  return '<textarea name="' + name + '" rows="4" ' + (attrs || "") + ' class="' + control + ' min-h-[96px] py-2">' + esc(value ?? "") + "</textarea>";
}

function selectInput(name, options, attrs) {
  return '<select name="' + name + '" ' + (attrs || "") + ' class="' + control + ' h-9">' + options + "</select>";
}

function optionList(items, selected) {
  return items.map((item) => '<option value="' + esc(item.value) + '"' + (String(item.value) === String(selected ?? "") ? " selected" : "") + ">" + esc(item.label) + "</option>").join("");
}

function button(label, type, tone) {
  const styles = tone === "ghost"
    ? "border border-[#e4e7ea] bg-white text-[#0B2540] hover:bg-[#fafbfb]"
    : tone === "danger"
      ? "border border-[#f3d0cd] bg-white text-[#b42318] hover:bg-[#fef3f2]"
      : "border border-[#0F766E] bg-[#0F766E] text-white hover:bg-[#0c5f59]";
  return '<button type="' + (type || "submit") + '" class="inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium ' + styles + '">' + label + "</button>";
}

function linkButton(label, hash, tone) {
  const styles = tone === "ghost"
    ? "border border-[#e4e7ea] bg-white text-[#0B2540] hover:bg-[#fafbfb]"
    : "border border-[#0F766E] bg-[#0F766E] text-white hover:bg-[#0c5f59]";
  return '<a href="' + hash + '" class="inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium ' + styles + '">' + label + "</a>";
}

function heading(title, text, actions) {
  return '<div class="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[#e4e7ea] pb-4"><div class="min-w-0"><h1 class="text-2xl font-semibold tracking-tight text-[#0B2540]">' + esc(title) + "</h1>" +
    (text ? '<p class="mt-1 max-w-3xl text-sm leading-6 text-[#6b7580]">' + esc(text) + "</p>" : "") +
    '</div><div class="flex flex-wrap gap-2">' + (actions || "") + "</div></div>";
}

function card(html) {
  return '<section class="surface-card rounded-[10px] border border-[#e4e7ea] bg-white p-5">' + html + "</section>";
}

function emptyState(title, text, action) {
  return '<div class="rounded-[10px] border border-dashed border-[#e4e7ea] bg-white px-6 py-14 text-center"><div class="empty-mark mb-3 inline-flex">' + icon("empty") + '</div><h2 class="text-[15px] font-semibold text-[#0B2540]">' + esc(title) + '</h2><p class="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6b7580]">' + esc(text) + '</p><div class="mt-5">' + (action || "") + "</div></div>";
}

function slicePage(key, rows) {
  const size = 8;
  if (!UI.page) UI.page = {};
  const pages = Math.max(1, Math.ceil(rows.length / size));
  let current = Number(UI.page[key] || 1);
  if (current > pages) current = pages;
  if (current < 1) current = 1;
  UI.page[key] = current;
  return {
    rows: rows.slice((current - 1) * size, current * size),
    current,
    pages,
    total: rows.length,
    from: rows.length ? (current - 1) * size + 1 : 0,
    to: Math.min(current * size, rows.length),
  };
}

function pager(key, meta) {
  if (!meta.total) return "";
  const prev = meta.current > 1 ? '<button type="button" data-action="page" data-id="' + key + ":" + (meta.current - 1) + '" class="h-8 rounded-lg border border-[#e4e7ea] bg-white px-2.5 text-xs font-medium text-[#0B2540] hover:bg-[#fafbfb]">Previous</button>' : "";
  const next = meta.current < meta.pages ? '<button type="button" data-action="page" data-id="' + key + ":" + (meta.current + 1) + '" class="h-8 rounded-lg border border-[#e4e7ea] bg-white px-2.5 text-xs font-medium text-[#0B2540] hover:bg-[#fafbfb]">Next</button>' : "";
  return '<div class="flex flex-wrap items-center justify-between gap-3 border-t border-[#e4e7ea] bg-white px-4 py-3 text-xs tabular-nums text-[#6b7580]"><span>Showing ' + meta.from + "–" + meta.to + " of " + meta.total + '</span><div class="flex gap-2">' + prev + next + "</div></div>";
}

function moneyHeader(header) {
  return /total|balance|amount|tax|qty|on hand|reorder|rate|chases/i.test(header);
}

function dataTable(headers, body, key, meta) {
  const head = headers.map((header, index) => {
    const last = index === headers.length - 1;
    const align = last || moneyHeader(header) ? "text-right" : "text-left";
    const sticky = last ? "sticky right-0 z-10 bg-[#fafbfb]" : "";
    return '<th class="h-11 whitespace-nowrap border-b border-[#e4e7ea] bg-[#fafbfb] px-4 text-[11px] font-semibold uppercase tracking-[.06em] text-[#6b7580] ' + align + " " + sticky + '">' + header + "</th>";
  }).join("");
  return '<div class="data-table overflow-hidden rounded-[10px] border border-[#e4e7ea] bg-white"><div class="overflow-x-auto"><table class="min-w-full border-collapse text-left text-sm"><thead><tr>' + head + '</tr></thead><tbody>' + body + "</tbody></table></div>" + pager(key, meta) + "</div>";
}

function cells(values, filter) {
  const attrs = filter ? ' data-filter-row="' + filter.key + '" data-filter-text="' + esc(filter.text.toLowerCase()) + '"' : "";
  return "<tr" + attrs + ' class="group border-b border-[#e4e7ea] last:border-0 hover:bg-[#fafbfb]">' + values.map((value, index) => {
    const last = index === values.length - 1;
    const plain = String(value).replace(/<[^>]+>/g, "");
    const numeric = /₹/.test(plain) || /^\d+$/.test(plain.trim());
    const align = last || numeric ? "text-right tabular-nums" : "tabular-nums";
    const sticky = last ? "sticky right-0 z-10 bg-white group-hover:bg-[#fafbfb]" : "";
    return '<td class="px-4 py-3 align-middle text-sm text-[#24364a] ' + (last ? "whitespace-nowrap " : "") + align + " " + sticky + '">' + value + "</td>";
  }).join("") + "</tr>";
}

function actionIcon(name) {
  const names = { view: "eye", edit: "pencil", delete: "delete-bin-6", download: "download-2", add: "add" };
  return '<i class="ri-' + names[name] + '-line text-[18px] leading-none" aria-hidden="true"></i>';
}

function actionBox(tag, attrs, name, label) {
  return "<" + tag + " " + attrs + ' title="' + label + '" aria-label="' + label + '" class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e4e7ea] bg-white text-[#6b7580] hover:border-[#d5dbe1] hover:bg-[#fafbfb] hover:text-[#0B2540]">' + actionIcon(name) + "</" + tag + ">";
}

function rowActions(spec) {
  const view = spec.view ? actionBox("a", 'href="' + spec.view + '"', "view", "View") : "";
  const edit = spec.edit ? actionBox("a", 'href="' + spec.edit + '"', "edit", "Edit") : "";
  const del = spec.del ? actionBox("button", 'type="button" data-action="' + spec.del + '" data-id="' + esc(spec.id) + '"', "delete", "Delete") : "";
  const download = spec.download ? actionBox("button", 'type="button" data-action="download" data-kind="' + spec.download + '" data-id="' + esc(spec.id) + '"', "download", "Download") : "";
  return '<div class="inline-flex items-center justify-end gap-0.5 whitespace-nowrap">' + view + edit + del + download + "</div>";
}

function searchBox(key, placeholder) {
  const value = UI.query && UI.query[key] ? UI.query[key] : "";
  return '<input data-search="' + key + '" value="' + esc(value) + '" placeholder="' + esc(placeholder || "Search") + '" class="h-9 w-full max-w-sm ' + control + '" />';
}

function statusSelect(key, options) {
  if (!options || !options.length) return "";
  const current = UI.filter && UI.filter[key] ? UI.filter[key] : "";
  return '<select data-filter="' + key + '" class="h-9 rounded-lg border border-[#e4e7ea] bg-white px-3 text-sm text-[#0B2540] outline-none">' +
    '<option value="">All statuses</option>' +
    options.map((item) => '<option value="' + esc(item) + '"' + (item === current ? " selected" : "") + ">" + esc(item) + "</option>").join("") +
    "</select>";
}

function byStatus(key, rows) {
  const pick = UI.filter && UI.filter[key];
  if (!pick) return rows;
  return rows.filter((row) => row.status === pick);
}

function toolbar(key, placeholder, statuses) {
  return '<div class="mb-4 flex flex-wrap items-center gap-2">' + searchBox(key, placeholder) + statusSelect(key, statuses) + "</div>";
}

function filtered(key, rows, textOf) {
  const query = ((UI.query && UI.query[key]) || "").trim().toLowerCase();
  if (!query) return rows;
  return rows.filter((row) => textOf(row).toLowerCase().includes(query));
}

function customerOptions(selected) {
  const items = Store.state().customers.map((item) => ({ value: item.id, label: item.tradeName }));
  return '<option value="">Select customer</option>' + optionList(items, selected);
}

function familyOptions(selected) {
  return optionList(Store.FAMILIES.map((item) => ({ value: item, label: item })), selected || "Portable monitor");
}

function engineerOptions(selected) {
  const items = Store.engineers().map((item) => ({ value: item.id, label: item.name + (item.signature ? "" : " (no signature)") }));
  return '<option value="">Select engineer</option>' + optionList(items, selected);
}

function company() {
  return Store.state().company;
}

function whenCan(perm, html) {
  return Store.can(perm) ? html : "";
}
