var UI = {
  nav: false,
  collapsed: false,
  page: {},
  query: {},
  routeKey: "",
  cert: null,
  certKey: "",
  quoteLines: null,
  quoteKey: "",
  gasRows: null,
  gasKey: "",
  selectedInstruments: null,
  instrumentKey: "",
  workCustomer: undefined,
  workKey: "",
  gstPeriod: "",
  accountOpen: false,
  notesOpen: false,
  noteId: "",
  filter: {},
};

try {
  UI.collapsed = localStorage.getItem("firstly-sidebar") === "1";
} catch (error) {
  UI.collapsed = false;
}

function parseRoute() {
  const raw = (location.hash || "#/").replace(/^#/, "");
  const bits = raw.split("?");
  const parts = bits[0].split("/").filter(Boolean);
  const params = Object.fromEntries(new URLSearchParams(bits[1] || ""));
  if (!parts.length) return { name: "dashboard", id: null, mode: null, params };
  return { name: parts[0], id: parts[1] || null, mode: parts[2] || null, params };
}

function toast(message, tone) {
  if (!message) return;
  const item = document.createElement("div");
  item.className = "toast pointer-events-auto" + (tone === "error" ? " toast-error" : "");
  item.textContent = message;
  document.getElementById("toast").appendChild(item);
  setTimeout(() => item.remove(), 4200);
}

function act(result) {
  if (!result) return;
  if (!result.ok) {
    toast(result.error, "error");
    return;
  }
  if (result.message) toast(result.message);
  if (result.hash && result.hash !== location.hash) {
    location.hash = result.hash;
    return;
  }
  render();
}

function resetTransient() {
  UI.nav = false;
  UI.accountOpen = false;
  UI.notesOpen = false;
  UI.noteId = "";
  UI.cert = null;
  UI.certKey = "";
  UI.quoteLines = null;
  UI.quoteKey = "";
  UI.gasRows = null;
  UI.gasKey = "";
  UI.selectedInstruments = null;
  UI.instrumentKey = "";
  UI.workCustomer = undefined;
  UI.workKey = "";
}

function render() {
  const gate = document.getElementById("gate");
  const app = document.getElementById("app");
  const active = document.activeElement;
  const searchKey = active && active.dataset ? active.dataset.search : "";
  const caret = searchKey && active.selectionStart != null ? active.selectionStart : 0;
  if (!Store.user()) {
    app.className = "hidden";
    app.innerHTML = "";
    gate.className = "fixed inset-0 z-40 overflow-y-auto bg-[#f6f7f8]";
    gate.innerHTML = renderGate();
    return;
  }
  const jobs = Store.runDueJobs();
  gate.className = "hidden";
  gate.innerHTML = "";
  if (UI.routeKey !== location.hash) {
    UI.routeKey = location.hash;
    resetTransient();
  }
  const route = parseRoute();
  let main = "";
  try {
    main = renderMain(route);
  } catch (error) {
    main = emptyState("This page could not be shown", error.message || "Reload the page and try again.", linkButton("Dashboard", "#/", "ghost"));
  }
  const shell = UI.nav
    ? "fixed inset-y-0 left-0 z-40 h-screen md:sticky md:top-0 md:z-auto md:h-screen"
    : "hidden md:sticky md:top-0 md:block md:h-screen";
  const menuLeft = window.innerWidth < 768 ? "left-0" : (window.innerWidth >= 1100 && !UI.collapsed ? "left-60" : "left-16");
  app.className = "min-h-screen bg-[#f6f7f8] font-sans text-sm text-[#0B2540]";
  app.innerHTML = '<div class="flex min-h-screen">' +
    (UI.nav ? '<button type="button" data-action="close-nav" class="fixed inset-0 z-30 bg-[#0B2540]/40 md:hidden" aria-label="Close menu"></button>' : "") +
    '<div class="' + shell + '">' + renderSidebar(route.name) + "</div>" +
    '<div class="min-w-0 flex-1">' + renderTopbar(route) +
    (UI.accountOpen || UI.notesOpen ? '<button type="button" data-action="close-popovers" class="fixed bottom-0 right-0 top-16 z-20 ' + menuLeft + '" aria-label="Close menu"></button>' : "") +
    '<main class="min-h-screen bg-[#f6f7f8] px-4 pb-10 pt-20 sm:px-8">' + main + "</main></div></div>";
  if (searchKey) {
    const input = app.querySelector('[data-search="' + (window.CSS && CSS.escape ? CSS.escape(searchKey) : searchKey) + '"]');
    if (input) {
      input.focus();
      const pos = Math.min(caret, input.value.length);
      input.setSelectionRange(pos, pos);
    }
  }
  if (jobs && jobs.message) toast(jobs.message);
}

function syncCert(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  UI.cert = Object.assign(UI.cert || {}, data);
  UI.cert.gasOn = [];
  UI.cert.asFound = [];
  UI.cert.asLeft = [];
  form.querySelectorAll("[data-gas-index]").forEach((row) => {
    const index = Number(row.dataset.gasIndex);
    UI.cert.gasOn[index] = row.querySelector("[data-gas-required]").checked;
    UI.cert.asFound[index] = row.querySelector("[data-as-found]").value;
    UI.cert.asLeft[index] = row.querySelector("[data-as-left]").value;
  });
  UI.certKey = location.hash;
}

function paintCert() {
  if (!UI.cert || typeof certificateModel !== "function") return;
  const preview = certificateModel();
  const due = document.getElementById("due-live");
  const box = document.getElementById("cert-preview");
  if (due) due.textContent = pretty(preview.dueDate);
  if (box) box.innerHTML = paperCertificate(preview);
}

function captureQuote(form) {
  UI.quoteKey = form.dataset.quoteKey;
  UI.quoteLines = [...form.querySelectorAll("[data-line]")].map(quoteLineFromRow);
}

function captureGases(form) {
  UI.gasKey = form.dataset.gasKey;
  UI.gasRows = [...form.querySelectorAll("[data-gas]")].map((row) => ({
    gas: row.querySelector("[name=gas]").value,
    concentration: row.querySelector("[name=concentration]").value,
    unit: row.querySelector("[name=unit]").value,
  }));
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("The file could not be read."));
    reader.readAsDataURL(file);
  });
}

async function attachSignature(form, data) {
  const input = form.elements.signature;
  if (!input || !input.files || !input.files[0]) return;
  const file = input.files[0];
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error("Use a PNG, JPEG, or WebP signature.");
  if (file.size > 400000) throw new Error("Use a signature image under 400 KB.");
  data.signature = await readFile(file);
}

function collect(form, data) {
  if (form.querySelector("[data-line]")) {
    data.lines = JSON.stringify([...form.querySelectorAll("[data-line]")].map(quoteLineFromRow));
  }
  if (form.querySelector("[name=instrumentIds]")) {
    data.instrumentIds = JSON.stringify([...form.querySelectorAll("[name=instrumentIds]:checked")].map((item) => item.value));
  }
  if (form.dataset.form === "addCylinder" || form.dataset.form === "updateCylinder") {
    data.gases = JSON.stringify([...form.querySelectorAll("[data-gas]")].map((row) => ({
      gas: row.querySelector("[name=gas]").value,
      concentration: row.querySelector("[name=concentration]").value,
      unit: row.querySelector("[name=unit]").value,
    })));
  }
  if (form.dataset.form === "saveCertificate") {
    const on = [];
    const found = [];
    const left = [];
    form.querySelectorAll("[data-gas-index]").forEach((row) => {
      const index = Number(row.dataset.gasIndex);
      on[index] = row.querySelector("[data-gas-required]").checked;
      found[index] = row.querySelector("[data-as-found]").value;
      left[index] = row.querySelector("[data-as-left]").value;
    });
    data.gases = JSON.stringify(on);
    data.asFound = JSON.stringify(found);
    data.asLeft = JSON.stringify(left);
  }
}

const forms = {
  setup: (data) => Store.setup(data),
  login: async (data) => {
    const result = await Store.login(data.email, data.password);
    if (result.ok) result.hash = "#/";
    return result;
  },
  register: async (data) => {
    const result = await Store.register(data);
    if (result.ok) UI.authTab = "login";
    return result;
  },
  addCustomer: (data) => Store.addCustomer(data),
  updateCustomer: (data) => Store.updateCustomer(data.id, data),
  addInstrument: (data) => Store.addInstrument(data),
  updateInstrument: (data) => Store.updateInstrument(data.id, data),
  addEnquiry: (data) => Store.addEnquiry(data),
  updateEnquiry: (data) => Store.updateEnquiry(data.id, data),
  addQuotation: (data) => Store.addQuotation(data),
  updateQuotation: (data) => Store.updateQuotation(data.id, data),
  addWorkOrder: (data) => Store.addWorkOrder(data),
  updateWorkOrder: (data) => Store.updateWorkOrder(data.id, data),
  addVisit: (data) => Store.addVisit(data),
  updateVisit: (data) => Store.updateVisit(data.id, data),
  saveVisitPack: (data) => Store.saveVisitPack(data),
  decideRequisition: (data) => Store.decideRequisition(data),
  saveCertificate: (data) => Store.saveCertificate(data),
  recordPayment: (data) => Store.recordPayment(data),
  updateInvoice: (data) => Store.updateInvoice(data.id, data),
  addCylinder: (data) => Store.addCylinder(data),
  updateCylinder: (data) => Store.updateCylinder(data.id, data),
  addSpare: (data) => Store.addSpare(data),
  updateSpare: (data) => Store.updateSpare(data.id, data),
  moveSpare: (data) => Store.moveSpare(data),
  recordGstFiling: (data) => Store.recordGstFiling(data),
  updateMail: (data) => Store.updateMail(data.id, data),
  saveSettings: (data) => Store.saveSettings(data),
  addUser: (data) => Store.addUser(data),
  updateUser: (data) => Store.updateUser(data.id, data),
  importBackup: async (data, form) => {
    const file = form.elements.backup && form.elements.backup.files[0];
    if (!file) return { ok: false, error: "Choose a backup file." };
    return Store.importBackup(await file.text());
  },
};

function downloadRecord(kind, id) {
  const firm = company();
  if (kind === "customer") {
    const item = Store.customer(id);
    if (!item) return null;
    return { filename: item.tradeName.replace(/\s+/g, "-") + ".html", title: item.tradeName, html: paperRecord(item.tradeName, [["Legal name", esc(item.legalName)], ["Email", esc(item.email)], ["Phone", esc(item.phone || "—")], ["GSTIN", esc(item.gstin || "—")], ["Address", esc(item.address || "—")], ["Site", esc(item.site || "—")]]) };
  }
  if (kind === "instrument") {
    const item = Store.instrument(id);
    if (!item) return null;
    const owner = Store.customer(item.customerId);
    return { filename: item.serial + ".html", title: item.serial, html: paperRecord(item.serial, [["Customer", esc(owner ? owner.tradeName : "—")], ["Family", esc(item.family)], ["Make", esc(item.make || "—")], ["Model", esc(item.model || "—")], ["Interval", esc(item.interval + " months")], ["Due", pretty(item.due)]]) };
  }
  if (kind === "enquiry") {
    const item = Store.enquiry(id);
    if (!item) return null;
    return { filename: "confirmation-" + item.id + ".html", title: "Confirmation", html: paperRecord("Confirmation", [["Customer", esc((Store.customer(item.customerId) || {}).tradeName || "—")], ["Source", esc(item.source)], ["Date", pretty(item.date)], ["Status", esc(item.status)], ["Summary", esc(item.summary)]]) };
  }
  if (kind === "quotation") {
    const item = Store.quotation(id);
    if (!item) return null;
    return { filename: item.number + ".html", title: item.number, html: paperQuote(item) };
  }
  if (kind === "work") {
    const item = Store.workOrder(id);
    if (!item) return null;
    return { filename: item.number + ".html", title: item.number, html: paperRecord(item.number, [["Customer order", esc(item.woNumber)], ["Order date", pretty(item.woDate)], ["Customer", esc((Store.customer(item.customerId) || {}).tradeName || "—")], ["Site", esc(item.site || "—")], ["Status", esc(item.status)]]) };
  }
  if (kind === "visit") {
    const item = Store.visit(id);
    if (!item) return null;
    return { filename: "visit-" + item.date + ".html", title: "Visit", html: paperRecord("Visit", [["Date", pretty(item.date)], ["Job", esc(item.jobType)], ["Location", esc(item.location)], ["Engineer", esc(Store.person(item.engineerId))], ["Pack", esc(item.packStatus)]]) };
  }
  if (kind === "requisition") {
    const item = Store.requisition(id);
    if (!item) return null;
    const visit = Store.visit(item.visitId);
    return { filename: item.number + ".html", title: item.number, html: paperRecord(item.number, [["Status", esc(item.status)], ["Amount", Store.rupees(item.amountPaise)], ["Visit", pretty(visit ? visit.date : "")], ["Engineer", esc(visit ? Store.person(visit.engineerId) : "—")], ["History", esc((item.events || []).map((event) => event.text).join(" "))]]) };
  }
  if (kind === "certificate") {
    const item = Store.certificate(id);
    if (!item) return null;
    return { filename: (item.number || "draft-certificate") + ".html", title: item.number || "Draft certificate", html: paperCertificate(item) };
  }
  if (kind === "invoice") {
    const item = Store.invoice(id);
    if (!item) return null;
    return { filename: item.number + ".html", title: item.number, html: paperInvoice(item) };
  }
  if (kind === "receipt") {
    const item = Store.state().receipts.find((receipt) => receipt.id === id);
    if (!item) return null;
    const invoice = Store.invoice(item.invoiceId);
    return { filename: "receipt-" + item.id + ".html", title: "Receipt", html: paperRecord("Receipt", [["Invoice", esc(invoice ? invoice.number : "—")], ["Date", pretty(item.date)], ["Mode", esc(item.mode)], ["Reference", esc(item.reference || "—")], ["Amount", Store.rupees(item.amountPaise)]]) };
  }
  if (kind === "cylinder") {
    const item = Store.cylinder(id);
    if (!item) return null;
    return { filename: item.number + ".html", title: item.number, html: paperRecord(item.number, [["Type", esc(item.kind)], ["Expiry", pretty(item.expiry)], ["Status", esc(item.status)], ["Gas certificate", esc(item.gasCertNo || "—")], ["Gases", esc(item.gases.map((gas) => gas.gas + " " + gas.concentration + " " + gas.unit).join(", "))]]) };
  }
  if (kind === "spare") {
    const item = Store.spare(id);
    if (!item) return null;
    return { filename: item.code + ".html", title: item.name, html: paperRecord(item.name, [["Code", esc(item.code)], ["On hand", String(item.qty)], ["Reorder at", String(item.reorder)]]) };
  }
  if (kind === "mail") {
    const item = Store.mail(id);
    if (!item) return null;
    const eml = "To: " + item.to + "\r\nSubject: " + item.subject + "\r\n\r\n" + item.body + "\r\n";
    downloadText(item.type.replace(/\s+/g, "-") + ".eml", eml, "message/rfc822");
    return { file: true };
  }
  if (kind === "gst") {
    const rows = Store.gstrRows(id).map((invoice) => {
      const owner = Store.customer(invoice.customerId);
      return { invoice: invoice.number, date: invoice.date, customer: owner ? owner.legalName : "", gstin: owner ? owner.gstin : "", placeOfSupply: owner ? owner.stateCode : "", sac: firm.settings ? firm.settings.sac : Store.state().settings.sac, taxable: invoice.taxablePaise / 100, cgst: invoice.cgstPaise / 100, sgst: invoice.sgstPaise / 100, igst: invoice.igstPaise / 100, total: invoice.totalPaise / 100, irn: invoice.irn || "" };
    });
    downloadText("gstr1-" + id + ".json", JSON.stringify({ period: id, preparedBy: firm.legalName, note: "Outward supplies prepared for GSTR-1. File the return on the GST portal or through a GST Suvidha Provider, then record the ARN in the application.", invoices: rows }, null, 2), "application/json");
    return { file: true };
  }
  if (kind === "tally") {
    const built = Store.tallyXml(id);
    if (!built.count) return { ok: false, error: "No invoices to export." };
    downloadText("tally-sales-" + id + ".xml", built.xml, "application/xml");
    return { file: true };
  }
  if (kind === "report") {
    const today = Store.today();
    const due = Store.state().instruments.filter((item) => item.due && Store.diffDays(today, item.due) <= 30);
    const html = paperRecord("Instruments due within 30 days", due.map((item) => [item.serial, esc((Store.customer(item.customerId) || {}).tradeName || "—") + " · " + pretty(item.due)]));
    return { filename: "calibration-due.html", title: "Calibration due", html };
  }
  if (kind === "user") {
    const item = Store.state().users.find((user) => user.id === id);
    if (!item) return null;
    return { filename: item.name.replace(/\s+/g, "-") + ".html", title: item.name, html: paperRecord(item.name, [["Email", esc(item.email)], ["Role", esc(item.role)], ["Title", esc(item.title || "—")], ["Signature", item.signature ? "On file" : "Not uploaded"]]) };
  }
  return null;
}

const actions = {
  logout() {
    Store.logout();
    UI.nav = false;
    UI.accountOpen = false;
    UI.notesOpen = false;
    UI.noteId = "";
    UI.authTab = "login";
    return { ok: true, hash: "#/" };
  },
  "open-account"() {
    UI.accountOpen = !UI.accountOpen;
    UI.notesOpen = false;
    return { ok: true };
  },
  "close-account"() {
    UI.accountOpen = false;
    return { ok: true };
  },
  "open-notes"() {
    UI.notesOpen = !UI.notesOpen;
    UI.noteId = "";
    UI.accountOpen = false;
    return { ok: true };
  },
  "read-note"(el) {
    UI.notesOpen = true;
    UI.accountOpen = false;
    UI.noteId = UI.noteId === el.dataset.id ? "" : el.dataset.id;
    return { ok: true };
  },
  "close-popovers"() {
    UI.accountOpen = false;
    UI.notesOpen = false;
    UI.noteId = "";
    return { ok: true };
  },
  "my-account"() {
    const current = Store.user();
    UI.accountOpen = false;
    return { ok: true, hash: "#/settings?section=users&user=" + (current ? current.id : "") };
  },
  async "quick-login"(el) {
    const result = await Store.login(el.dataset.email, el.dataset.password);
    if (result.ok) result.hash = "#/";
    return result;
  },
  "auth-tab"(el) {
    UI.authTab = el.dataset.id === "register" ? "register" : "login";
    return { ok: true };
  },
  "open-nav"() {
    UI.nav = true;
    return { ok: true };
  },
  "close-nav"() {
    UI.nav = false;
    return { ok: true };
  },
  "toggle-sidebar"() {
    UI.collapsed = !UI.collapsed;
    UI.nav = false;
    try {
      localStorage.setItem("firstly-sidebar", UI.collapsed ? "1" : "0");
    } catch (error) {
      /* The layout still changes for this visit. */
    }
    return { ok: true };
  },
  page(el) {
    const raw = el.dataset.id || "";
    const cut = raw.indexOf(":");
    UI.page[raw.slice(0, cut)] = Number(raw.slice(cut + 1));
    return { ok: true };
  },
  download(el) {
    const built = downloadRecord(el.dataset.kind, el.dataset.id);
    if (!built) return { ok: false, error: "That record could not be downloaded." };
    if (!built.file) downloadDocument(built.filename, built.title, built.html);
    return { ok: true, message: "Download started." };
  },
  "delete-customer": (el) => Store.deleteCustomer(el.dataset.id),
  "delete-instrument": (el) => Store.deleteInstrument(el.dataset.id),
  "delete-enquiry": (el) => Store.deleteEnquiry(el.dataset.id),
  "delete-quotation": (el) => Store.deleteQuotation(el.dataset.id),
  "delete-work": (el) => Store.deleteWorkOrder(el.dataset.id),
  "delete-visit": (el) => Store.deleteVisit(el.dataset.id),
  "delete-requisition": (el) => Store.deleteRequisition(el.dataset.id),
  "delete-certificate": (el) => Store.deleteCertificate(el.dataset.id),
  "delete-invoice": (el) => Store.deleteInvoice(el.dataset.id),
  "delete-receipt": (el) => Store.deleteReceipt(el.dataset.id),
  "delete-cylinder": (el) => Store.deleteCylinder(el.dataset.id),
  "delete-spare": (el) => Store.deleteSpare(el.dataset.id),
  "delete-mail": (el) => Store.deleteMail(el.dataset.id),
  "delete-user": (el) => Store.deleteUser(el.dataset.id),
  "chase-enquiry": (el) => Store.chaseEnquiry(el.dataset.id),
  "lose-enquiry": (el) => Store.loseEnquiry(el.dataset.id),
  "convert-enquiry": (el) => Store.convertEnquiry(el.dataset.id),
  "send-quotation": (el) => Store.sendQuotation(el.dataset.id),
  "accept-quotation": (el) => Store.acceptQuotation(el.dataset.id),
  "reject-quotation": (el) => Store.rejectQuotation(el.dataset.id),
  "revise-certificate": (el) => Store.reviseCertificate(el.dataset.id),
  "cylinder-status"(el) {
    return Store.setCylinderStatus(el.dataset.id, el.dataset.status);
  },
  "open-mail"(el) {
    const result = Store.markMailOpened(el.dataset.id);
    if (!result.ok || !result.mail) return result.ok ? { ok: false, error: "Message not found." } : result;
    const mail = result.mail;
    const link = document.createElement("a");
    link.href = "mailto:" + mail.to + "?subject=" + encodeURIComponent(mail.subject) + "&body=" + encodeURIComponent(mail.body);
    document.body.appendChild(link);
    link.click();
    link.remove();
    return { ok: true, message: "The message was opened in your mail application. Send it from there." };
  },
  "open-whatsapp"(el) {
    const result = Store.whatsappLink(el.dataset.id);
    if (!result.ok) return result;
    window.open(result.url, "_blank", "noopener");
    return { ok: true, message: "WhatsApp opened with the message. Press send there." };
  },
  "gst-period"(el) {
    UI.gstPeriod = el.dataset.id;
    UI.page.gst = 1;
    return { ok: true };
  },
  "export-backup"() {
    const result = Store.exportBackup();
    if (!result.ok) return result;
    downloadText(result.file.filename, result.file.content, result.file.mime);
    return { ok: true, message: "Backup downloaded." };
  },
  "erase-installation"() {
    if (!window.confirm("Erase every record in this browser, including users?")) return { ok: true };
    return Store.resetInstallation();
  },
  "add-quote-line"() {
    const form = document.querySelector("[data-quote-key]");
    if (!form) return { ok: false, error: "The quotation form is not open." };
    captureQuote(form);
    UI.quoteLines.push({ family: "Portable monitor", detail: "", qty: 1, rate: "" });
    return { ok: true };
  },
  "remove-quote-line"(el) {
    const form = document.querySelector("[data-quote-key]");
    if (!form) return { ok: false, error: "The quotation form is not open." };
    captureQuote(form);
    if (UI.quoteLines.length === 1) return { ok: false, error: "A quotation needs at least one line." };
    UI.quoteLines.splice(Number(el.dataset.id), 1);
    return { ok: true };
  },
  "add-gas-row"() {
    const form = document.querySelector("[data-gas-key]");
    if (!form) return { ok: false, error: "The cylinder form is not open." };
    captureGases(form);
    UI.gasRows.push({ gas: "", concentration: "", unit: "ppm" });
    return { ok: true };
  },
  "remove-gas-row"(el) {
    const form = document.querySelector("[data-gas-key]");
    if (!form) return { ok: false, error: "The cylinder form is not open." };
    captureGases(form);
    if (UI.gasRows.length === 1) return { ok: false, error: "Enter at least one gas." };
    UI.gasRows.splice(Number(el.dataset.id), 1);
    return { ok: true };
  },
};

document.addEventListener("click", (event) => {
  const el = event.target.closest("[data-action]");
  if (!el || !actions[el.dataset.action]) return;
  if (el.dataset.action.startsWith("delete-") && !window.confirm("Delete this record?")) return;
  const result = actions[el.dataset.action](el);
  if (result && typeof result.then === "function") result.then(act);
  else act(result);
});

document.addEventListener("submit", async (event) => {
  const form = event.target;
  if (form && form.dataset && form.dataset.globalSearch != null) {
    event.preventDefault();
    const query = String(new FormData(form).get("q") || "").trim();
    ["customers", "instruments", "invoices", "work"].forEach((key) => {
      UI.query[key] = query;
      UI.page[key] = 1;
    });
    if (location.hash !== "#/customers") location.hash = "#/customers";
    else render();
    return;
  }
  if (!form || !form.dataset || !forms[form.dataset.form]) return;
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  if (event.submitter && event.submitter.name) data[event.submitter.name] = event.submitter.value;
  try {
    collect(form, data);
    if (form.dataset.form === "addUser" || form.dataset.form === "updateUser") await attachSignature(form, data);
    act(await forms[form.dataset.form](data, form));
  } catch (error) {
    toast(error.message || "That could not be saved.", "error");
  }
});

document.addEventListener("input", (event) => {
  const search = event.target.dataset && event.target.dataset.search;
  if (search) {
    UI.query[search] = event.target.value;
    UI.page[search] = 1;
    render();
    return;
  }
  const form = event.target.closest('form[data-form="saveCertificate"]');
  if (!form) return;
  syncCert(form);
  paintCert();
});

document.addEventListener("change", (event) => {
  const target = event.target;
  if (target.dataset && target.dataset.filter) {
    UI.filter[target.dataset.filter] = target.value;
    UI.page[target.dataset.filter] = 1;
    render();
    return;
  }
  if (target.dataset && target.dataset.refresh === "work-customer") {
    const form = target.closest("form");
    const id = form.elements.id ? form.elements.id.value : "new";
    UI.workKey = location.hash;
    UI.workCustomer = target.value;
    UI.instrumentKey = id + ":" + target.value;
    UI.selectedInstruments = [];
    render();
    return;
  }
  const form = target.closest('form[data-form="saveCertificate"]');
  if (!form) return;
  syncCert(form);
  if (target.dataset.cert === "cylinder") {
    UI.cert.gasOn = [];
    UI.cert.asFound = [];
    UI.cert.asLeft = [];
    render();
    return;
  }
  if (target.dataset.cert === "work") {
    const order = Store.workOrder(UI.cert.workOrderId);
    if (order) {
      UI.cert.customerId = order.customerId;
      UI.cert.woNumber = order.woNumber;
      UI.cert.woDate = order.woDate;
      const instrument = order.instrumentIds.map((item) => Store.instrument(item)).find(Boolean);
      if (instrument) {
        UI.cert.family = instrument.family;
        UI.cert.serial = instrument.serial;
        UI.cert.interval = String(instrument.interval);
      }
    }
    render();
    return;
  }
  paintCert();
});

window.addEventListener("hashchange", render);
let layoutBand = "";
window.addEventListener("resize", () => {
  const band = window.innerWidth < 768 ? "phone" : window.innerWidth < 1100 ? "rail" : "wide";
  if (band === layoutBand) return;
  layoutBand = band;
  if (Store.user()) render();
});
document.addEventListener("DOMContentLoaded", async () => {
  await Store.prepareSampleAccess();
  render();
});
