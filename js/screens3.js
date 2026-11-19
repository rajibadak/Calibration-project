function invoiceStrip() {
  const data = Store.state();
  const month = Store.today().slice(0, 7);
  const open = data.invoices.filter((item) => item.status !== "Cancelled" && Store.balanceOf(item) > 0);
  const outstanding = open.reduce((sum, item) => sum + Store.balanceOf(item), 0);
  const overdue = open.filter((item) => item.due && item.due < Store.today()).reduce((sum, item) => sum + Store.balanceOf(item), 0);
  const paid = data.receipts.filter((item) => String(item.date || "").slice(0, 7) === month).reduce((sum, item) => sum + (item.amountPaise || 0), 0);
  const cell = (label, value, alert) => '<div class="invoice-cell overflow-hidden rounded-[10px] border border-[#e4e7ea] bg-white"><p class="bg-[#e8ebed] px-5 py-2 text-[11px] font-medium uppercase tracking-[.06em] ' + (alert ? "text-[#b42318]" : "text-[#6b7580]") + '">' + label + '</p><p class="px-5 py-4 text-[32px] font-semibold leading-none tabular-nums ' + (alert ? "text-[#b42318]" : "text-[#0B2540]") + '">' + value + "</p></div>";
  return '<div class="mb-6 grid gap-4 sm:grid-cols-3">' + cell("Total outstanding", Store.rupees(outstanding), false) + cell("Overdue", Store.rupees(overdue), overdue > 0) + cell("Paid this month", Store.rupees(paid), false) + "</div>";
}

function pageInvoices(route) {
  if (route.id) return invoiceDetail(route.id);
  const pick = UI.filter && UI.filter.invoices;
  const source = Store.state().invoices.filter((item) => !pick || item.status === pick);
  const rows = filtered("invoices", source, (item) => item.number + " " + ((Store.customer(item.customerId) || {}).tradeName || "") + " " + item.status);
  const page = slicePage("invoices", rows);
  const body = page.rows.map((item) => cells([
    '<a class="font-medium text-[#0B2540] hover:underline" href="#/invoices/' + item.id + '">' + esc(item.number) + "</a>",
    esc((Store.customer(item.customerId) || {}).tradeName || "—"),
    pretty(item.date),
    Store.rupees(item.totalPaise),
    Store.rupees(Store.balanceOf(item)),
    badge(item.status),
    rowActions({
      id: item.id,
      view: "#/invoices/" + item.id,
      edit: Store.can("invoice") ? "#/invoices/" + item.id : "",
      del: Store.can("invoice") && item.paidPaise === 0 ? "delete-invoice" : "",
      download: "invoice",
    }),
  ])).join("");
  if (!Store.state().invoices.length) return heading("Invoices", "An invoice is created when a certificate is issued. SAC " + esc(Store.state().settings.sac) + " at " + esc(Store.state().settings.gstRate) + "%.") + emptyState("No invoices", "Issue a certificate after the rate card has a price.", linkButton("Certificates", "#/certificates", "ghost"));
  return heading("Invoices", "Payment reminders are prepared after the due date until the balance is cleared or reminders are stopped.", Store.can("invoice") ? '<button type="button" data-action="download" data-kind="tally" data-id="all" class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">Export to Tally (XML)</button>' : "") + invoiceStrip() + toolbar("invoices", "Search invoice or customer", ["Issued", "Partly paid", "Paid", "Cancelled"]) + dataTable(["Invoice", "Customer", "Date", "Total", "Balance", "Status", "Actions"], body, "invoices", page);
}

function invoiceDetail(id) {
  const invoice = Store.invoice(id);
  if (!invoice) return pageMissing();
  const receipts = Store.state().receipts.filter((item) => item.invoiceId === id);
  const receiptRows = receipts.map((item) => cells([
    pretty(item.date),
    esc(item.mode),
    esc(item.reference || "—"),
    Store.rupees(item.amountPaise),
    rowActions({ id: item.id, del: Store.can("payment") ? "delete-receipt" : "", download: "receipt" }),
  ])).join("");
  const pay = Store.can("payment") && invoice.status !== "Paid" && invoice.status !== "Cancelled"
    ? '<form data-form="recordPayment" class="mt-6">' + card('<h2 class="font-semibold">Record payment</h2><input type="hidden" name="id" value="' + esc(id) + '" /><div class="mt-4 grid gap-4 sm:grid-cols-2">' +
      field("Amount (₹)", moneyInput("amount", (Store.balanceOf(invoice) / 100).toFixed(2))) +
      field("Date", textInput("date", Store.today(), 'type="date"')) +
      field("Mode", selectInput("mode", optionList(["Bank", "UPI", "Cash", "Cheque"].map((item) => ({ value: item, label: item })), "Bank"))) +
      field("Reference", textInput("reference", "")) +
      "</div><div class=\"mt-4\">" + button("Save receipt") + "</div>") + "</form>"
    : "";
  const edit = Store.can("invoice")
    ? '<form data-form="updateInvoice" class="mt-6">' + card('<h2 class="font-semibold">Invoice record</h2><input type="hidden" name="id" value="' + esc(id) + '" /><div class="mt-4 grid gap-4">' +
      field("IRN", textInput("irn", invoice.irn, 'placeholder="Paste the IRN from the Invoice Registration Portal"')) +
      field("Notes", areaInput("notes", invoice.notes)) +
      '<label class="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="remindersStopped" value="yes"' + (invoice.remindersStopped ? " checked" : "") + " /> Stop payment reminders</label>" +
      "</div><p class=\"mt-3 text-xs leading-5 text-slate-500\">The IRN is entered only after the invoice is registered. This screen does not generate an IRN or a QR code.</p><div class=\"mt-4\">" + button("Save invoice") + "</div>") + "</form>"
    : "";
  return heading(invoice.number, "Due " + pretty(invoice.due), linkButton("All invoices", "#/invoices", "ghost")) +
    paperInvoice(invoice) + pay + edit +
    '<div class="mt-6">' + (receiptRows ? dataTable(["Date", "Mode", "Reference", "Amount", "Actions"], receiptRows, "receipts-" + id, slicePage("receipts-" + id, receipts)) : card('<h2 class="font-semibold">Receipts</h2><p class="mt-2 text-sm text-slate-600">No receipts yet.</p>')) + "</div>" +
    '<div class="mt-4"><button type="button" data-action="download" data-kind="invoice" data-id="' + id + '" class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">Download</button></div>';
}

function pageStock() {
  const cylinders = Store.state().cylinders;
  const spares = Store.state().spares;
  const low = spares.filter((item) => item.qty <= item.reorder);
  return heading("Stock", "Cylinders supply the certified gas on a certificate. Spares are counted in and out.", whenCan("stock", linkButton("Add cylinder", "#/cylinders/new") + linkButton("Add spare", "#/spares/new", "ghost"))) +
    '<div class="mb-6 grid gap-3 sm:grid-cols-3">' +
    statCard(cylinders.filter((item) => item.status === "In stock").length, "Cylinders in stock", "#/stock") +
    statCard(cylinders.filter((item) => item.status !== "In stock").length, "Cylinders not available", "#/stock") +
    statCard(low.length, "Spares at or below reorder", "#/stock") +
    "</div>" +
    "<h2 class=\"mb-3 text-lg font-semibold\">Cylinders</h2>" + cylinderTable(cylinders) +
    "<h2 class=\"mb-3 mt-8 text-lg font-semibold\">Spares</h2>" + spareTable(spares);
}

function cylinderTable(list) {
  const rows = filtered("cylinders", list, (item) => item.number + " " + item.kind + " " + item.supplier + " " + item.gases.map((gas) => gas.gas).join(" "));
  const page = slicePage("cylinders", rows);
  if (!list.length) return emptyState("No cylinders", "Add a cylinder with its certified gases and expiry before calibrating.", whenCan("stock", linkButton("Add cylinder", "#/cylinders/new")));
  const body = page.rows.map((item) => cells([
    '<a class="font-medium text-[#0B2540] hover:underline" href="#/cylinders/' + item.id + '">' + esc(item.number) + "</a>",
    badge(item.kind),
    esc(item.gases.map((gas) => gas.gas + " " + gas.concentration + " " + gas.unit).join(", ")),
    pretty(item.expiry),
    badge(item.status),
    rowActions({
      id: item.id,
      view: "#/cylinders/" + item.id,
      edit: Store.can("stock") ? "#/cylinders/" + item.id + "/edit" : "",
      del: Store.can("stock") ? "delete-cylinder" : "",
      download: "cylinder",
    }),
  ])).join("");
  return '<div class="mb-4">' + searchBox("cylinders", "Search cylinder or gas") + "</div>" + dataTable(["Cylinder", "Type", "Certified gases", "Expiry", "Status", "Actions"], body, "cylinders", page);
}

function spareTable(list) {
  const rows = filtered("spares", list, (item) => item.code + " " + item.name + " " + (item.kind || ""));
  const page = slicePage("spares", rows);
  if (!list.length) return emptyState("No spares", "Add sensors, filters, and other parts you hold.", whenCan("stock", linkButton("Add spare", "#/spares/new")));
  const body = page.rows.map((item) => cells([
    '<a class="font-medium text-[#0B2540] hover:underline" href="#/spares/' + item.id + '">' + esc(item.code) + "</a>",
    esc(item.name),
    badge(item.kind || "Spare part"),
    String(item.qty),
    String(item.reorder),
    item.qty <= item.reorder ? badge("Reorder") : badge("In stock"),
    rowActions({
      id: item.id,
      view: "#/spares/" + item.id,
      edit: Store.can("stock") ? "#/spares/" + item.id + "/edit" : "",
      del: Store.can("stock") ? "delete-spare" : "",
      download: "spare",
    }),
  ])).join("");
  return '<div class="mb-4">' + searchBox("spares", "Search code, name, or type") + "</div>" + dataTable(["Code", "Item", "Type", "On hand", "Reorder", "Stock", "Actions"], body, "spares", page);
}

function rememberGases(key, seed) {
  if (UI.gasKey !== key || !UI.gasRows) {
    UI.gasKey = key;
    UI.gasRows = seed;
  }
  return UI.gasRows;
}

function gasEditorRow(gas, index) {
  return '<div data-gas class="grid gap-3 border-b border-slate-100 py-3 sm:grid-cols-12 sm:items-end">' +
    '<div class="sm:col-span-4">' + field("Gas", textInput("gas", gas.gas)) + "</div>" +
    '<div class="sm:col-span-3">' + field("Concentration", textInput("concentration", gas.concentration)) + "</div>" +
    '<div class="sm:col-span-3">' + field("Unit", selectInput("unit", optionList(["ppm", "% LEL", "% vol", "mg/m3"].map((item) => ({ value: item, label: item })), gas.unit || "ppm"))) + "</div>" +
    '<div class="sm:col-span-2"><button type="button" data-action="remove-gas-row" data-id="' + index + '" class="rounded-md border border-slate-300 px-3 py-2 text-sm">Remove</button></div></div>';
}

function pageCylinders(route) {
  if (route.id === "new") return cylinderForm();
  if (route.mode === "edit") return cylinderForm(Store.cylinder(route.id));
  if (route.id) return cylinderDetail(route.id);
  return pageStock();
}

function cylinderForm(cylinder) {
  const locked = cylinder && Store.state().certificates.some((item) => item.cylinderId === cylinder.id && item.status === "Issued");
  if (locked) return cylinderDetail(cylinder.id);
  const key = cylinder ? cylinder.id : "new-cylinder";
  const gases = rememberGases(key, cylinder ? cylinder.gases.map((gas) => ({ gas: gas.gas, concentration: gas.concentration, unit: gas.unit })) : [{ gas: "", concentration: "", unit: "ppm" }]);
  const value = cylinder || {};
  return heading(cylinder ? "Edit cylinder" : "New cylinder", "Enter only the gases printed on the cylinder certificate.", linkButton("Back", "#/stock", "ghost")) +
    '<form data-form="' + (cylinder ? "updateCylinder" : "addCylinder") + '" data-gas-key="' + esc(key) + '" class="mx-auto max-w-4xl">' +
    (cylinder ? '<input type="hidden" name="id" value="' + esc(cylinder.id) + '" />' : "") +
    card('<div class="grid gap-4 sm:grid-cols-2">' +
      field("Cylinder number", textInput("number", value.number)) +
      field("Expiry", textInput("expiry", value.expiry, 'type="date"')) +
      field("Supplier", textInput("supplier", value.supplier)) +
      field("Gas certificate number", textInput("gasCertNo", value.gasCertNo)) +
      "</div><div class=\"mt-4\">" + gases.map(gasEditorRow).join("") + "</div>" +
      '<button type="button" data-action="add-gas-row" class="mt-3 rounded-md border border-slate-300 px-3 py-2 text-sm">Add gas</button>' +
      '<div class="mt-5">' + button("Save cylinder") + "</div>") + "</form>";
}

function cylinderDetail(id) {
  const cylinder = Store.cylinder(id);
  if (!cylinder) return pageMissing();
  const locked = Store.state().certificates.some((item) => item.cylinderId === id && item.status === "Issued");
  const statuses = ["In stock", "Empty", "Quarantined", "Expired"].filter((item) => item !== cylinder.status).map((item) => whenCan("stock", '<button type="button" data-action="cylinder-status" data-id="' + id + '" data-status="' + item + '" class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">' + item + "</button>")).join("");
  return heading(cylinder.number, cylinder.kind, linkButton("Stock", "#/stock", "ghost") + (Store.can("stock") && !locked ? linkButton("Edit", "#/cylinders/" + id + "/edit", "ghost") : "")) +
    paperRecord(cylinder.number, [
      ["Status", badge(cylinder.status)],
      ["Expiry", pretty(cylinder.expiry)],
      ["Supplier", esc(cylinder.supplier || "—")],
      ["Gas certificate", esc(cylinder.gasCertNo || "—")],
      ["Gases", esc(cylinder.gases.map((gas) => gas.gas + " " + gas.concentration + " " + gas.unit).join(", "))],
    ]) +
    (locked ? '<p class="mt-4 text-sm text-slate-600">An issued certificate uses these certified values, so the gases stay as recorded. Change the status if the cylinder is emptied, quarantined, or expired.</p>' : "") +
    '<div class="mt-4 flex flex-wrap gap-2">' + statuses + '<button type="button" data-action="download" data-kind="cylinder" data-id="' + id + '" class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">Download</button></div>';
}

function pageSpares(route) {
  if (route.id === "new") return spareForm();
  if (route.mode === "edit") return spareForm(Store.spare(route.id));
  if (route.id) return spareDetail(route.id);
  return pageStock();
}

function spareForm(spare) {
  const value = spare || { qty: 0, reorder: 0 };
  return heading(spare ? "Edit spare" : "New spare", "", linkButton("Back", "#/stock", "ghost")) +
    '<form data-form="' + (spare ? "updateSpare" : "addSpare") + '" class="mx-auto max-w-3xl">' +
    (spare ? '<input type="hidden" name="id" value="' + esc(spare.id) + '" />' : "") +
    card('<div class="grid gap-4 sm:grid-cols-2">' +
      field("Code", textInput("code", value.code)) +
      field("Name", textInput("name", value.name)) +
      field("Type", selectInput("kind", optionList(["Sensor", "Spare part", "Consumable"].map((item) => ({ value: item, label: item })), value.kind || "Spare part"))) +
      (spare ? "" : field("Quantity received", textInput("qty", value.qty, 'inputmode="numeric"'))) +
      field("Reorder at", textInput("reorder", value.reorder, 'inputmode="numeric"')) +
      "</div><div class=\"mt-5\">" + button("Save item") + "</div>") + "</form>";
}

function spareDetail(id) {
  const spare = Store.spare(id);
  if (!spare) return pageMissing();
  const move = Store.can("stock")
    ? '<form data-form="moveSpare" class="mt-6">' + card('<h2 class="font-semibold">Stock movement</h2><input type="hidden" name="id" value="' + esc(id) + '" /><div class="mt-4 grid gap-4 sm:grid-cols-2">' +
      field("Quantity", textInput("qty", "", 'inputmode="numeric"')) +
      field("Direction", selectInput("direction", optionList([{ value: "in", label: "Receive" }, { value: "out", label: "Issue" }], "in"))) +
      "</div><div class=\"mt-4\">" + button("Update stock") + "</div>") + "</form>"
    : "";
  return heading(spare.name, spare.code, linkButton("Stock", "#/stock", "ghost") + whenCan("stock", linkButton("Edit", "#/spares/" + id + "/edit", "ghost"))) +
    paperRecord(spare.code, [
      ["Type", esc(spare.kind || "Spare part")],
      ["On hand", String(spare.qty)],
      ["Reorder at", String(spare.reorder)],
      ["Position", spare.qty <= spare.reorder ? badge("Reorder") : badge("In stock")],
    ]) + move +
    '<div class="mt-4"><button type="button" data-action="download" data-kind="spare" data-id="' + id + '" class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">Download</button></div>';
}

function pageGst() {
  const periods = Store.gstrPeriods();
  const selected = UI.gstPeriod && periods.includes(UI.gstPeriod) ? UI.gstPeriod : periods[0] || "";
  UI.gstPeriod = selected;
  if (!periods.length) return heading("GST", "GSTR-1 is filed on the GST portal by the authorised signatory. This page prepares the outward-supply list and stores the ARN you receive.") + emptyState("No invoice periods", "Invoices appear here in the month they are dated.", linkButton("Invoices", "#/invoices", "ghost"));
  const filing = Store.state().gst[selected] || {};
  const invoices = Store.gstrRows(selected);
  const page = slicePage("gst", invoices);
  const body = page.rows.map((item) => cells([
    '<a class="font-medium text-[#0B2540] hover:underline" href="#/invoices/' + item.id + '">' + esc(item.number) + "</a>",
    esc((Store.customer(item.customerId) || {}).gstin || "—"),
    pretty(item.date),
    Store.rupees(item.taxablePaise),
    Store.rupees(item.igstPaise || item.cgstPaise + item.sgstPaise),
    esc(item.irn || "—"),
    rowActions({ id: item.id, view: "#/invoices/" + item.id, download: "invoice" }),
  ])).join("");
  const choices = periods.map((period) => '<button type="button" data-action="gst-period" data-id="' + period + '" class="rounded-md px-3 py-1.5 text-sm ' + (period === selected ? "bg-teal-700 text-white" : "border border-slate-300 bg-white text-slate-700") + '">' + esc(period) + "</button>").join("");
  const record = Store.can("gst")
    ? '<form data-form="recordGstFiling" class="mt-6">' + card('<h2 class="font-semibold">Record the portal filing</h2><p class="mt-1 text-sm leading-6 text-slate-600">File GSTR-1 on gst.gov.in or through your GST Suvidha Provider, then enter the ARN from the acknowledgement. This application does not file the return and does not create an ARN.</p><input type="hidden" name="period" value="' + esc(selected) + '" /><div class="mt-4 grid gap-4 sm:grid-cols-2">' +
      field("ARN", textInput("arn", filing.arn || "")) +
      field("Filed on", textInput("filedAt", filing.filedAt || Store.today(), 'type="date"')) +
      "</div><div class=\"mt-4\">" + button("Save ARN") + "</div>") + "</form>"
    : "";
  const issues = Store.gstChecks(selected);
  const errors = issues.filter((item) => item.level === "error");
  const checkRows = issues.map((item) => '<li class="flex items-start gap-3 border-b border-[#e4e7ea] py-3 text-sm last:border-0"><span class="pill pill-' + (item.level === "error" ? "bad" : "warn") + '">' + (item.level === "error" ? "Error" : "Check") + '</span><span class="min-w-0">' + (item.invoiceId ? '<a class="font-medium text-[#0B2540] hover:underline" href="#/invoices/' + item.invoiceId + '">' + esc(item.number) + "</a> · " : '<span class="font-medium text-[#0B2540]">' + esc(item.number) + "</span> · ") + esc(item.text) + "</span></li>").join("");
  const checks = card('<div class="flex flex-wrap items-center justify-between gap-3"><div><h2 class="font-semibold text-[#0B2540]">Pre-filing check</h2><p class="mt-1 text-sm text-[#6b7580]">GSTIN, SAC, tax split and rate are checked for ' + esc(selected) + " before you file.</p></div>" + (issues.length ? '<span class="pill pill-' + (errors.length ? "bad" : "warn") + '">' + errors.length + " error" + (errors.length === 1 ? "" : "s") + " · " + (issues.length - errors.length) + " to check</span>" : '<span class="pill pill-good">Ready to file</span>') + "</div>" + (issues.length ? '<ul class="mt-3">' + checkRows + "</ul>" : '<p class="mt-3 text-sm text-[#067647]">All invoices in this period pass. Download the JSON and file on the GST portal.</p>') );
  const track = Store.gstTrack();
  const ownRows = track.own.map((item) => cells([
    esc(item.period), String(item.count), Store.rupees(item.taxable), Store.rupees(item.tax), badge(item.status), esc(item.arn || "—"), item.filedAt ? pretty(item.filedAt) : "—", item.issues ? '<span class="pill pill-bad">' + item.issues + "</span>" : "—",
  ])).join("");
  const custRows = track.customers.map((item) => cells([
    '<a class="font-medium text-[#0B2540] hover:underline" href="#/customers/' + item.id + '">' + esc(item.name) + "</a>", esc(item.gstin), esc(item.gstr1 || "Not recorded"), esc(item.gstr3b || "Not recorded"), item.checked ? pretty(item.checked) : "Never", item.risk ? '<span class="pill pill-bad">Missed filing</span>' : item.stale ? '<span class="pill pill-warn">Re-check</span>' : '<span class="pill pill-good">OK</span>',
  ])).join("");
  const trackPanel = '<section class="mt-8">' + sectionTitle("GST track record") + '<p class="mb-3 text-sm text-[#6b7580]">Your own filing status by month, and the filing status you noted for each customer GSTIN. Re-check a customer on the GST portal when it is older than 30 days.</p>' +
    dataTable(["Period", "Invoices", "Taxable", "Tax", "GSTR-1", "ARN", "Filed on", "Errors"], ownRows, "gst-own", slicePage("gst-own", track.own)) +
    '<div class="mt-6">' + (custRows ? dataTable(["Customer", "GSTIN", "GSTR-1 noted", "GSTR-3B noted", "Checked", "Flag"], custRows, "gst-cust", slicePage("gst-cust", track.customers)) : card('<p class="text-sm text-[#6b7580]">No customer has a GSTIN yet.</p>')) + "</div></section>";
  return heading("GST", "Outward supplies for " + selected + ". " + (filing.status === "Filed" ? "ARN " + filing.arn + " recorded on " + pretty(filing.filedAt) + "." : "Not yet recorded as filed.")) +
    '<div class="mb-4 flex flex-wrap gap-2">' + choices + '<button type="button" data-action="download" data-kind="gst" data-id="' + esc(selected) + '" class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">Download JSON</button><button type="button" data-action="download" data-kind="tally" data-id="' + esc(selected) + '" class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">Export to Tally (XML)</button></div>' +
    '<div class="mb-6">' + checks + "</div>" +
    dataTable(["Invoice", "Customer GSTIN", "Date", "Taxable", "Tax", "IRN", "Actions"], body, "gst", page) + record + trackPanel;
}

function pageMail(route) {
  if (route.id && route.mode === "edit") return mailForm(Store.mail(route.id));
  if (route.id) return mailDetail(route.id);
  const rows = filtered("mail", byStatus("mail", Store.state().mails), (item) => item.type + " " + item.to + " " + item.subject);
  const page = slicePage("mail", rows);
  const body = page.rows.map((item) => cells([
    esc(item.type),
    esc(item.to),
    '<a class="font-medium text-[#0B2540] hover:underline" href="#/mail/' + item.id + '">' + esc(item.subject) + "</a>",
    pretty(item.at.slice(0, 10)),
    badge(item.status),
    rowActions({ id: item.id, view: "#/mail/" + item.id, edit: "#/mail/" + item.id + "/edit", del: "delete-mail", download: "mail" }),
  ])).join("");
  if (!Store.state().mails.length) return heading("Mail", "Messages are prepared here and opened in your mail application. Nothing is marked sent until you send it yourself.") + emptyState("No messages", "Chases, quotations, certificates, visit packs, and reminders appear in this log.", "");
  return heading("Mail", "Open a message to hand it to your mail application. Status stays Prepared until you do.") + toolbar("mail", "Search recipient or subject", ["Prepared", "Opened in mail app", "Opened in WhatsApp"]) + dataTable(["Type", "To", "Subject", "Date", "Status", "Actions"], body, "mail", page);
}

function mailDetail(id) {
  const mail = Store.mail(id);
  if (!mail) return pageMissing();
  return heading(mail.subject, mail.type, linkButton("Mail log", "#/mail", "ghost") + linkButton("Edit", "#/mail/" + id + "/edit", "ghost")) +
    card('<dl class="grid gap-2 text-sm sm:grid-cols-2"><div><dt class="text-slate-500">To</dt><dd>' + esc(mail.to) + "</dd></div><div><dt class=\"text-slate-500\">Status</dt><dd>" + badge(mail.status) + "</dd></div></dl><pre class=\"mt-4 whitespace-pre-wrap rounded-md bg-slate-50 p-4 text-sm leading-6 text-slate-800\">" + esc(mail.body) + "</pre>" +
      '<div class="mt-4 flex flex-wrap gap-2"><button type="button" data-action="open-mail" data-id="' + id + '" class="rounded-md bg-teal-700 px-3 py-2 text-sm font-medium text-white">Open in mail app</button>' + (Store.state().settings.whatsapp ? '<button type="button" data-action="open-whatsapp" data-id="' + id + '" class="rounded-md border border-[#0F766E] bg-white px-3 py-2 text-sm font-medium text-[#0F766E]">Send on WhatsApp</button>' : "") + '<button type="button" data-action="download" data-kind="mail" data-id="' + id + '" class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">Download</button></div>');
}

function mailForm(mail) {
  if (!mail) return pageMissing();
  return heading("Edit message", "Correct the recipient or wording before you open it in your mail application.", linkButton("Back", "#/mail/" + mail.id, "ghost")) +
    '<form data-form="updateMail" class="mx-auto max-w-3xl"><input type="hidden" name="id" value="' + esc(mail.id) + '" />' +
    card('<div class="grid gap-4">' +
      field("To", textInput("to", mail.to, 'type="email"')) +
      field("Subject", textInput("subject", mail.subject)) +
      field("Message", areaInput("body", mail.body)) +
      "</div><div class=\"mt-5\">" + button("Save message") + "</div>") + "</form>";
}

function pageReports() {
  const today = Store.today();
  const due = Store.state().instruments.filter((item) => item.due && Store.diffDays(today, item.due) <= 30);
  const rows = filtered("reports", due, (item) => item.serial + " " + ((Store.customer(item.customerId) || {}).tradeName || ""));
  const page = slicePage("reports", rows);
  const body = page.rows.map((item) => cells([
    '<a class="font-medium text-[#0B2540] hover:underline" href="#/instruments/' + item.id + '">' + esc(item.serial) + "</a>",
    esc((Store.customer(item.customerId) || {}).tradeName || "—"),
    esc(item.family),
    pretty(item.due),
    dueBadge(item.due),
    rowActions({ id: item.id, view: "#/instruments/" + item.id, edit: Store.can("instrument") ? "#/instruments/" + item.id + "/edit" : "", download: "instrument" }),
  ])).join("");
  const unpaid = Store.state().invoices.filter((item) => item.status !== "Cancelled" && Store.balanceOf(item) > 0);
  const unpaidPage = slicePage("report-unpaid", unpaid);
  const unpaidBody = unpaidPage.rows.map((item) => cells([
    '<a class="font-medium text-[#0B2540] hover:underline" href="#/invoices/' + item.id + '">' + esc(item.number) + "</a>",
    esc((Store.customer(item.customerId) || {}).tradeName || "—"),
    pretty(item.due),
    Store.rupees(Store.balanceOf(item)),
    badge(item.status),
    rowActions({ id: item.id, view: "#/invoices/" + item.id, download: "invoice" }),
  ])).join("");
  return heading("Reports", "Instruments due within 30 days, and invoices that still have a balance.", '<button type="button" data-action="download" data-kind="report" data-id="due" class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">Download due list</button>') +
    "<h2 class=\"mb-3 text-lg font-semibold\">Calibration due</h2>" +
    (due.length ? toolbar("reports", "Search serial or customer") + dataTable(["Serial", "Customer", "Family", "Due", "Status", "Actions"], body, "reports", page) : card('<p class="text-sm text-slate-600">No instruments are due in the next 30 days.</p>')) +
    "<h2 class=\"mb-3 mt-8 text-lg font-semibold\">Outstanding invoices</h2>" +
    (unpaid.length ? dataTable(["Invoice", "Customer", "Due", "Balance", "Status", "Actions"], unpaidBody, "report-unpaid", unpaidPage) : card('<p class="text-sm text-slate-600">No outstanding balances.</p>'));
}

function settingsLink(id, label, section, userId) {
  const on = section === id;
  const href = "#/settings?section=" + id + (id === "users" && userId ? "&user=" + encodeURIComponent(userId) : "");
  const tone = on ? "border-[#e4e7ea] bg-white font-medium text-[#0B2540]" : "border-transparent text-[#6b7580] hover:bg-white hover:text-[#0B2540]";
  return '<a href="' + href + '" class="inline-flex h-9 shrink-0 items-center rounded-lg border px-3 text-sm ' + tone + '">' + label + "</a>";
}

function settingsMenu(section, admin, userId) {
  const items = admin
    ? [["company", "Company"], ["tax", "Tax"], ["rates", "Rates"], ["reminders", "Reminders"], ["compliance", "Compliance"], ["users", "Users"], ["backup", "Backup"]]
    : [["users", "Account"]];
  return '<nav class="mb-6 flex gap-1 overflow-x-auto lg:sticky lg:top-20 lg:mb-0 lg:flex-col">' + items.map((item) => settingsLink(item[0], item[1], section, userId)).join("") + "</nav>";
}

function pageSettings(route) {
  const current = Store.user();
  const admin = current && current.role === "admin";
  const params = (route && route.params) || {};
  const allowed = admin ? ["company", "tax", "rates", "reminders", "compliance", "users", "backup"] : ["users"];
  let section = params.section || (params.user ? "users" : allowed[0]);
  if (!allowed.includes(section)) section = allowed[0];
  const firm = company();
  const settings = Store.state().settings;
  const rates = Store.state().rates;
  const copy = {
    company: "Legal name, address, and bank details.",
    tax: "SAC and GST used on quotations and invoices.",
    rates: "Prices used when an accepted quotation does not set the line.",
    reminders: "Credit days, chases, and reminder timing.",
    compliance: "NABL, turnover, and WhatsApp reminders.",
    users: admin ? "People who can sign in." : "Your signature is applied to certificates you issue.",
    backup: "Export, restore, or erase the records in this browser.",
  };
  let panel = "";
  if (section === "company") {
    panel = '<form data-form="saveSettings">' + card('<input type="hidden" name="section" value="company" /><h2 class="font-semibold">Company</h2><div class="mt-4 grid gap-4 sm:grid-cols-2">' +
      field("Legal name", textInput("legalName", firm.legalName)) +
      field("Trade name", textInput("tradeName", firm.name)) +
      field("Email", textInput("email", firm.email, 'type="email"')) +
      field("Planner email", textInput("plannerEmail", firm.plannerEmail, 'type="email"')) +
      field("Phone", textInput("phone", firm.phone)) +
      field("GSTIN", textInput("gstin", firm.gstin)) +
      field("State", textInput("state", firm.state)) +
      field("State code", textInput("stateCode", firm.stateCode)) +
      '<div class="sm:col-span-2">' + field("Address", textInput("address", firm.address)) + "</div>" +
      field("Bank details", textInput("bank", firm.bank)) +
      field("Signatory", textInput("signatory", firm.signatory)) +
      "</div><div class=\"mt-4\">" + button("Save company") + "</div>") + "</form>";
  }
  if (section === "tax") {
    panel = '<form data-form="saveSettings">' + card('<input type="hidden" name="section" value="tax" /><h2 class="font-semibold">Tax</h2><div class="mt-4 grid gap-4 sm:grid-cols-2">' +
      field("SAC", textInput("sac", settings.sac)) +
      field("GST %", textInput("gstRate", settings.gstRate, 'inputmode="decimal"')) +
      field("E-invoice applies", selectInput("eInvoice", optionList([{ value: "no", label: "No" }, { value: "yes", label: "Yes, IRN is pasted onto the invoice" }], settings.eInvoice ? "yes" : "no"))) +
      "</div><div class=\"mt-4\">" + button("Save tax") + "</div>") + "</form>";
  }
  if (section === "rates") {
    panel = '<form data-form="saveSettings">' + card('<input type="hidden" name="section" value="rates" /><h2 class="font-semibold">Rates</h2><div class="mt-4 grid gap-4 sm:grid-cols-2">' +
      field("Portable monitor rate (₹)", moneyInput("rate_Portable monitor", (rates["Portable monitor"] / 100).toFixed(2))) +
      field("Fixed monitor rate (₹)", moneyInput("rate_Fixed monitor", (rates["Fixed monitor"] / 100).toFixed(2))) +
      field("Area monitor rate (₹)", moneyInput("rate_Area monitor", (rates["Area monitor"] / 100).toFixed(2))) +
      field("Site visit rate (₹)", moneyInput("rate_Site visit", (rates["Site visit"] / 100).toFixed(2))) +
      '</div><p class="mt-3 text-xs leading-5 text-slate-500">Rates start at zero. A certificate cannot be issued until the family rate, or the accepted quotation line, is greater than zero.</p><div class="mt-4">' + button("Save rates") + "</div>") + "</form>";
  }
  if (section === "reminders") {
    panel = '<form data-form="saveSettings">' + card('<input type="hidden" name="section" value="reminders" /><h2 class="font-semibold">Reminders</h2><div class="mt-4 grid gap-4 sm:grid-cols-2">' +
      field("Credit days", textInput("creditDays", settings.creditDays, 'inputmode="numeric"')) +
      field("Payment reminder every (days)", textInput("paymentEveryDays", settings.paymentEveryDays, 'inputmode="numeric"')) +
      field("Confirmation chase every (days)", textInput("chaseEveryDays", settings.chaseEveryDays, 'inputmode="numeric"')) +
      field("Due reminder lead (days)", textInput("dueLeadDays", settings.dueLeadDays, 'inputmode="numeric"')) +
      field("Quotation validity (days)", textInput("quotationValidityDays", settings.quotationValidityDays, 'inputmode="numeric"')) +
      "</div><div class=\"mt-4\">" + button("Save reminders") + "</div>") + "</form>";
  }
  if (section === "compliance") {
    panel = '<form data-form="saveSettings">' + card('<input type="hidden" name="section" value="compliance" /><h2 class="font-semibold">Compliance</h2><div class="mt-4 grid gap-4 sm:grid-cols-2">' +
      field("NABL accredited", selectInput("nabl", optionList([{ value: "no", label: "No" }, { value: "yes", label: "Yes, print the NABL line on certificates" }], settings.nabl ? "yes" : "no"))) +
      field("NABL accreditation number", textInput("nablNo", settings.nablNo || "", 'placeholder="TC-0000"')) +
      field("Annual turnover above ₹5 crore", selectInput("turnover5cr", optionList([{ value: "no", label: "No" }, { value: "yes", label: "Yes, e-invoice (IRN) is mandatory" }], settings.turnover5cr ? "yes" : "no"))) +
      field("WhatsApp reminders", selectInput("whatsapp", optionList([{ value: "yes", label: "On, show Send on WhatsApp on messages" }, { value: "no", label: "Off" }], settings.whatsapp ? "yes" : "no"))) +
      '</div><p class="mt-3 text-xs leading-5 text-slate-500">NABL changes the certificate heading. Turnover decides whether e-invoice applies, and the GST pre-filing check warns when e-invoice is off. WhatsApp opens a chat with the customer, and you press send. Customers need a mobile number.</p><div class="mt-4">' + button("Save compliance") + "</div>") + "</form>";
  }
  if (section === "users") {
    const users = Store.state().users;
    const userPage = slicePage("users", users);
    const userRows = userPage.rows.map((item) => cells([
      esc(item.name),
      esc(item.email),
      esc(item.role),
      item.signature ? badge("Saved") : badge("Empty"),
      rowActions({
        id: item.id,
        view: "#/settings?section=users&user=" + item.id,
        edit: admin || item.id === current.id ? "#/settings?section=users&user=" + item.id : "",
        del: admin && item.id !== current.id ? "delete-user" : "",
        download: "user",
      }),
    ])).join("");
    const requested = params.user ? users.find((item) => item.id === params.user) : null;
    const editing = requested && (admin || requested.id === current.id) ? requested : null;
    const userForm = (editing ? userEditor(editing, admin) : "") + (admin ? userEditor(null, true) : editing ? "" : userEditor(current, false));
    panel = (admin && users.length ? dataTable(["Name", "Email", "Role", "Signature", "Actions"], userRows, "users", userPage) : "") +
      '<div class="mt-6">' + userForm + "</div>";
  }
  if (section === "backup") {
    panel = card('<h2 class="font-semibold">Backup</h2><p class="mt-2 text-sm leading-6 text-slate-600">Export the records stored in this browser. Import replaces them and signs you out. Erase removes the installation, including users.</p><div class="mt-4 flex flex-wrap gap-2"><button type="button" data-action="export-backup" class="rounded-md bg-teal-700 px-3 py-2 text-sm font-medium text-white">Download backup</button><button type="button" data-action="erase-installation" class="rounded-md border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700">Erase installation</button></div><form data-form="importBackup" class="mt-4 flex flex-wrap items-end gap-3"><label class="block text-sm font-medium text-slate-700">Restore a backup<input type="file" name="backup" accept="application/json,.json" class="mt-1 block text-sm" /></label><button class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium" type="submit">Import</button></form>');
  }
  return heading("Settings", copy[section] || "") +
    '<div class="lg:grid lg:grid-cols-[11rem_minmax(0,1fr)] lg:items-start lg:gap-8">' +
    settingsMenu(section, admin, params.user || "") +
    "<div>" + panel + "</div></div>";
}

function userEditor(account, admin) {
  const value = account || { role: "engineer" };
  const roles = optionList([
    { value: "admin", label: "Administrator" },
    { value: "planner", label: "Planner" },
    { value: "engineer", label: "Service engineer" },
    { value: "accounts", label: "Accounts" },
    { value: "approver", label: "Approver" },
  ], value.role || "engineer");
  return '<form data-form="' + (account ? "updateUser" : "addUser") + '">' + card(
    "<h2 class=\"font-semibold\">" + (account ? "Edit " + esc(account.name) : "Add user") + "</h2>" +
    (account ? '<input type="hidden" name="id" value="' + esc(account.id) + '" />' : "") +
    '<div class="mt-4 grid gap-4 sm:grid-cols-2">' +
    (admin ? field("Name", textInput("name", value.name)) + field("Email", textInput("email", value.email, 'type="email"')) + field("Title", textInput("title", value.title)) + field("Role", selectInput("role", roles)) : '<p class="text-sm text-slate-600 sm:col-span-2">' + esc(value.name) + " · " + esc(value.email) + "</p>") +
    field(account ? "New password" : "Password", textInput("password", "", 'type="password" autocomplete="new-password" placeholder="' + (account ? "Leave blank to keep" : "At least 8 characters") + '"')) +
    field("Signature type", selectInput("signatureType", optionList([{ value: "image", label: "Scanned image" }, { value: "dsc", label: "Digital signature (DSC)" }], value.signatureType || "image"))) +
    field("DSC serial number", textInput("dscSerial", value.dscSerial || "", 'placeholder="Only for DSC"')) +
    field("DSC valid till", textInput("dscValid", value.dscValid || "", 'type="date"')) +
    '<label class="block text-sm font-medium text-slate-700">Signature image<input type="file" name="signature" accept="image/png,image/jpeg,image/webp" class="mt-1 block w-full text-sm" /></label>' +
    (account && account.signature ? '<img src="' + account.signature + '" alt="Current signature" class="h-16 w-auto" />' : "") +
    "</div><div class=\"mt-4\">" + button(account ? "Save user" : "Add user") + "</div>"
  ) + "</form>";
}
