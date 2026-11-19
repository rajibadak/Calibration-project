function renderGate() {
  return authShell(UI.authTab === "register" ? "register" : "login");
}

function authTab(name, label, active) {
  return '<button type="button" data-action="auth-tab" data-id="' + name + '" class="border-b-2 px-1 pb-2 text-sm font-medium ' + (active ? "border-[#0F766E] text-[#0B2540]" : "border-transparent text-[#6b7580] hover:text-[#0B2540]") + '">' + label + "</button>";
}

function authShell(tab) {
  const samples = Store.sampleLogins().map((sample) =>
    '<button type="button" data-action="quick-login" data-email="' + esc(sample.email) + '" data-password="' + esc(sample.password) + '" class="mt-2 block w-full rounded-lg border border-[#e4e7ea] bg-white px-3 py-2 text-left hover:bg-[#fafbfb]">' +
    '<span class="block text-sm font-medium text-[#0B2540]">' + esc(sample.title) + '</span>' +
    '<span class="mt-1 block text-xs text-[#6b7580]">' + esc(sample.email) + '</span>' +
    '<span class="block text-xs text-[#6b7580]">' + esc(sample.password) + "</span></button>"
  ).join("");
  return '<div class="flex min-h-full items-center justify-center bg-[#f6f7f8] px-4 py-8"><div class="w-full max-w-5xl overflow-hidden rounded-[10px] border border-[#e4e7ea] bg-white lg:grid lg:grid-cols-5">' +
    '<aside class="border-b border-[#e4e7ea] bg-white p-6 sm:p-8 lg:col-span-2 lg:border-b-0 lg:border-r">' +
    '<img src="assets/logo.png" alt="Firstly" class="h-12 w-auto" />' +
    '<h1 class="mt-6 text-2xl font-semibold text-[#0B2540]">Firstly Calibration</h1>' +
    '<p class="mt-2 text-sm leading-6 text-[#6b7580]">Certificates, work orders, visit funds, invoices, stock, and GST for the calibration desk.</p>' +
    (tab === "login" ? '<div class="mt-8"><p class="text-sm font-medium text-[#0B2540]">Sample accounts</p><p class="mt-1 text-xs leading-5 text-[#6b7580]">Click an account to sign in.</p>' + samples + "</div>" : '<p class="mt-8 text-sm leading-6 text-[#6b7580]">Add the person and the company details, then sign in from the Login tab.</p>') +
    "</aside>" +
    '<div class="p-6 sm:p-8 lg:col-span-3">' +
    '<div class="mb-6 flex gap-6 border-b border-[#e4e7ea]">' + authTab("login", "Login", tab === "login") + authTab("register", "Register", tab === "register") + "</div>" +
    (tab === "register" ? registerForm() : loginForm()) +
    "</div></div></div>";
}

function loginForm() {
  return '<form data-form="login" class="mx-auto grid max-w-md gap-4">' +
    '<div><h2 class="text-[15px] font-semibold text-[#0B2540]">Login</h2><p class="mt-1 text-sm text-[#6b7580]">Use your email and password.</p></div>' +
    field("Email", textInput("email", "", 'type="email" autocomplete="username"')) +
    field("Password", textInput("password", "", 'type="password" autocomplete="current-password"')) +
    '<button class="mt-2 h-9 rounded-lg border border-[#0F766E] bg-[#0F766E] px-3 text-sm font-medium text-white hover:bg-[#0c5f59]" type="submit">Login</button></form>';
}

function registerForm() {
  const firm = Store.configured() ? company() : {};
  const roles = optionList([
    { value: "admin", label: "Administrator" },
    { value: "planner", label: "Planner" },
    { value: "engineer", label: "Service engineer" },
    { value: "accounts", label: "Accounts" },
    { value: "approver", label: "Approver" },
  ], "planner");
  return '<form data-form="register" class="grid gap-4">' +
    '<div><h2 class="text-[15px] font-semibold text-[#0B2540]">Register</h2><p class="mt-1 text-sm text-[#6b7580]">Create a user for this company.</p></div>' +
    '<p class="text-sm font-medium text-[#0B2540]">Your account</p>' +
    '<div class="grid gap-4 sm:grid-cols-2">' +
    field("Full name", textInput("name", "", 'autocomplete="name"')) +
    field("Designation", textInput("title", "", 'placeholder="Service engineer"')) +
    field("Email", textInput("email", "", 'type="email" autocomplete="username"')) +
    field("Phone", textInput("phone", "", 'type="tel" autocomplete="tel"')) +
    field("Password", textInput("password", "", 'type="password" autocomplete="new-password" placeholder="At least 8 characters"')) +
    field("Confirm password", textInput("confirm", "", 'type="password" autocomplete="new-password"')) +
    field("Role", selectInput("role", roles)) +
    "</div>" +
    '<p class="pt-2 text-sm font-medium text-[#0B2540]">Company</p>' +
    '<div class="grid gap-4 sm:grid-cols-2">' +
    field("Legal name", textInput("legalName", firm.legalName || "")) +
    field("Trade name", textInput("tradeName", firm.name || "")) +
    field("GSTIN", textInput("gstin", firm.gstin || "", 'placeholder="15 characters, optional"')) +
    field("State code", textInput("stateCode", firm.stateCode || "", 'placeholder="19"')) +
    field("State", textInput("state", firm.state || "")) +
    field("Company phone", textInput("companyPhone", firm.phone || "", 'type="tel"')) +
    '<div class="sm:col-span-2">' + field("Address", textInput("address", firm.address || "")) + "</div>" +
    '<div class="sm:col-span-2">' + field("Bank details", textInput("bank", firm.bank || "", 'placeholder="Bank, account, IFSC"')) + "</div>" +
    "</div>" +
    '<button class="h-9 rounded-lg border border-[#0F766E] bg-[#0F766E] px-3 text-sm font-medium text-white hover:bg-[#0c5f59]" type="submit">Register</button></form>';
}

function navLink(item, active, showLabel) {
  const on = active === item[0];
  const label = showLabel ? "<span>" + item[1] + "</span>" : "";
  const state = on
    ? "nav-on bg-[#0F766E] font-medium text-white"
    : "text-[#24364a] hover:bg-[#fafbfb]";
  return '<a href="' + item[2] + '" title="' + item[1] + '" class="mx-2 flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm ' + state + '">' + icon(item[3]) + label + "</a>";
}

function renderSidebar(active) {
  const showLabel = UI.nav || (window.innerWidth >= 1100 && !UI.collapsed);
  const width = UI.nav || (window.innerWidth >= 1100 && !UI.collapsed) ? "w-60" : "w-16";
  const groups = [
    [["dashboard", "Dashboard", "#/", "dashboard"]],
    [["customers", "Customers", "#/customers", "customers"], ["quotations", "Quotations", "#/quotations", "quotations"], ["enquiries", "Confirmations", "#/enquiries", "enquiries"]],
    [["work-orders", "Work orders", "#/work-orders", "work"], ["visits", "Visits", "#/visits", "visits"], ["instruments", "Instruments", "#/instruments", "instruments"], ["certificates", "Certificates", "#/certificates", "certificates"], ["stock", "Stock", "#/stock", "stock"]],
    [["invoices", "Invoices", "#/invoices", "invoices"], ["requisitions", "Fund requests", "#/requisitions", "funds"], ["gst", "GST", "#/gst", "gst"]],
    [["mail", "Mail", "#/mail", "mail"], ["reports", "Reports", "#/reports", "reports"], ["settings", "Settings", "#/settings", "settings"]],
  ];
  const labels = ["", "Sales", "Operations", "Finance", "Admin"];
  const nav = groups.map((group, index) => {
    const links = group.map((item) => navLink(item, active, showLabel)).join("");
    if (!labels[index]) return links;
    if (!showLabel) return '<div class="mx-3 my-2 border-t border-[#e4e7ea]"></div>' + links;
    return '<p class="px-5 pb-1 pt-5 text-[11px] font-medium uppercase tracking-[.06em] text-[#8b949e]">' + labels[index] + "</p>" + links;
  }).join("");
  const logo = showLabel ? "justify-start px-4" : "justify-center";
  return '<aside class="flex h-full shrink-0 flex-col border-r border-[#e4e7ea] bg-white ' + width + '"><div class="brand-mark flex h-16 items-center border-b border-[#e4e7ea] ' + logo + '"><img src="assets/logo.png" alt="Firstly" class="h-8 w-auto" /></div><nav class="flex-1 overflow-y-auto py-2">' + nav + "</nav></aside>";
}

function crumb(route) {
  const names = {
    dashboard: "Dashboard", customers: "Customers", instruments: "Instruments", enquiries: "Confirmations",
    quotations: "Quotations", "work-orders": "Work orders", visits: "Visits", requisitions: "Fund requests",
    certificates: "Certificates", invoices: "Invoices", stock: "Stock", cylinders: "Cylinders", spares: "Spares",
    gst: "GST", mail: "Mail", reports: "Reports", settings: "Settings",
  };
  const name = names[route.name] || "Page";
  if (!route.name || route.name === "dashboard") return '<span class="font-medium text-[#0B2540]">Dashboard</span>';
  return '<a href="#/" class="text-[#6b7580] hover:text-[#0B2540]">Dashboard</a><span class="px-2 text-[#d5dbe1]">/</span><span class="font-medium text-[#0B2540]">' + name + "</span>";
}

function renderTopbar(route) {
  const current = Store.user();
  const initial = esc((current.name || "?").trim().slice(0, 1).toUpperCase());
  const headerLeft = window.innerWidth < 768 ? "left-0" : (window.innerWidth >= 1100 && !UI.collapsed ? "left-60" : "left-16");
  const mails = Store.state().mails.slice().sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  const waiting = mails.filter((item) => item.status === "Prepared").length;
  const noteRows = mails.map((item) => {
    const open = UI.noteId === item.id;
    const detail = open
      ? '<span class="mt-2 block whitespace-pre-wrap text-xs leading-5 text-[#6b7580]">To ' + esc(item.to || "—") + "\n\n" + esc(item.body || "") + "</span>"
      : "";
    return '<button type="button" data-action="read-note" data-id="' + esc(item.id) + '" aria-expanded="' + (open ? "true" : "false") + '" class="block w-full border-b border-[#e4e7ea] px-4 py-3 text-left last:border-0 hover:bg-[#fafbfb]"><span class="flex items-start justify-between gap-3"><span class="min-w-0"><span class="block text-sm font-medium text-[#0B2540]">' + esc(item.subject) + '</span><span class="mt-1 block text-xs text-[#6b7580]">' + esc(item.type) + " · " + pretty(String(item.at || "").slice(0, 10)) + "</span></span>" + badge(item.status) + "</span>" + detail + "</button>";
  }).join("");
  const notes = UI.notesOpen
    ? '<div data-notes-menu class="absolute right-0 top-full z-40 mt-2 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-[#e4e7ea] bg-white"><div class="flex items-center justify-between border-b border-[#e4e7ea] px-4 py-3"><p class="text-sm font-semibold text-[#0B2540]">Notifications</p><span class="text-xs tabular-nums text-[#6b7580]">' + mails.length + '</span></div><div class="max-h-96 overflow-y-auto">' + (noteRows || '<p class="px-4 py-8 text-sm text-[#6b7580]">No notifications.</p>') + "</div></div>"
    : "";
  const menu = UI.accountOpen
    ? '<div data-account-menu class="absolute right-0 top-full z-40 mt-2 w-48 overflow-hidden rounded-lg border border-[#e4e7ea] bg-white py-1"><button type="button" data-action="my-account" class="block w-full px-3 py-2 text-left text-sm text-[#0B2540] hover:bg-[#fafbfb]">My account</button><button type="button" data-action="logout" class="block w-full px-3 py-2 text-left text-sm text-[#0B2540] hover:bg-[#fafbfb]">Logout</button></div>'
    : "";
  const collapseLabel = UI.collapsed ? "Expand sidebar" : "Collapse sidebar";
  return '<header class="fixed top-0 right-0 z-30 flex h-16 items-center gap-3 border-b border-[#e4e7ea] bg-white px-4 sm:px-6 ' + headerLeft + '">' +
    '<button type="button" data-action="open-nav" class="h-9 rounded-lg border border-[#e4e7ea] bg-white px-3 text-sm text-[#0B2540] md:hidden">Menu</button>' +
    '<button type="button" data-action="toggle-sidebar" class="hidden h-9 w-9 items-center justify-center rounded-lg border border-[#e4e7ea] bg-white text-[#6b7580] hover:bg-[#fafbfb] md:inline-flex" title="' + collapseLabel + '" aria-label="' + collapseLabel + '">' + icon("panel") + "</button>" +
    '<nav class="hidden shrink-0 text-sm sm:block">' + crumb(route) + "</nav>" +
    '<form data-global-search class="mx-auto hidden min-w-0 max-w-md flex-1 md:block"><input name="q" value="' + esc((UI.query && UI.query.customers) || "") + '" placeholder="Search customers, serials, invoices" class="h-9 w-full rounded-lg border border-[#e4e7ea] bg-white px-3 text-sm text-[#0B2540] outline-none" /></form>' +
    '<div class="relative ml-auto md:ml-0"><button type="button" data-action="open-notes" class="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#6b7580] hover:bg-[#fafbfb]" title="Notifications" aria-label="Notifications">' + icon("bell") + (waiting ? '<span class="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#b42318]"></span>' : "") + "</button>" + notes + "</div>" +
    '<div data-account-menu class="relative">' +
    '<button type="button" data-action="open-account" class="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-[#fafbfb]">' +
    '<span class="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e4e7ea] text-sm font-semibold text-[#0B2540]">' + initial + "</span>" +
    '<span class="hidden text-left sm:block"><span class="block text-sm font-medium leading-4 text-[#0B2540]">' + esc(current.name) + '</span><span class="block text-xs text-[#6b7580]">' + esc(current.title) + "</span></span></button>" +
    menu + "</div></header>";
}

function renderMain(route) {
  const pages = {
    dashboard: pageDashboard,
    customers: pageCustomers,
    instruments: pageInstruments,
    enquiries: pageEnquiries,
    quotations: pageQuotations,
    "work-orders": pageWorkOrders,
    visits: pageVisits,
    requisitions: pageFunds,
    certificates: pageCertificates,
    invoices: pageInvoices,
    stock: pageStock,
    cylinders: pageCylinders,
    spares: pageSpares,
    gst: pageGst,
    mail: pageMail,
    reports: pageReports,
    settings: pageSettings,
  };
  const renderPage = pages[route.name] || pageMissing;
  return renderPage(route);
}

function pageMissing() {
  return heading("Page not found", "Use the menu to continue.", linkButton("Dashboard", "#/", "ghost"));
}

function statCard(value, label, hash, iconName, alert) {
  const number = alert ? "kpi-alert text-[#b42318]" : "text-[#0B2540]";
  return '<a href="' + hash + '" class="kpi-card flex flex-col overflow-hidden rounded-[10px] border border-[#e4e7ea] bg-white">' +
    '<span class="kpi-band flex items-center gap-2 bg-[#e8ebed] px-5 py-3 text-[13px] font-medium text-[#24364a]">' + icon(iconName) + label + "</span>" +
    '<span class="flex flex-1 flex-col px-5 pb-4 pt-4">' +
    '<p class="text-[36px] font-semibold leading-none tabular-nums ' + number + '">' + value + "</p>" +
    '<p class="kpi-view mt-4 text-sm font-medium text-[#0B2540]">View</p></span></a>';
}

function greetingStrip() {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "numeric", hourCycle: "h23" }).format(new Date()));
  const part = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const name = ((Store.user() && Store.user().name) || "there").split(" ")[0];
  const dateParts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" }).formatToParts(new Date());
  const pick = (type) => (dateParts.find((item) => item.type === type) || {}).value || "";
  return '<div class="flex h-full items-center justify-between gap-6 rounded-[10px] bg-[#0B2540] px-6 py-6">' +
    '<div class="min-w-0"><p class="text-[11px] font-medium uppercase tracking-[.06em] text-[#9aabbb]">Today</p>' +
    '<p class="mt-2 text-[22px] font-semibold tracking-tight text-white">' + part + ", " + esc(name) + "</p>" +
    '<p class="mt-1 text-sm text-[#c5d0db]">Work that needs attention today.</p></div>' +
    '<div class="shrink-0 border-l border-[#2c4663] pl-6 text-right"><p class="text-[32px] font-semibold leading-none tabular-nums text-white">' + esc(pick("day")) + '</p><p class="mt-2 text-[11px] font-medium uppercase tracking-[.06em] text-[#9aabbb]">' + esc(pick("month")) + " " + esc(pick("year")) + "</p></div></div>";
}

function dueDonut(instruments) {
  const order = ["Overdue", "Due today", "Due soon", "In date", "No due date"];
  const colors = { Overdue: "#b42318", "Due today": "#b42318", "Due soon": "#b54708", "In date": "#067647", "No due date": "#98a2b3" };
  const counts = {};
  order.forEach((name) => { counts[name] = 0; });
  instruments.forEach((item) => {
    const tone = instrumentTone(item);
    counts[tone] = (counts[tone] || 0) + 1;
  });
  const total = instruments.length || 1;
  const bars = order.filter((name) => counts[name]).map((name) => '<span class="due-seg" style="width:' + ((counts[name] / total) * 100).toFixed(2) + "%;background:" + colors[name] + '"></span>').join("");
  const legend = order.filter((name) => counts[name]).map((name) => '<li class="flex items-center justify-between gap-3 text-xs text-[#6b7580]"><span class="flex items-center gap-2"><span class="h-1.5 w-1.5 rounded-full" style="background:' + colors[name] + '"></span>' + name + '</span><span class="tabular-nums text-[#0B2540]">' + counts[name] + "</span></li>").join("");
  return '<section class="flex h-full flex-col justify-center rounded-[10px] border border-[#e4e7ea] bg-white px-5 py-5"><p class="text-[11px] font-medium uppercase tracking-[.06em] text-[#6b7580]">Due status</p><div class="due-bar mt-3">' + (bars || '<span class="due-seg" style="width:100%;background:#e4e7ea"></span>') + '</div><ul class="mt-3 space-y-1">' + (legend || '<li class="text-xs text-[#6b7580]">No instruments</li>') + "</ul></section>";
}

function sectionTitle(text) {
  return '<h2 class="section-title mb-3 flex items-center gap-2.5 text-[15px] font-semibold text-[#0B2540]"><span class="h-[3px] w-4 bg-[#0B2540]"></span>' + text + "</h2>";
}

function pageDashboard() {
  const data = Store.state();
  const today = Store.today();
  const overdue = data.instruments.filter((item) => item.due && item.due < today);
  const unpaid = data.invoices.filter((item) => item.status !== "Cancelled" && Store.balanceOf(item) > 0);
  const funds = data.requisitions.filter((item) => item.status === "Submitted");
  const openConf = data.enquiries.filter((item) => item.status === "Open" || item.status === "Chasing");
  const visits = data.visits.filter((item) => Store.diffDays(today, item.date) >= 0 && Store.diffDays(today, item.date) <= 7);
  const steps = !data.customers.length
    ? emptyState("No records yet", "Add a customer, register their monitors, then raise a quotation.", linkButton("Add customer", "#/customers/new"))
    : "";
  const page = slicePage("dash-visits", visits);
  const visitRows = page.rows.map((visit) => cells([
    pretty(visit.date),
    esc(visit.jobType),
    esc(visit.location),
    esc(Store.person(visit.engineerId)),
    badge(visit.packStatus),
    rowActions({ id: visit.id, view: "#/visits/" + visit.id, edit: whenCan("visit", "#/visits/" + visit.id + "/edit") ? "#/visits/" + visit.id + "/edit" : "", download: "visit" }),
  ])).join("");
  const overduePage = slicePage("dash-overdue", overdue);
  const overdueRows = overduePage.rows.map((item) => cells([
    '<a class="font-medium text-[#0B2540] hover:underline" href="#/instruments/' + item.id + '">' + esc(item.serial) + "</a>",
    esc((Store.customer(item.customerId) || {}).tradeName || "—"),
    pretty(item.due),
    dueBadge(item.due),
    rowActions({ id: item.id, view: "#/instruments/" + item.id, download: "instrument" }),
  ])).join("");
  const activity = data.mails.slice().sort((a, b) => String(b.at || "").localeCompare(String(a.at || ""))).slice(0, 6);
  const activityRows = activity.map((item) => '<a href="#/mail/' + item.id + '" class="flex items-center justify-between gap-3 border-b border-[#e4e7ea] py-3 last:border-0"><span class="min-w-0"><span class="block truncate text-sm font-medium text-[#0B2540]">' + esc(item.subject) + '</span><span class="mt-0.5 block text-xs tabular-nums text-[#6b7580]">' + esc(item.type) + " · " + pretty(String(item.at || "").slice(0, 10)) + "</span></span>" + (item.status && item.status !== "Prepared" ? badge(item.status) : "") + "</a>").join("");
  return heading("Dashboard", "") +
    '<div class="mb-6 grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">' + greetingStrip() + dueDonut(data.instruments) + "</div>" +
    '<div class="kpi-row grid gap-4">' +
    statCard(openConf.length, "Confirmations without an order", "#/enquiries", "enquiries", false) +
    statCard(funds.length, "Fund requests to approve", "#/requisitions", "funds", false) +
    statCard(unpaid.length, "Invoices with a balance", "#/invoices", "invoices", false) +
    statCard(overdue.length, "Instruments overdue", "#/reports", "instruments", overdue.length > 0) +
    "</div>" +
    (steps ? '<div class="mt-6">' + steps + "</div>" : "") +
    '<div class="mt-6 grid gap-6 2xl:grid-cols-2">' +
    '<section class="min-w-0">' + sectionTitle("Upcoming visits") + (visitRows ? dataTable(["Date", "Job", "Location", "Engineer", "Pack", "Actions"], visitRows, "dash-visits", page) : card('<p class="text-sm text-[#6b7580]">None scheduled in the next 7 days.</p>')) + "</section>" +
    '<section class="min-w-0">' + sectionTitle("Overdue instruments") + (overdueRows ? dataTable(["Serial", "Customer", "Due", "Status", "Actions"], overdueRows, "dash-overdue", overduePage) : card('<p class="text-sm text-[#6b7580]">No instruments are overdue.</p>')) + "</section>" +
    "</div>" +
    '<section class="mt-6">' + sectionTitle("Recent activity") + card(activityRows || '<p class="text-sm text-[#6b7580]">No messages yet.</p>') + "</section>";
}

function pageCustomers(route) {
  if (route.id === "new") return customerForm();
  if (route.mode === "edit") return customerForm(Store.customer(route.id));
  if (route.id) return customerDetail(route.id);
  const rows = filtered("customers", Store.state().customers, (item) => item.tradeName + " " + item.legalName + " " + item.gstin + " " + item.email);
  const page = slicePage("customers", rows);
  const body = page.rows.map((item) => cells([
    '<a class="font-medium text-[#0B2540] hover:underline" href="#/customers/' + item.id + '">' + esc(item.tradeName) + "</a>",
    esc(item.gstin || "—"),
    esc(item.state || "—"),
    esc(item.email),
    rowActions({ id: item.id, view: "#/customers/" + item.id, edit: Store.can("customer") ? "#/customers/" + item.id + "/edit" : "", del: Store.can("customer") ? "delete-customer" : "", download: "customer" }),
  ])).join("");
  const add = whenCan("customer", linkButton("Add customer", "#/customers/new"));
  if (!Store.state().customers.length) return heading("Customers", "Companies whose monitors you calibrate.", add) + emptyState("No customers", "The register is empty.", add);
  return heading("Customers", "Companies whose monitors you calibrate.", add) + toolbar("customers", "Search name, GSTIN, or email") + dataTable(["Customer", "GSTIN", "State", "Email", "Actions"], body, "customers", page);
}

function customerForm(customer) {
  const value = customer || {};
  return heading(customer ? "Edit customer" : "New customer", "", linkButton("Back", customer ? "#/customers/" + customer.id : "#/customers", "ghost")) +
    '<form data-form="' + (customer ? "updateCustomer" : "addCustomer") + '" class="mx-auto max-w-3xl">' +
    (customer ? '<input type="hidden" name="id" value="' + esc(customer.id) + '" />' : "") +
    card('<div class="grid gap-4 sm:grid-cols-2">' +
      field("Legal name", textInput("legalName", value.legalName)) +
      field("Trade name", textInput("tradeName", value.tradeName)) +
      field("Email", textInput("email", value.email, 'type="email"')) +
      field("Phone", textInput("phone", value.phone)) +
      field("Contact person", textInput("contact", value.contact)) +
      field("GSTIN", textInput("gstin", value.gstin)) +
      field("State", textInput("state", value.state)) +
      field("GST state code", textInput("stateCode", value.stateCode, 'placeholder="Two digits"')) +
      '<div class="sm:col-span-2">' + field("Billing address", textInput("address", value.address)) + "</div>" +
      '<div class="sm:col-span-2">' + field("Site", textInput("site", value.site)) + "</div>" +
      field("GSTR-1 status noted", textInput("gstr1", value.gstr1, 'placeholder="After you check the portal"')) +
      field("GSTR-3B status noted", textInput("gstr3b", value.gstr3b)) +
      field("Date GST was checked", textInput("gstChecked", value.gstChecked, 'type="date"')) +
      "</div>" + '<div class="mt-5">' + button("Save customer") + "</div>") + "</form>";
}

function customerDetail(id) {
  const customer = Store.customer(id);
  if (!customer) return pageMissing();
  const instruments = Store.state().instruments.filter((item) => item.customerId === id);
  const invoices = Store.state().invoices.filter((item) => item.customerId === id);
  return heading(customer.tradeName, customer.legalName, linkButton("Edit", "#/customers/" + id + "/edit", "ghost") + linkButton("All customers", "#/customers", "ghost")) +
    paperRecord(customer.tradeName, [
      ["Email", esc(customer.email)],
      ["Phone", esc(customer.phone || "—")],
      ["Contact", esc(customer.contact || "—")],
      ["GSTIN", esc(customer.gstin || "—")],
      ["State", esc(customer.state || "—")],
      ["Address", esc(customer.address || "—")],
      ["Site", esc(customer.site || "—")],
      ["GSTR-1 noted", esc(customer.gstr1 || "Not recorded")],
      ["GSTR-3B noted", esc(customer.gstr3b || "Not recorded")],
      ["GST checked", pretty(customer.gstChecked)],
    ]) +
    '<div class="mt-6 grid gap-6 lg:grid-cols-2">' +
    card("<h2 class=\"font-semibold\">Instruments</h2><div class=\"mt-3\">" + (instruments.length ? instruments.map((item) => '<p class="border-b border-slate-100 py-2 text-sm"><a class="text-[#0B2540] hover:underline" href="#/instruments/' + item.id + '">' + esc(item.serial) + "</a> · " + esc(item.family) + " · " + dueBadge(item.due) + "</p>").join("") : '<p class="text-sm text-slate-600">None yet.</p>') + "</div>") +
    card("<h2 class=\"font-semibold\">Invoices</h2><div class=\"mt-3\">" + (invoices.length ? invoices.map((item) => '<p class="border-b border-slate-100 py-2 text-sm"><a class="text-[#0B2540] hover:underline" href="#/invoices/' + item.id + '">' + esc(item.number) + "</a> · " + badge(item.status) + " · " + Store.rupees(Store.balanceOf(item)) + "</p>").join("") : '<p class="text-sm text-slate-600">None yet.</p>') + "</div>") +
    "</div>";
}

function pageInstruments(route) {
  if (route.id === "new") return instrumentForm(null, route.params.customer || "");
  if (route.mode === "edit") return instrumentForm(Store.instrument(route.id));
  if (route.id) return instrumentDetail(route.id);
  const tone = UI.filter && UI.filter.instruments;
  const source = Store.state().instruments.filter((item) => !tone || instrumentTone(item) === tone);
  const rows = filtered("instruments", source, (item) => item.serial + " " + item.make + " " + item.model + " " + (Store.customer(item.customerId) || {}).tradeName);
  const page = slicePage("instruments", rows);
  const body = page.rows.map((item) => cells([
    esc(item.family),
    '<a class="font-medium text-[#0B2540] hover:underline" href="#/instruments/' + item.id + '">' + esc(item.serial) + "</a>",
    esc((item.make + " " + item.model).trim() || "—"),
    esc((Store.customer(item.customerId) || {}).tradeName || "—"),
    dueBadge(item.due),
    rowActions({ id: item.id, view: "#/instruments/" + item.id, edit: Store.can("instrument") ? "#/instruments/" + item.id + "/edit" : "", del: Store.can("instrument") ? "delete-instrument" : "", download: "instrument" }),
  ])).join("");
  const add = whenCan("instrument", linkButton("Add instrument", "#/instruments/new"));
  if (!Store.state().instruments.length) return heading("Instruments", "Portable, fixed, and area monitors.", add) + emptyState("No instruments", "Register a monitor against a customer.", add);
  return heading("Instruments", "Portable, fixed, and area monitors.", add) + toolbar("instruments", "Search serial, make, or customer", ["Overdue", "Due today", "Due soon", "In date", "No due date"]) + dataTable(["Family", "Serial", "Make and model", "Customer", "Due", "Actions"], body, "instruments", page);
}

function instrumentTone(item) {
  if (!item.due) return "No due date";
  const days = Store.diffDays(Store.today(), item.due);
  if (days < 0) return "Overdue";
  if (days === 0) return "Due today";
  if (days <= 15) return "Due soon";
  return "In date";
}

function instrumentForm(instrument, customerId) {
  const value = instrument || { customerId, family: "Portable monitor", interval: 3 };
  if (!Store.state().customers.length) return heading("New instrument", "") + emptyState("Add a customer first", "Instruments belong to a customer.", linkButton("Add customer", "#/customers/new"));
  return heading(instrument ? "Edit instrument" : "New instrument", "", linkButton("Back", "#/instruments", "ghost")) +
    '<form data-form="' + (instrument ? "updateInstrument" : "addInstrument") + '" class="mx-auto max-w-3xl">' +
    (instrument ? '<input type="hidden" name="id" value="' + esc(instrument.id) + '" />' : "") +
    card('<div class="grid gap-4 sm:grid-cols-2">' +
      field("Customer", selectInput("customerId", customerOptions(value.customerId))) +
      field("Family", selectInput("family", familyOptions(value.family))) +
      field("Interval", selectInput("interval", optionList([{ value: "3", label: "3 months" }, { value: "4", label: "4 months" }, { value: "6", label: "6 months" }], String(value.interval || 3)))) +
      field("Make", textInput("make", value.make)) +
      field("Model", textInput("model", value.model)) +
      field("Serial number", textInput("serial", value.serial)) +
      field("Tag", textInput("tag", value.tag)) +
      "</div><div class=\"mt-5\">" + button("Save instrument") + "</div>") + "</form>";
}

function instrumentDetail(id) {
  const instrument = Store.instrument(id);
  if (!instrument) return pageMissing();
  const customer = Store.customer(instrument.customerId);
  return heading(instrument.serial, instrument.family, whenCan("certificate", linkButton("Calibrate", "#/certificates/new?instrument=" + id)) + whenCan("instrument", linkButton("Edit", "#/instruments/" + id + "/edit", "ghost"))) +
    paperRecord(instrument.serial, [
      ["Customer", customer ? '<a class="text-[#0B2540] hover:underline" href="#/customers/' + customer.id + '">' + esc(customer.tradeName) + "</a>" : "—"],
      ["Make", esc(instrument.make || "—")],
      ["Model", esc(instrument.model || "—")],
      ["Tag", esc(instrument.tag || "—")],
      ["Interval", esc(instrument.interval + " months")],
      ["Last calibration", pretty(instrument.lastCalibration)],
      ["Due", pretty(instrument.due) + " " + dueBadge(instrument.due)],
    ]);
}

function pageEnquiries(route) {
  if (route.id === "new") return enquiryForm();
  if (route.mode === "edit") return enquiryForm(Store.enquiry(route.id));
  if (route.id) return enquiryDetail(route.id);
  const pick = UI.filter && UI.filter.enquiries;
  const source = Store.state().enquiries.filter((item) => !pick || item.status === pick);
  const rows = filtered("enquiries", source, (item) => item.summary + " " + item.source + " " + ((Store.customer(item.customerId) || {}).tradeName || ""));
  const page = slicePage("enquiries", rows);
  const body = page.rows.map((item) => cells([
    esc(item.source),
    esc((Store.customer(item.customerId) || {}).tradeName || "—"),
    pretty(item.date),
    badge(item.status),
    String(item.chaseCount),
    rowActions({ id: item.id, view: "#/enquiries/" + item.id, edit: Store.can("enquiry") && item.status !== "Converted" ? "#/enquiries/" + item.id + "/edit" : "", del: Store.can("enquiry") && !item.quotationId ? "delete-enquiry" : "", download: "enquiry" }),
  ])).join("");
  const add = whenCan("enquiry", linkButton("Record confirmation", "#/enquiries/new"));
  if (!Store.state().enquiries.length) return heading("Confirmations", "Verbal and email agreements that are not yet orders.", add) + emptyState("No confirmations", "Record a phone or email agreement. A chase is prepared every few days until an order exists.", add);
  return heading("Confirmations", "Verbal and email agreements that are not yet orders.", add) + toolbar("enquiries", "Search", ["Open", "Chasing", "Converted", "Lost"]) + dataTable(["Source", "Customer", "Date", "Status", "Chases", "Actions"], body, "enquiries", page);
}

function enquiryForm(enquiry) {
  const value = enquiry || { source: "Verbal", date: Store.today() };
  if (!Store.state().customers.length) return heading("New confirmation", "") + emptyState("Add a customer first", "Confirmations are linked to a customer.", linkButton("Add customer", "#/customers/new"));
  return heading(enquiry ? "Edit confirmation" : "New confirmation", "", linkButton("Back", "#/enquiries", "ghost")) +
    '<form data-form="' + (enquiry ? "updateEnquiry" : "addEnquiry") + '" class="mx-auto max-w-3xl">' +
    (enquiry ? '<input type="hidden" name="id" value="' + esc(enquiry.id) + '" />' : "") +
    card('<div class="grid gap-4 sm:grid-cols-2">' +
      (enquiry ? "" : field("Customer", selectInput("customerId", customerOptions(value.customerId)))) +
      field("Source", selectInput("source", optionList([{ value: "Verbal", label: "Verbal or phone" }, { value: "Email", label: "Email" }], value.source))) +
      field("Date", textInput("date", value.date, 'type="date"')) +
      field("Contact", textInput("contact", value.contact)) +
      field("Email", textInput("email", value.email, 'type="email"')) +
      '<div class="sm:col-span-2">' + field("What was confirmed", areaInput("summary", value.summary)) + "</div>" +
      "</div><div class=\"mt-5\">" + button("Save") + "</div>") + "</form>";
}

function enquiryDetail(id) {
  const enquiry = Store.enquiry(id);
  if (!enquiry) return pageMissing();
  const open = enquiry.status !== "Converted" && enquiry.status !== "Lost";
  const controls = open
    ? whenCan("enquiry", '<button type="button" data-action="chase-enquiry" data-id="' + enquiry.id + '" class="rounded-md bg-teal-700 px-3 py-2 text-sm font-medium text-white">Prepare chase email</button><button type="button" data-action="lose-enquiry" data-id="' + enquiry.id + '" class="ml-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">Mark lost</button>') + whenCan("quote", '<button type="button" data-action="convert-enquiry" data-id="' + enquiry.id + '" class="ml-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">Convert to quotation</button>')
    : "";
  return heading(enquiry.source + " confirmation", (Store.customer(enquiry.customerId) || {}).tradeName || "", linkButton("All confirmations", "#/enquiries", "ghost")) +
    card('<p class="text-sm leading-6 text-slate-700">' + esc(enquiry.summary) + '</p><dl class="mt-4 grid gap-2 text-sm sm:grid-cols-2"><div>Status ' + badge(enquiry.status) + "</div><div>Email " + esc(enquiry.email) + "</div><div>Chases " + enquiry.chaseCount + "</div><div>Last chase " + pretty(enquiry.lastChase) + "</div></dl><div class=\"mt-4 flex flex-wrap gap-2\">" + controls + "</div>");
}
