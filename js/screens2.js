function quoteLineFromRow(row) {
  return {
    family: row.querySelector("[name=family]").value.trim(),
    detail: row.querySelector("[name=detail]").value,
    qty: row.querySelector("[name=qty]").value,
    rate: row.querySelector("[name=rate]").value,
  };
}

function moneyInput(name, value) {
  return textInput(name, value, 'inputmode="decimal" placeholder="0.00"');
}

function rememberLines(key, seed) {
  if (UI.quoteKey !== key || !UI.quoteLines) {
    UI.quoteKey = key;
    UI.quoteLines = seed;
  }
  return UI.quoteLines;
}

function quoteLineRow(line, index) {
  return '<div data-line class="grid gap-3 border-b border-slate-100 py-3 sm:grid-cols-12 sm:items-end">' +
    '<div class="sm:col-span-3">' + field("Type", textInput("family", line.family, 'list="quote-types" placeholder="Any type"')) + "</div>" +
    '<div class="sm:col-span-4">' + field("Description", textInput("detail", line.detail)) + "</div>" +
    '<div class="sm:col-span-1">' + field("Qty", textInput("qty", line.qty, 'inputmode="numeric"')) + "</div>" +
    '<div class="sm:col-span-2">' + field("Rate (₹)", moneyInput("rate", line.rate)) + "</div>" +
    '<div class="sm:col-span-2"><button type="button" data-action="remove-quote-line" data-id="' + index + '" class="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Remove</button></div></div>';
}

function pageQuotations(route) {
  if (route.id === "new") return quoteForm(null, route.params.enquiry || "");
  if (route.mode === "edit") return quoteForm(Store.quotation(route.id));
  if (route.id) return quoteDetail(route.id);
  const rows = filtered("quotations", byStatus("quotations", Store.state().quotations), (item) => item.number + " " + ((Store.customer(item.customerId) || {}).tradeName || "") + " " + item.status);
  const page = slicePage("quotations", rows);
  const body = page.rows.map((item) => {
    const locked = item.status === "Accepted" || item.status === "Rejected";
    return cells([
      '<a class="font-medium text-[#0B2540] hover:underline" href="#/quotations/' + item.id + '">' + esc(item.number) + "</a>",
      esc((Store.customer(item.customerId) || {}).tradeName || "—"),
      pretty(item.date),
      Store.rupees(item.taxablePaise + item.cgstPaise + item.sgstPaise + item.igstPaise),
      badge(item.status),
      rowActions({
        id: item.id,
        view: "#/quotations/" + item.id,
        edit: Store.can("quote") && !locked ? "#/quotations/" + item.id + "/edit" : "",
        del: Store.can("quote") && item.status !== "Accepted" ? "delete-quotation" : "",
        download: "quotation",
      }),
    ]);
  }).join("");
  const add = whenCan("quote", linkButton("New quotation", "#/quotations/new"));
  if (!Store.state().quotations.length) return heading("Quotations", "Prices are taken from the lines you enter. GST is added from the customer’s state.", add) + emptyState("No quotations", "Create a quotation after a confirmation, or start one directly.", add);
  return heading("Quotations", "Prices are taken from the lines you enter. GST is added from the customer’s state.", add) + toolbar("quotations", "Search number or customer", ["Draft", "Sent", "Accepted", "Rejected"]) + dataTable(["Quotation", "Customer", "Date", "Total", "Status", "Actions"], body, "quotations", page);
}

function quoteForm(quote, enquiryId) {
  if (quote && (quote.status === "Accepted" || quote.status === "Rejected")) return quoteDetail(quote.id);
  if (!Store.state().customers.length) return heading("New quotation", "") + emptyState("Add a customer first", "A quotation is addressed to a customer.", linkButton("Add customer", "#/customers/new"));
  const enquiry = enquiryId ? Store.enquiry(enquiryId) : null;
  const key = quote ? quote.id : "new:" + (enquiryId || "");
  const lines = rememberLines(key, quote ? quote.lines.map((line) => ({ family: line.family, detail: line.detail, qty: line.qty, rate: (line.ratePaise / 100).toFixed(2) })) : [{ family: "Portable monitor", detail: enquiry ? enquiry.summary : "", qty: 1, rate: "" }]);
  const customerId = quote ? quote.customerId : enquiry ? enquiry.customerId : "";
  return heading(quote ? "Edit " + quote.number : "New quotation", "Each line needs a rate in rupees. Set standard rates in Settings if you want them as a starting point.", linkButton("Back", quote ? "#/quotations/" + quote.id : "#/quotations", "ghost")) +
    '<form data-form="' + (quote ? "updateQuotation" : "addQuotation") + '" data-quote-key="' + esc(key) + '" class="mx-auto max-w-5xl">' +
    (quote ? '<input type="hidden" name="id" value="' + esc(quote.id) + '" />' : "") +
    '<datalist id="quote-types"><option value="Portable monitor"></option><option value="Fixed monitor"></option><option value="Area monitor"></option><option value="Site visit"></option></datalist>' +
    card(field("Customer", selectInput("customerId", customerOptions(customerId))) +
      '<div class="mt-4">' + lines.map(quoteLineRow).join("") + "</div>" +
      '<button type="button" data-action="add-quote-line" class="mt-3 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Add line</button>' +
      '<div class="mt-4">' + field("Notes", areaInput("notes", quote ? quote.notes : enquiry ? "From " + enquiry.source.toLowerCase() + " confirmation." : "")) + "</div>" +
      '<div class="mt-5">' + button("Save quotation") + "</div>") + "</form>";
}

function quoteDetail(id) {
  const quote = Store.quotation(id);
  if (!quote) return pageMissing();
  const locked = quote.status === "Accepted" || quote.status === "Rejected";
  const actions = whenCan("quote",
    (quote.status === "Draft" || quote.status === "Sent" ? '<button type="button" data-action="send-quotation" data-id="' + id + '" class="rounded-md bg-teal-700 px-3 py-2 text-sm font-medium text-white">Prepare email</button>' : "") +
    (quote.status !== "Accepted" && quote.status !== "Rejected" ? '<button type="button" data-action="accept-quotation" data-id="' + id + '" class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">Mark accepted</button><button type="button" data-action="reject-quotation" data-id="' + id + '" class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">Mark rejected</button>' : "") +
    (quote.status === "Accepted" ? linkButton("Open work order", "#/work-orders/new?quotation=" + id) : ""));
  return heading(quote.number, "Valid until " + pretty(quote.validUntil), linkButton("All quotations", "#/quotations", "ghost") + (Store.can("quote") && !locked ? linkButton("Edit", "#/quotations/" + id + "/edit", "ghost") : "")) +
    paperQuote(quote) +
    '<div class="mt-4 flex flex-wrap gap-2">' + actions + '<button type="button" data-action="download" data-kind="quotation" data-id="' + id + '" class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">Download</button></div>';
}

function rememberInstruments(key, seed) {
  if (UI.instrumentKey !== key || !UI.selectedInstruments) {
    UI.instrumentKey = key;
    UI.selectedInstruments = seed;
  }
  return UI.selectedInstruments;
}

function pageWorkOrders(route) {
  if (route.id === "new") return workForm(null, route.params.quotation || "");
  if (route.mode === "edit") return workForm(Store.workOrder(route.id));
  if (route.id) return workDetail(route.id);
  const pick = UI.filter && UI.filter.work;
  const source = Store.state().workOrders.filter((item) => !pick || item.status === pick);
  const rows = filtered("work", source, (item) => item.number + " " + item.woNumber + " " + ((Store.customer(item.customerId) || {}).tradeName || ""));
  const page = slicePage("work", rows);
  const body = page.rows.map((item) => cells([
    '<a class="font-medium text-[#0B2540] hover:underline" href="#/work-orders/' + item.id + '">' + esc(item.number) + "</a>",
    esc(item.woNumber),
    pretty(item.woDate),
    esc((Store.customer(item.customerId) || {}).tradeName || "—"),
    badge(item.status),
    rowActions({
      id: item.id,
      view: "#/work-orders/" + item.id,
      edit: Store.can("work") && !["Invoiced", "Cancelled"].includes(item.status) ? "#/work-orders/" + item.id + "/edit" : "",
      del: Store.can("work") ? "delete-work" : "",
      download: "work",
    }),
  ])).join("");
  const add = whenCan("work", linkButton("Open work order", "#/work-orders/new"));
  if (!Store.state().workOrders.length) return heading("Work orders", "The customer’s order number and date are typed in. They are printed on the certificate.", add) + emptyState("No work orders", "Open a work order after a quotation is accepted, or record an order directly.", add);
  return heading("Work orders", "The customer’s order number and date are typed in. They are printed on the certificate.", add) + toolbar("work", "Search order or customer", ["Scheduled", "Calibrated", "Invoiced", "Cancelled"]) + dataTable(["Job", "Customer order", "Order date", "Customer", "Status", "Actions"], body, "work", page);
}

function workForm(order, quotationId) {
  if (order && ["Invoiced", "Cancelled"].includes(order.status)) return workDetail(order.id);
  const quote = Store.quotation(quotationId) || (order && order.quotationId ? Store.quotation(order.quotationId) : null);
  if (!Store.state().customers.length) return heading("New work order", "") + emptyState("Add a customer first", "A work order belongs to a customer.", linkButton("Add customer", "#/customers/new"));
  const customerId = UI.workKey === location.hash && UI.workCustomer !== undefined ? UI.workCustomer : order ? order.customerId : quote ? quote.customerId : "";
  const key = (order ? order.id : "new") + ":" + customerId;
  const selected = rememberInstruments(key, order ? order.instrumentIds.slice() : []);
  const instruments = Store.state().instruments.filter((item) => item.customerId === customerId);
  const boxes = instruments.map((item) => '<label class="flex items-start gap-3 border-b border-slate-100 py-2 text-sm"><input type="checkbox" name="instrumentIds" value="' + esc(item.id) + '"' + (selected.includes(item.id) ? " checked" : "") + ' class="mt-1" /><span><span class="font-medium">' + esc(item.serial) + "</span><span class=\"block text-slate-500\">" + esc(item.family) + " · " + esc((item.make + " " + item.model).trim()) + "</span></span></label>").join("");
  const quotes = Store.state().quotations.filter((item) => item.customerId === customerId && (item.status === "Accepted" || (order && item.id === order.quotationId)));
  return heading(order ? "Edit " + order.number : "New work order", "Select the instruments covered by this order.", linkButton("Back", "#/work-orders", "ghost")) +
    '<form data-form="' + (order ? "updateWorkOrder" : "addWorkOrder") + '" data-work-key="' + esc(key) + '" class="mx-auto max-w-3xl">' +
    (order ? '<input type="hidden" name="id" value="' + esc(order.id) + '" />' : "") +
    card('<div class="grid gap-4 sm:grid-cols-2">' +
      field("Customer", selectInput("customerId", customerOptions(customerId), 'data-refresh="work-customer"')) +
      field("Accepted quotation", selectInput("quotationId", '<option value="">None</option>' + optionList(quotes.map((item) => ({ value: item.id, label: item.number })), (order && order.quotationId) || (quote && quote.id) || ""))) +
      field("Customer work order number", textInput("woNumber", order ? order.woNumber : "")) +
      field("Customer work order date", textInput("woDate", order ? order.woDate : Store.today(), 'type="date"')) +
      '<div class="sm:col-span-2">' + field("Site", textInput("site", order ? order.site : (Store.customer(customerId) || {}).site || "")) + "</div>" +
      "</div><div class=\"mt-4\"><p class=\"mb-1 text-sm font-medium text-slate-700\">Instruments</p>" +
      (customerId ? boxes || '<p class="text-sm text-slate-600">This customer has no instruments. <a class="text-[#0B2540] hover:underline" href="#/instruments/new?customer=' + esc(customerId) + '">Add one</a>.</p>' : '<p class="text-sm text-slate-600">Choose a customer to see their instruments.</p>') +
      "</div><div class=\"mt-5\">" + button("Save work order") + "</div>") + "</form>";
}

function workDetail(id) {
  const order = Store.workOrder(id);
  if (!order) return pageMissing();
  const instruments = order.instrumentIds.map((item) => Store.instrument(item)).filter(Boolean);
  return heading(order.number, (Store.customer(order.customerId) || {}).tradeName || "", linkButton("All work orders", "#/work-orders", "ghost")) +
    paperRecord(order.woNumber, [
      ["Job number", esc(order.number)],
      ["Customer order date", pretty(order.woDate)],
      ["Status", badge(order.status)],
      ["Site", esc(order.site || "—")],
      ["Quotation", order.quotationId && Store.quotation(order.quotationId) ? '<a class="text-[#0B2540] hover:underline" href="#/quotations/' + order.quotationId + '">' + esc(Store.quotation(order.quotationId).number) + "</a>" : "—"],
      ["Instruments", instruments.map((item) => '<a class="text-[#0B2540] hover:underline" href="#/instruments/' + item.id + '">' + esc(item.serial) + "</a>").join(", ") || "—"],
    ]) +
    '<div class="mt-4 flex flex-wrap gap-2">' +
    whenCan("visit", linkButton("Schedule visit", "#/visits/new?work=" + id)) +
    whenCan("certificate", linkButton("Certificate", "#/certificates/new?work=" + id)) +
    (Store.can("work") && !["Invoiced", "Cancelled"].includes(order.status) ? linkButton("Edit", "#/work-orders/" + id + "/edit", "ghost") : "") +
    '<button type="button" data-action="download" data-kind="work" data-id="' + id + '" class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">Download</button></div>';
}

function jobOptions(selected) {
  return optionList(["Site calibration", "Workshop calibration", "Breakdown call", "Installation"].map((item) => ({ value: item, label: item })), selected || "Site calibration");
}

function pageVisits(route) {
  if (route.id === "new") return visitForm(null, route.params.work || "");
  if (route.mode === "edit") return visitForm(Store.visit(route.id));
  if (route.id) return visitDetail(route.id);
  const rows = filtered("visits", Store.state().visits, (item) => item.jobType + " " + item.location + " " + Store.person(item.engineerId));
  const page = slicePage("visits", rows);
  const body = page.rows.map((item) => {
    const released = Store.state().requisitions.some((req) => req.visitId === item.id && req.status === "Released");
    return cells([
      pretty(item.date),
      esc(item.jobType),
      esc(item.location),
      esc(Store.person(item.engineerId)),
      badge(item.packStatus),
      rowActions({
        id: item.id,
        view: "#/visits/" + item.id,
        edit: Store.can("visit") && !released ? "#/visits/" + item.id + "/edit" : "",
        del: Store.can("visit") && !released ? "delete-visit" : "",
        download: "visit",
      }),
    ]);
  }).join("");
  const add = whenCan("visit", linkButton("Schedule visit", "#/visits/new"));
  if (!Store.state().visits.length) return heading("Visits", "Schedule the engineer 3 to 5 days before the visit so the pack and fund request can be prepared.", add) + emptyState("No visits", "Open a work order, then schedule the visit.", add);
  return heading("Visits", "The visit pack opens five days before the date and should be submitted at least three days before.", add) + toolbar("visits", "Search location, job, or engineer") + dataTable(["Date", "Job", "Location", "Engineer", "Pack", "Actions"], body, "visits", page);
}

function visitForm(visit, workOrderId) {
  const released = visit && Store.state().requisitions.some((req) => req.visitId === visit.id && req.status === "Released");
  if (released) return visitDetail(visit.id);
  if (!Store.state().workOrders.length) return heading("New visit", "") + emptyState("Open a work order first", "A visit is scheduled against a work order.", linkButton("Work orders", "#/work-orders"));
  if (!Store.engineers().length) return heading("New visit", "") + emptyState("Add an engineer", "Create a service engineer in Settings before scheduling.", linkButton("Settings", "#/settings"));
  const value = visit || { workOrderId, date: Store.addDays(Store.today(), 4), time: "09:00", jobType: "Site calibration" };
  const orders = Store.state().workOrders.filter((item) => !["Cancelled", "Closed"].includes(item.status) || (visit && item.id === visit.workOrderId));
  return heading(visit ? "Edit visit" : "Schedule visit", "", linkButton("Back", "#/visits", "ghost")) +
    '<form data-form="' + (visit ? "updateVisit" : "addVisit") + '" class="mx-auto max-w-3xl">' +
    (visit ? '<input type="hidden" name="id" value="' + esc(visit.id) + '" />' : "") +
    card('<div class="grid gap-4 sm:grid-cols-2">' +
      field("Work order", selectInput("workOrderId", optionList(orders.map((item) => ({ value: item.id, label: item.number + " · " + item.woNumber })), value.workOrderId))) +
      field("Engineer", selectInput("engineerId", engineerOptions(value.engineerId))) +
      field("Date", textInput("date", value.date, 'type="date"')) +
      field("Time", textInput("time", value.time, 'type="time"')) +
      field("Job type", selectInput("jobType", jobOptions(value.jobType))) +
      field("Site contact", textInput("contact", value.contact)) +
      '<div class="sm:col-span-2">' + field("Location", textInput("location", value.location)) + "</div>" +
      "</div><div class=\"mt-5\">" + button("Save visit") + "</div>") + "</form>";
}

function visitDetail(id) {
  const visit = Store.visit(id);
  if (!visit) return pageMissing();
  const order = Store.workOrder(visit.workOrderId);
  const ahead = Store.diffDays(Store.today(), visit.date);
  const released = Store.state().requisitions.some((req) => req.visitId === id && req.status === "Released");
  let pack = "";
  if (Store.can("visitPack") && !released) {
    if (ahead > 5) {
      pack = card('<h2 class="font-semibold">Visit pack</h2><p class="mt-2 text-sm leading-6 text-slate-600">The pack opens on ' + pretty(Store.addDays(visit.date, -5)) + ", five days before the visit.</p>");
    } else {
      pack = '<form data-form="saveVisitPack" class="mt-6">' + card(
        '<h2 class="font-semibold">Visit pack</h2><p class="mt-1 text-sm text-slate-600">' + (ahead < 3 ? "This visit is inside 3 days. A planner or administrator must enter an override reason." : "Submit the pack to email the planner and open a fund request.") + "</p>" +
        '<input type="hidden" name="id" value="' + esc(visit.id) + '" />' +
        '<div class="mt-4 grid gap-4 sm:grid-cols-2">' +
        field("Time", textInput("time", visit.time, 'type="time"')) +
        field("Job type", selectInput("jobType", jobOptions(visit.jobType))) +
        field("Location", textInput("location", visit.location)) +
        field("Contact", textInput("contact", visit.contact)) +
        field("Transport", textInput("transport", visit.transport)) +
        field("Travel (₹)", moneyInput("travel", ((visit.travelPaise || 0) / 100).toFixed(2))) +
        field("Other expenses (₹)", moneyInput("other", ((visit.otherPaise || 0) / 100).toFixed(2))) +
        (ahead < 3 ? field("Override reason", textInput("overrideReason", visit.overrideReason)) : "") +
        '<div class="sm:col-span-2">' + field("Notes", areaInput("notes", visit.notes)) + "</div></div>" +
        '<p class="mt-3 text-xs leading-5 text-slate-500">A workshop calibration with zero travel and zero other expenses does not open a fund request. Any other amount, or a site job, waits for approval. The engineer cannot approve their own request.</p>' +
        '<div class="mt-4 flex flex-wrap gap-2"><button type="submit" name="submit" value="no" class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">Save pack</button><button type="submit" name="submit" value="yes" class="rounded-md bg-teal-700 px-3 py-2 text-sm font-medium text-white">Submit for approval</button></div>'
      ) + "</form>";
    }
  }
  return heading(pretty(visit.date) + " · " + visit.jobType, visit.location, linkButton("All visits", "#/visits", "ghost")) +
    paperRecord(visit.jobType, [
      ["Work order", order ? '<a class="text-[#0B2540] hover:underline" href="#/work-orders/' + order.id + '">' + esc(order.number) + "</a>" : "—"],
      ["Engineer", esc(Store.person(visit.engineerId))],
      ["Time", esc(visit.time || "—")],
      ["Contact", esc(visit.contact || "—")],
      ["Pack", badge(visit.packStatus)],
      ["Travel", Store.rupees(visit.travelPaise || 0)],
      ["Other", Store.rupees(visit.otherPaise || 0)],
      ["Notes", esc(visit.notes || "—")],
    ]) + pack +
    '<div class="mt-4"><button type="button" data-action="download" data-kind="visit" data-id="' + id + '" class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">Download</button></div>';
}

function pageFunds(route) {
  if (route.id) return fundDetail(route.id);
  const rows = filtered("funds", byStatus("funds", Store.state().requisitions), (item) => item.number + " " + item.status);
  const page = slicePage("funds", rows);
  const body = page.rows.map((item) => {
    const visit = Store.visit(item.visitId);
    return cells([
      '<a class="font-medium text-[#0B2540] hover:underline" href="#/requisitions/' + item.id + '">' + esc(item.number) + "</a>",
      pretty(visit ? visit.date : ""),
      esc(visit ? Store.person(visit.engineerId) : "—"),
      Store.rupees(item.amountPaise),
      badge(item.status),
      rowActions({
        id: item.id,
        view: "#/requisitions/" + item.id,
        edit: Store.can("fund") && item.status === "Submitted" ? "#/requisitions/" + item.id : "",
        del: Store.can("fund") && item.status !== "Released" ? "delete-requisition" : "",
        download: "requisition",
      }),
    ]);
  }).join("");
  if (!Store.state().requisitions.length) return heading("Fund requests", "A request is created when a visit pack is submitted. Funds are released only after someone other than the visiting engineer approves them.") + emptyState("No fund requests", "Submit a visit pack with an amount, or any site job, to open a request.", linkButton("Visits", "#/visits", "ghost"));
  return heading("Fund requests", "Funds are released only after approval. The visiting engineer cannot approve their own request.") + toolbar("funds", "Search request number", ["Submitted", "Released", "Rejected"]) + dataTable(["Request", "Visit", "Engineer", "Amount", "Status", "Actions"], body, "funds", page);
}

function fundDetail(id) {
  const requisition = Store.requisition(id);
  if (!requisition) return pageMissing();
  const visit = Store.visit(requisition.visitId);
  const own = visit && Store.user() && Store.user().id === visit.engineerId;
  const history = (requisition.events || []).map((event) => '<li class="border-b border-slate-100 py-2 text-sm"><span class="text-slate-500">' + pretty(event.at.slice(0, 10)) + " · " + esc(Store.person(event.by)) + "</span><br />" + esc(event.text) + "</li>").join("");
  let decision = "";
  if (requisition.status === "Submitted" && Store.can("fund")) {
    decision = own
      ? card('<h2 class="font-semibold">Approval</h2><p class="mt-2 text-sm leading-6 text-slate-600">You are the engineer on this visit, so you cannot approve or reject this request. Another approver has to decide it.</p>')
      : '<form data-form="decideRequisition" class="mt-6">' + card('<h2 class="font-semibold">Decision</h2><input type="hidden" name="id" value="' + esc(id) + '" /><div class="mt-4 grid gap-4 sm:grid-cols-2">' +
        field("Amount to release (₹)", moneyInput("amount", (requisition.amountPaise / 100).toFixed(2))) +
        field("Note", textInput("note", "", 'placeholder="Required if you reject"')) +
        "</div><div class=\"mt-4 flex flex-wrap gap-2\"><button type=\"submit\" name=\"decision\" value=\"approve\" class=\"rounded-md bg-teal-700 px-3 py-2 text-sm font-medium text-white\">Approve and release</button><button type=\"submit\" name=\"decision\" value=\"reject\" class=\"rounded-md border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-700\">Reject</button></div>") + "</form>";
  }
  return heading(requisition.number, visit ? visit.jobType + " · " + visit.location : "", linkButton("All requests", "#/requisitions", "ghost")) +
    paperRecord(requisition.number, [
      ["Status", badge(requisition.status)],
      ["Amount", Store.rupees(requisition.amountPaise)],
      ["Visit", visit ? '<a class="text-[#0B2540] hover:underline" href="#/visits/' + visit.id + '">' + pretty(visit.date) + "</a>" : "—"],
      ["Engineer", esc(visit ? Store.person(visit.engineerId) : "—")],
    ]) +
    '<div class="mt-6">' + card('<h2 class="font-semibold">History</h2><ul class="mt-2">' + (history || '<li class="text-sm text-slate-600">No events yet.</li>') + "</ul>") + "</div>" +
    decision +
    '<div class="mt-4"><button type="button" data-action="download" data-kind="requisition" data-id="' + id + '" class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">Download</button></div>';
}

function blankCertificate(route) {
  const existing = route.id && route.id !== "new" ? Store.certificate(route.id) : null;
  const revise = route.params.revise ? Store.certificate(route.params.revise) : null;
  const fromWork = route.params.work ? Store.workOrder(route.params.work) : null;
  const instrument = route.params.instrument ? Store.instrument(route.params.instrument) : null;
  const source = existing || revise || {};
  const order = fromWork || (source.workOrderId ? Store.workOrder(source.workOrderId) : instrument ? Store.openWorkForInstrument(instrument.id) : null);
  const model = {
    draftId: existing && existing.status === "Draft" ? existing.id : "",
    revisionOf: revise ? revise.id : "",
    workOrderId: order ? order.id : "",
    customerId: (order && order.customerId) || source.customerId || (instrument && instrument.customerId) || "",
    family: source.family || (instrument && instrument.family) || "Portable monitor",
    serial: source.serial || (instrument && instrument.serial) || "",
    calibrationDate: source.calibrationDate || Store.today(),
    interval: String(source.interval || (instrument && instrument.interval) || 3),
    woNumber: source.woNumber || (order && order.woNumber) || "",
    woDate: source.woDate || (order && order.woDate) || "",
    cylinderId: source.cylinderId || "",
    engineerId: source.engineerId || ((Store.user() && Store.engineers().some((item) => item.id === Store.user().id)) ? Store.user().id : ""),
    notes: existing ? existing.notes : "",
    gasOn: [],
    asFound: [],
    asLeft: [],
  };
  const cylinder = Store.cylinder(model.cylinderId);
  const previous = (existing && existing.gases) || (revise && revise.gases) || [];
  if (cylinder) {
    cylinder.gases.forEach((gas, index) => {
      const match = previous.find((item) => item.gas === gas.gas && item.concentration === gas.concentration);
      model.gasOn[index] = match ? true : previous.length === 0;
      model.asFound[index] = match ? match.asFound : "";
      model.asLeft[index] = match ? match.asLeft : "";
    });
  }
  return model;
}

function certificateModel() {
  const model = UI.cert || {};
  const interval = Number(model.interval);
  const due = model.calibrationDate && [3, 4, 6].includes(interval) ? Store.addMonths(model.calibrationDate, interval) : "";
  const cylinder = Store.cylinder(model.cylinderId);
  const gases = cylinder ? cylinder.gases.map((gas, index) => ({
    gas: gas.gas,
    concentration: gas.concentration,
    unit: gas.unit,
    asFound: (model.asFound || [])[index] || "",
    asLeft: (model.asLeft || [])[index] || "",
    keep: (model.gasOn || [])[index] !== false,
  })).filter((gas) => gas.keep) : [];
  return {
    status: "Draft",
    family: model.family,
    customerId: model.customerId,
    serial: model.serial,
    calibrationDate: model.calibrationDate,
    interval,
    dueDate: due,
    woNumber: model.woNumber,
    woDate: model.woDate,
    cylinderNumber: cylinder ? cylinder.number : "",
    gasCertNo: cylinder ? cylinder.gasCertNo : "",
    engineerId: model.engineerId,
    notes: model.notes,
    gases,
  };
}

function pageCertificates(route) {
  if (route.id === "new" || route.mode === "edit") return certificateForm(route);
  if (route.id) return certificateDetail(route.id);
  const rows = filtered("certificates", byStatus("certificates", Store.state().certificates), (item) => (item.number || "") + " " + item.serial + " " + item.family + " " + ((Store.customer(item.customerId) || {}).tradeName || ""));
  const page = slicePage("certificates", rows);
  const body = page.rows.map((item) => cells([
    '<a class="font-medium text-[#0B2540] hover:underline" href="#/certificates/' + item.id + '">' + esc(item.number || "Draft") + "</a>",
    esc(item.serial),
    esc((Store.customer(item.customerId) || {}).tradeName || "—"),
    pretty(item.calibrationDate),
    dueBadge(item.dueDate),
    badge(item.status),
    rowActions({
      id: item.id,
      view: "#/certificates/" + item.id,
      edit: Store.can("certificate") && item.status === "Draft" ? "#/certificates/" + item.id + "/edit" : "",
      del: Store.can("certificate") && item.status === "Draft" ? "delete-certificate" : "",
      download: "certificate",
    }),
  ])).join("");
  const add = whenCan("certificate", linkButton("New certificate", "#/certificates/new"));
  if (!Store.state().certificates.length) return heading("Certificates", "Calibration date, interval, serial, cylinder, and work order are recorded here. The due date is calculated.", add) + emptyState("No certificates", "Add a cylinder and a signature, set a rate, then issue the first certificate.", add);
  return heading("Certificates", "An issued certificate stays on record. Revise it if the result must change.", add) + toolbar("certificates", "Search serial, number, or customer", ["Draft", "Issued", "Superseded"]) + dataTable(["Certificate", "Serial", "Customer", "Calibrated", "Due", "Status", "Actions"], body, "certificates", page);
}

function certificateForm(route) {
  if (!Store.can("certificate")) return heading("Certificate", "") + emptyState("Your role cannot issue certificates", "Ask an administrator or service engineer.", linkButton("Certificates", "#/certificates", "ghost"));
  const existing = route.id && route.id !== "new" ? Store.certificate(route.id) : null;
  if (existing && existing.status !== "Draft") return certificateDetail(existing.id);
  const key = location.hash;
  if (UI.certKey !== key || !UI.cert) {
    UI.certKey = key;
    UI.cert = blankCertificate(route);
  }
  const model = UI.cert;
  const preview = certificateModel();
  const orders = Store.state().workOrders.filter((item) => !["Cancelled", "Closed"].includes(item.status) || item.id === model.workOrderId);
  const cylinders = Store.state().cylinders.filter((item) => item.status === "In stock" || item.status === "Issued" || item.id === model.cylinderId);
  const cylinder = Store.cylinder(model.cylinderId);
  const gasRows = cylinder ? cylinder.gases.map((gas, index) => {
    const on = (model.gasOn || [])[index] !== false;
    return '<div data-gas-index="' + index + '" class="grid gap-3 border-b border-slate-100 py-3 lg:grid-cols-12 lg:items-center"><label class="flex items-center gap-2 text-sm lg:col-span-4"><input type="checkbox" data-gas-required ' + (on ? "checked" : "") + ' /> <span>' + esc(gas.gas) + "</span></label><p class=\"text-sm text-slate-600 lg:col-span-3\">" + esc(gas.concentration) + " " + esc(gas.unit) + '</p><div class="lg:col-span-2">' + textInput("", (model.asFound || [])[index] || "", 'data-as-found placeholder="As found"') + '</div><div class="lg:col-span-3">' + textInput("", (model.asLeft || [])[index] || "", 'data-as-left placeholder="As left"') + "</div></div>";
  }).join("") : '<p class="text-sm text-slate-600">Choose a cylinder. Its certified gases appear here. You can untick a gas that this job does not need. You cannot add a gas that is not on the cylinder.</p>';
  return heading(model.revisionOf ? "Revision" : model.draftId ? "Edit draft" : "New certificate", "The due date is the calibration date plus 3, 4, or 6 months.", linkButton("Certificates", "#/certificates", "ghost")) +
    '<form data-form="saveCertificate" class="grid items-start gap-6 xl:grid-cols-2">' +
    '<div class="grid gap-4">' +
    card('<div class="grid gap-4 sm:grid-cols-2">' +
      field("Work order", selectInput("workOrderId", '<option value="">Not linked</option>' + optionList(orders.map((item) => ({ value: item.id, label: item.number + " · " + item.woNumber })), model.workOrderId), 'data-cert="work"')) +
      field("Customer", selectInput("customerId", customerOptions(model.customerId), 'data-cert="field"')) +
      field("Family", selectInput("family", familyOptions(model.family), 'data-cert="field"')) +
      field("Serial number", textInput("serial", model.serial, 'data-cert="field"')) +
      field("Calibration date", textInput("calibrationDate", model.calibrationDate, 'type="date" data-cert="field"')) +
      field("Interval", selectInput("interval", optionList([{ value: "3", label: "3 months" }, { value: "4", label: "4 months" }, { value: "6", label: "6 months" }], String(model.interval)), 'data-cert="field"')) +
      field("Work order number", textInput("woNumber", model.woNumber, 'data-cert="field"')) +
      field("Work order date", textInput("woDate", model.woDate, 'type="date" data-cert="field"')) +
      field("Cylinder", selectInput("cylinderId", '<option value="">Select cylinder</option>' + optionList(cylinders.map((item) => ({ value: item.id, label: item.number + " · " + item.kind + " · " + item.status })), model.cylinderId), 'data-cert="cylinder"')) +
      field("Engineer", selectInput("engineerId", engineerOptions(model.engineerId), 'data-cert="field"')) +
      "</div><p class=\"mt-3 text-sm text-slate-600\">Due date <strong id=\"due-live\">" + pretty(preview.dueDate) + "</strong></p>" +
      (cylinder && ["Empty", "Quarantined", "Expired"].includes(cylinder.status) ? '<p class="mt-2 text-sm text-rose-700">This cylinder is ' + esc(cylinder.status.toLowerCase()) + " and cannot be used.</p>" : "") +
      '<div class="mt-4"><p class="text-sm font-medium text-slate-700">Gases on this cylinder</p><div class="mt-2">' + gasRows + "</div></div>" +
      '<div class="mt-4">' + field("Notes", areaInput("notes", model.notes, 'data-cert="field"')) + "</div>" +
      '<input type="hidden" name="draftId" value="' + esc(model.draftId) + '" /><input type="hidden" name="revisionOf" value="' + esc(model.revisionOf) + '" />' +
      '<div class="mt-5 flex flex-wrap gap-2"><button type="submit" name="issue" value="no" class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">Save draft</button><button type="submit" name="issue" value="yes" class="rounded-md bg-teal-700 px-3 py-2 text-sm font-medium text-white">Issue certificate</button></div>' +
      '<p class="mt-3 text-xs leading-5 text-slate-500">Issuing applies the engineer’s signature, creates the tax invoice from the rate card or accepted quotation, and prepares the customer email. It does not send the email by itself.</p>') +
    "</div>" +
    '<div><p class="mb-2 text-sm font-medium text-slate-700">Preview</p><div id="cert-preview">' + paperCertificate(preview) + "</div></div></form>";
}

function certificateDetail(id) {
  const certificate = Store.certificate(id);
  if (!certificate) return pageMissing();
  const invoice = Store.state().invoices.find((item) => item.certificateId === id && item.status !== "Cancelled");
  return heading(certificate.number || "Draft", certificate.family, linkButton("All certificates", "#/certificates", "ghost") +
    (Store.can("certificate") && certificate.status === "Draft" ? linkButton("Edit", "#/certificates/" + id + "/edit", "ghost") : "") +
    (Store.can("certificate") && certificate.status === "Issued" ? '<button type="button" data-action="revise-certificate" data-id="' + id + '" class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium">Revise</button>' : "")) +
    paperCertificate(certificate) +
    '<div class="mt-4 flex flex-wrap gap-2"><button type="button" data-action="download" data-kind="certificate" data-id="' + id + '" class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">Download</button>' +
    (invoice ? linkButton("Invoice " + invoice.number, "#/invoices/" + invoice.id, "ghost") : "") + "</div>";
}
