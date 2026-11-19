function paperShell(kicker, body) {
  const firm = company();
  return '<article class="rounded-[10px] border border-[#e4e7ea] bg-white p-5 sm:p-8"><div class="flex flex-wrap items-start justify-between gap-4 border-b border-[#e4e7ea] pb-4"><div><p class="text-[11px] font-semibold uppercase tracking-[.06em] text-[#0B2540]">' + esc(firm.legalName) + '</p><p class="mt-1 text-xs leading-5 text-[#6b7580]">' + esc(firm.address) + (firm.gstin ? "<br />GSTIN " + esc(firm.gstin) : "") + "<br />" + esc(firm.phone) + (firm.phone ? " · " : "") + esc(firm.email) + '</p></div><p class="text-sm font-semibold text-[#0B2540]">' + kicker + "</p></div>" + body + "</article>";
}

function paperCertificate(cert) {
  const customer = Store.customer(cert.customerId);
  const engineer = Store.state().users.find((item) => item.id === cert.engineerId);
  const rows = (cert.gases || []).map((gas) => "<tr><td class=\"px-3 py-2\">" + esc(gas.gas) + "</td><td class=\"px-3 py-2\">" + esc(gas.concentration) + " " + esc(gas.unit) + "</td><td class=\"px-3 py-2\">" + esc(gas.asFound || "—") + "</td><td class=\"px-3 py-2\">" + esc(gas.asLeft || "—") + "</td></tr>").join("");
  const settings = Store.state().settings;
  const dsc = engineer && engineer.signatureType === "dsc" && engineer.dscSerial
    ? '<p class="mt-1 text-[11px] leading-4 text-emerald-800">Digitally signed (DSC)<br />Serial ' + esc(engineer.dscSerial) + (engineer.dscValid ? "<br />Valid till " + pretty(engineer.dscValid) : "") + "</p>"
    : "";
  const signature = (engineer && engineer.signature
    ? '<img src="' + engineer.signature + '" alt="Signature of ' + esc(engineer.name) + '" class="mx-auto h-16 w-auto" />'
    : (dsc ? "" : '<p class="text-sm text-slate-500">Signature is applied when the engineer has uploaded one.</p>')) + dsc;
  const nabl = settings.nabl
    ? '<p class="mt-3 inline-block rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700">NABL accredited laboratory' + (settings.nablNo ? " · Accreditation No. " + esc(settings.nablNo) : "") + "</p>"
    : "";
  return paperShell("Calibration certificate",
    '<div class="mt-5 flex flex-wrap items-start justify-between gap-4"><div>' + badge(cert.status || "Draft") + " " + badge(cert.family) + '<h2 class="mt-2 text-xl font-semibold text-slate-950">' + esc(cert.number || "Draft") + '</h2>' + nabl + '<p class="mt-1 text-sm text-slate-600">' + esc(customer ? customer.legalName : "") + "<br />" + esc(customer ? customer.site : "") + '</p></div><dl class="text-sm leading-7 text-slate-700"><div><span class="text-slate-500">Calibration date</span> ' + pretty(cert.calibrationDate) + "</div><div><span class=\"text-slate-500\">Interval</span> " + esc(cert.interval ? cert.interval + " months" : "—") + "</div><div><span class=\"text-slate-500\">Due date</span> " + pretty(cert.dueDate) + "</div><div><span class=\"text-slate-500\">Serial</span> " + esc(cert.serial) + "</div><div><span class=\"text-slate-500\">Work order</span> " + esc(cert.woNumber || "—") + " · " + pretty(cert.woDate) + "</div><div><span class=\"text-slate-500\">Cylinder</span> " + esc(cert.cylinderNumber || "—") + "</div><div><span class=\"text-slate-500\">Gas certificate</span> " + esc(cert.gasCertNo || "—") + "</div></dl></div>" +
    '<table class="mt-6 w-full text-left text-sm"><thead class="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><tr><th class="px-3 py-2">Gas</th><th class="px-3 py-2">Certified concentration</th><th class="px-3 py-2">As found</th><th class="px-3 py-2">As left</th></tr></thead><tbody>' + (rows || "<tr><td class=\"px-3 py-2\" colspan=\"4\">No gases recorded</td></tr>") + "</tbody></table>" +
    (cert.notes ? '<p class="mt-4 text-sm text-slate-600">' + esc(cert.notes) + "</p>" : "") +
    '<div class="mt-8 flex items-end justify-between gap-4"><p class="max-w-sm text-xs leading-5 text-slate-500">The due date is the calibration date plus the selected interval. Concentrations are taken from the cylinder record.</p><div class="text-center">' + signature + '<p class="text-sm font-medium">' + esc(engineer ? engineer.name : "") + '</p><p class="text-xs text-slate-500">' + esc(engineer ? engineer.title : "") + "</p></div></div>");
}

function moneyTable(lines) {
  return '<table class="mt-4 w-full text-left text-sm"><thead class="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><tr><th class="px-3 py-2">Description</th><th class="px-3 py-2">Qty</th><th class="px-3 py-2">Rate</th><th class="px-3 py-2 text-right">Amount</th></tr></thead><tbody>' +
    lines.map((line) => "<tr class=\"border-b border-slate-100\"><td class=\"px-3 py-2\">" + esc(line.detail || line.family) + "<br /><span class=\"text-xs text-slate-500\">" + esc(line.family || "") + "</span></td><td class=\"px-3 py-2\">" + esc(line.qty) + "</td><td class=\"px-3 py-2\">" + Store.rupees(line.ratePaise) + "</td><td class=\"px-3 py-2 text-right\">" + Store.rupees(line.qty * line.ratePaise) + "</td></tr>").join("") +
    "</tbody></table>";
}

function taxLines(doc) {
  const total = doc.totalPaise != null ? doc.totalPaise : doc.taxablePaise + doc.cgstPaise + doc.sgstPaise + doc.igstPaise;
  const rows = [["Taxable value", doc.taxablePaise], ["CGST", doc.cgstPaise], ["SGST", doc.sgstPaise], ["IGST", doc.igstPaise]].filter((row) => row[1]);
  return '<div class="ml-auto mt-4 w-full max-w-xs text-sm text-slate-700">' + rows.map((row) => '<p class="flex justify-between gap-6 py-1"><span>' + row[0] + "</span><span>" + Store.rupees(row[1]) + "</span></p>").join("") + '<p class="mt-1 flex justify-between gap-6 border-t border-slate-200 pt-2 text-base font-semibold text-slate-950"><span>Total</span><span>' + Store.rupees(total) + "</span></p></div>";
}

function paperQuote(quote) {
  const customer = Store.customer(quote.customerId);
  return paperShell("Quotation " + esc(quote.number),
    '<div class="mt-5 flex flex-wrap justify-between gap-4 text-sm"><div><p class="font-medium text-slate-950">' + esc(customer ? customer.legalName : "") + '</p><p class="text-slate-600">' + esc(customer ? customer.address : "") + "<br />GSTIN " + esc(customer && customer.gstin ? customer.gstin : "—") + "</p></div><div class=\"text-right text-slate-600\"><p>" + pretty(quote.date) + "</p><p>Valid until " + pretty(quote.validUntil) + "</p><p class=\"mt-1\">" + badge(quote.status) + "</p></div></div>" +
    moneyTable(quote.lines) + taxLines(quote) +
    (quote.notes ? '<p class="mt-4 text-sm text-slate-600">' + esc(quote.notes) + "</p>" : "") +
    '<p class="mt-6 text-xs leading-5 text-slate-500">SAC ' + esc(Store.state().settings.sac) + ". " + esc(company().bank || "") + "</p>");
}

function paperInvoice(invoice) {
  const customer = Store.customer(invoice.customerId);
  return paperShell("Tax invoice " + esc(invoice.number),
    '<div class="mt-5 flex flex-wrap justify-between gap-4 text-sm"><div><p class="text-xs uppercase tracking-wide text-slate-500">Bill to</p><p class="font-medium text-slate-950">' + esc(customer ? customer.legalName : "") + '</p><p class="text-slate-600">' + esc(customer ? customer.address : "") + "<br />GSTIN " + esc(customer && customer.gstin ? customer.gstin : "—") + "<br />" + esc(customer ? customer.state : "") + '</p></div><div class="text-right text-slate-600"><p>' + pretty(invoice.date) + "</p><p>Due " + pretty(invoice.due) + "</p><p class=\"mt-1\">" + badge(invoice.status) + "</p><p>Balance " + Store.rupees(Store.balanceOf(invoice)) + "</p></div></div>" +
    moneyTable(invoice.lines.map((line) => Object.assign({ family: Store.state().settings.sac }, line))) + taxLines(invoice) +
    (invoice.irn ? '<p class="mt-4 break-all text-xs text-slate-600">IRN ' + esc(invoice.irn) + "</p>" : "") +
    (invoice.notes ? '<p class="mt-2 text-sm text-slate-600">' + esc(invoice.notes) + "</p>" : "") +
    '<p class="mt-6 text-right text-sm text-slate-700">' + esc(company().signatory || "") + "</p><p class=\"text-right text-xs text-slate-500\">" + esc(company().bank || "") + "</p>");
}

function paperRecord(title, pairs) {
  const rows = pairs.map((pair) => '<div class="grid grid-cols-1 gap-1 border-b border-slate-100 py-3 sm:grid-cols-3"><dt class="text-sm text-slate-500">' + esc(pair[0]) + '</dt><dd class="text-sm text-slate-900 sm:col-span-2">' + pair[1] + "</dd></div>").join("");
  return paperShell(title, '<dl class="mt-2">' + rows + "</dl>");
}

function downloadDocument(filename, title, innerHtml) {
  const html = "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>" + esc(title) + "</title><script src=\"https://cdn.tailwindcss.com\"><\\/script><style>body{margin:0;background:#f8fafc;color:#0f172a;font-family:ui-sans-serif,system-ui,sans-serif}article{max-width:840px;margin:24px auto}</style></head><body class=\"p-4\">" + innerHtml + "</body></html>";
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadText(filename, content, mime) {
  const blob = new Blob([content], { type: mime || "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
