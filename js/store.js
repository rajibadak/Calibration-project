const Store = (() => {
  const KEY = "firstly-cal-v2";
  const FAMILIES = ["Portable monitor", "Fixed monitor", "Area monitor"];
  const SAMPLE_LOGINS = [
    { name: "Admin User", role: "admin", title: "Administrator", email: "admin@firstly.test", password: "Admin@1234" },
    { name: "Accounts User", role: "accounts", title: "Accounts", email: "accounts@firstly.test", password: "Accounts@1234" },
  ];
  const PERMS = {
    admin: ["*"],
    planner: ["customer", "instrument", "enquiry", "quote", "work", "visit", "visitPack"],
    engineer: ["certificate", "visitPack", "stock"],
    accounts: ["invoice", "payment", "gst", "stock"],
    approver: ["fund"],
  };

  let state = empty();

  function empty() {
    return {
      version: 2,
      seq: { user: 0, customer: 1000, instrument: 1000, enquiry: 1000, quotation: 1000, job: 1000, visit: 1000, requisition: 1000, certificate: 1000, invoice: 1000, receipt: 1000, mail: 1000, cylinder: 1000, spare: 1000 },
      company: null,
      settings: { sac: "998346", gstRate: 18, creditDays: 30, paymentEveryDays: 7, chaseEveryDays: 3, dueLeadDays: 15, eInvoice: false, quotationValidityDays: 15, nabl: false, nablNo: "", turnover5cr: false, whatsapp: true },
      rates: { "Portable monitor": 0, "Fixed monitor": 0, "Area monitor": 0, "Site visit": 0 },
      users: [],
      customers: [],
      instruments: [],
      enquiries: [],
      quotations: [],
      workOrders: [],
      visits: [],
      requisitions: [],
      certificates: [],
      invoices: [],
      receipts: [],
      cylinders: [],
      spares: [],
      mails: [],
      gst: {},
      lastJobsRun: "",
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        state = empty();
        return;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 2 || !Array.isArray(parsed.users)) {
        state = empty();
        return;
      }
      state = parsed;
      state.settings = Object.assign({ nabl: false, nablNo: "", turnover5cr: false, whatsapp: true }, state.settings);
      (state.spares || []).forEach((item) => { if (!item.kind) item.kind = /sensor,/i.test(item.name) ? "Sensor" : "Spare part"; });
    } catch {
      state = empty();
    }
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function todayIso() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function addMonths(iso, months) {
    const parts = iso.split("-").map(Number);
    const target = parts[1] - 1 + months;
    const year = parts[0] + Math.floor(target / 12);
    const month = ((target % 12) + 12) % 12;
    const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const day = Math.min(parts[2], last);
    return year + "-" + pad(month + 1) + "-" + pad(day);
  }

  function addDays(iso, days) {
    const parts = iso.split("-").map(Number);
    const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function diffDays(from, to) {
    return Math.round((Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / 86400000);
  }

  function byId(list, id) {
    return (list || []).find((item) => item.id === id) || null;
  }

  function nextId(prefix, key) {
    state.seq[key] += 1;
    return prefix + "-" + state.seq[key];
  }

  function nextNo(prefix, key) {
    state.seq[key] += 1;
    return prefix + "-" + todayIso().slice(0, 4) + "-" + String(state.seq[key]).padStart(4, "0");
  }

  function ok(message, extra) {
    save();
    return Object.assign({ ok: true, message: message || "" }, extra || {});
  }

  function fail(error) {
    return { ok: false, error };
  }

  function user() {
    const id = sessionStorage.getItem("firstly-user");
    return state.users.find((item) => item.id === id) || null;
  }

  function configured() {
    return Boolean(state.company && state.users.length);
  }

  function can(perm) {
    const current = user();
    if (!current) return false;
    const list = PERMS[current.role] || [];
    return list.includes("*") || list.includes(perm);
  }

  function guard(perm) {
    if (!user()) return fail("Sign in to continue.");
    if (!can(perm)) return fail("Your role cannot do that.");
    return null;
  }

  async function digest(password, salt) {
    const encoded = new TextEncoder().encode(salt + ":" + password);
    const buf = await crypto.subtle.digest("SHA-256", encoded);
    return [...new Uint8Array(buf)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function makeSalt() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  async function setup(data) {
    if (configured()) return fail("This installation already has an administrator.");
    const legalName = (data.legalName || "").trim();
    const email = (data.email || "").trim().toLowerCase();
    const name = (data.adminName || "").trim();
    const password = data.password || "";
    if (!legalName || !email || !name) return fail("Company name, your name, and email are required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Enter a valid email address.");
    if (password.length < 8) return fail("Use a password of at least 8 characters.");
    const gstin = (data.gstin || "").toUpperCase().trim();
    if (gstin && !/^[0-9]{2}[A-Z0-9]{13}$/.test(gstin)) return fail("GSTIN must be 15 characters.");
    const salt = makeSalt();
    state = empty();
    state.company = {
      legalName,
      name: (data.tradeName || legalName).trim(),
      gstin,
      stateCode: gstin ? gstin.slice(0, 2) : (data.stateCode || "19"),
      state: (data.state || "").trim(),
      address: (data.address || "").trim(),
      phone: (data.phone || "").trim(),
      email,
      plannerEmail: email,
      bank: (data.bank || "").trim(),
      signatory: name,
    };
    state.users.push({
      id: nextId("u", "user"),
      name,
      role: "admin",
      title: "Administrator",
      email,
      salt,
      passwordHash: await digest(password, salt),
      signature: "",
    });
    save();
    return ok("Administrator account created. Sign in to continue.");
  }

  async function register(data) {
    const email = (data.email || "").trim().toLowerCase();
    const name = (data.name || "").trim();
    const password = data.password || "";
    const phone = (data.phone || "").trim();
    const confirm = data.confirm || "";
    if (!name || !email) return fail("Name and email are required.");
    if (!phone) return fail("Phone is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Enter a valid email address.");
    if (password.length < 8) return fail("Use a password of at least 8 characters.");
    if (password !== confirm) return fail("Password and confirm password do not match.");
    if (state.users.some((item) => item.email === email)) return fail("That email is already registered. Use Login.");
    const legalName = (data.legalName || "").trim();
    if (!legalName) return fail("Company legal name is required.");
    if (!(data.state || "").trim() || !(data.address || "").trim()) return fail("State and address are required.");
    const gst = cleanGstin(data.gstin);
    if (gst.error) return fail(gst.error);
    const salt = makeSalt();
    const passwordHash = await digest(password, salt);
    const role = !configured() ? "admin" : (PERMS[data.role] ? data.role : "planner");
    const titles = { admin: "Administrator", planner: "Planner", engineer: "Service engineer", accounts: "Accounts", approver: "Approver" };
    const title = (data.title || "").trim() || titles[role];
    const companyPhone = (data.companyPhone || phone).trim();
    const stateName = (data.state || "").trim();
    const address = (data.address || "").trim();
    if (!configured()) {
      state = empty();
      state.company = {
        legalName,
        name: (data.tradeName || legalName).trim(),
        gstin: gst.gstin,
        stateCode: gst.gstin ? gst.gstin.slice(0, 2) : ((data.stateCode || "").trim() || "19"),
        state: stateName,
        address,
        phone: companyPhone,
        email,
        plannerEmail: email,
        bank: (data.bank || "").trim(),
        signatory: name,
      };
    } else {
      state.company.legalName = legalName;
      state.company.name = (data.tradeName || state.company.name || legalName).trim();
      state.company.gstin = gst.gstin;
      state.company.state = stateName;
      state.company.stateCode = gst.gstin ? gst.gstin.slice(0, 2) : ((data.stateCode || state.company.stateCode || "").trim());
      state.company.address = address;
      state.company.phone = companyPhone;
      state.company.bank = (data.bank || state.company.bank || "").trim();
      if (!state.company.signatory) state.company.signatory = name;
    }
    state.users.push({ id: nextId("u", "user"), name, role, title, email, phone, salt, passwordHash, signature: "" });
    save();
    return ok("Account created. Sign in with that email.");
  }

  async function ensureNamedUser(spec) {
    let found = state.users.find((item) => item.email === spec.email);
    if (!found) {
      const salt = makeSalt();
      found = {
        id: nextId("u", "user"),
        name: spec.name,
        role: spec.role,
        title: spec.title,
        email: spec.email,
        phone: spec.phone || "",
        salt,
        passwordHash: await digest(spec.password, salt),
        signature: spec.signature || "",
      };
      state.users.push(found);
    } else if (spec.signature && !found.signature) {
      found.signature = spec.signature;
    }
    return found;
  }

  function seedOperatingRecords(engineer, approver) {
    if (state.instruments.length || state.invoices.length || state.cylinders.length) return;
    const today = todayIso();
    const year = today.slice(0, 4);
    const admin = state.users.find((item) => item.role === "admin") || state.users[0];
    state.rates = { "Portable monitor": 250000, "Fixed monitor": 450000, "Area monitor": 350000, "Site visit": 150000 };
    state.company.gstin = state.company.gstin || "19AADCF3921B1Z8";
    state.company.stateCode = state.company.stateCode || "19";
    state.company.state = state.company.state || "West Bengal";
    state.company.address = state.company.address || "P-12, Kasba Industrial Estate, Kolkata 700107";
    state.company.phone = state.company.phone || "033 2442 1180";
    state.company.bank = state.company.bank || "HDFC Bank, Kasba branch, A/c 50200041883311, IFSC HDFC0001992";
    state.company.signatory = state.company.signatory || admin.name;
    state.company.plannerEmail = state.company.plannerEmail || admin.email;

    const customers = [
      ["Haldia Hydrocarbon Complex", "Haldia Hydrocarbon", "19AABCH1842Q1Z5", "19", "West Bengal", "Refinery Gate 2, Haldia 721602", "Unit 3, Haldia", "purchase@haldiahydro.in", "03224 255 210", "S. Banerjee"],
      ["Durgapur Alloy & Steel Pvt Ltd", "Durgapur Alloy", "19AADCD5521R1ZV", "19", "West Bengal", "Industrial Area, Durgapur 713203", "SMS shop", "stores@durgapuralloy.in", "0343 255 4410", "R. Mukherjee"],
      ["Budge Budge Generating Station", "Budge Budge GS", "19AABCB7630P1Z8", "19", "West Bengal", "Pujali, Budge Budge 700138", "Turbine hall", "maintenance@bbgs.in", "033 2480 2211", "A. Ghosh"],
      ["Kolkata Dock System", "Kolkata Dock", "19AABCK2204N1Z6", "19", "West Bengal", "Circular Garden Reach, Kolkata 700043", "Electrical workshop", "electrical@kolkatadock.in", "033 2439 1180", "P. Das"],
      ["Paradip Marine Workshop", "Paradip Marine", "21AABCP4418L1Z2", "21", "Odisha", "Port estate, Paradip 754142", "Dry dock", "workshop@paradipmarine.in", "06722 220 145", "N. Sahoo"],
      ["Howrah Industrial Gases", "Howrah Gases", "19AADCH9088M1Z9", "19", "West Bengal", "Andul Road, Howrah 711109", "Cylinder yard", "safety@howrahgases.in", "033 2650 7740", "T. Singh"],
      ["Haldia Dock Stores", "Haldia Dock", "19AADHD3310D1Z4", "19", "West Bengal", "Dock zone, Haldia 721604", "Store 4", "stores@haldiadock.in", "03224 252 900", "M. Jana"],
      ["Kharagpur Locomotive Workshop", "KGP Loco", "19AAACK7742E1Z3", "19", "West Bengal", "Workshop road, Kharagpur 721301", "Paint shop", "safety@kgploco.in", "03222 255 018", "B. Rao"],
    ].map((row) => {
      const id = nextId("c", "customer");
      state.customers.push({ id, legalName: row[0], tradeName: row[1], gstin: row[2], stateCode: row[3], state: row[4], address: row[5], site: row[6], email: row[7], phone: row[8], contact: row[9], gstr1: "Filed", gstr3b: "Filed", gstChecked: addDays(today, -12) });
      return id;
    });

    const instrumentRows = [
      [0, "Portable monitor", "MSA", "Altair 4XR", "A4X-190442", "HHC-P-12", 6, addMonths(today, -3)],
      [0, "Fixed monitor", "MSA", "Ultima X5000", "UX5-220118", "HHC-F-03", 6, addMonths(today, -2)],
      [1, "Portable monitor", "Honeywell", "BW Clip4", "BW-884210", "DAS-P-07", 3, addDays(today, -100)],
      [1, "Area monitor", "Dräger", "X-zone 5500", "XZ-44190", "DAS-A-02", 6, addMonths(today, -1)],
      [2, "Portable monitor", "MSA", "Altair 5X", "A5X-330912", "BB-P-18", 4, ""],
      [2, "Fixed monitor", "Det-Tronics", "GT3000", "GT-77821", "BB-F-01", 6, ""],
      [3, "Portable monitor", "Crowcon", "T4", "T4-552190", "KD-P-04", 6, addMonths(today, -5)],
      [4, "Portable monitor", "Dräger", "X-am 5600", "XA-918334", "PM-P-11", 3, addMonths(today, -2)],
      [6, "Area monitor", "MSA", "Trigard", "TG-12044", "HD-A-01", 6, addDays(today, -200)],
      [7, "Fixed monitor", "Honeywell", "Sensepoint XCL", "SX-66021", "KG-F-06", 4, addMonths(today, -4)],
    ];
    const instruments = instrumentRows.map((row) => {
      const id = nextId("i", "instrument");
      const due = row[7] ? addMonths(row[7], row[6]) : "";
      state.instruments.push({ id, customerId: customers[row[0]], family: row[1], make: row[2], model: row[3], serial: row[4], tag: row[5], interval: row[6], lastCalibration: row[7], due });
      return id;
    });

    const enquiries = [
      { customer: 1, source: "Verbal", date: addDays(today, -6), summary: "Four portable monitors for the SMS shop, due this quarter.", status: "Chasing", chases: 1, last: addDays(today, -3) },
      { customer: 5, source: "Email", date: addDays(today, -20), summary: "Area monitor for the cylinder yard. Customer deferred the order.", status: "Lost", chases: 2, last: addDays(today, -9) },
      { customer: 3, source: "Email", date: addDays(today, -2), summary: "Two portable monitors for the electrical workshop.", status: "Open", chases: 0, last: "" },
      { customer: 0, source: "Verbal", date: addMonths(today, -3), summary: "Portable and fixed monitors for Unit 3 shutdown.", status: "Converted", chases: 0, last: "" },
    ].map((row) => {
      const customer = state.customers.find((item) => item.id === customers[row.customer]);
      const id = nextId("e", "enquiry");
      state.enquiries.push({ id, customerId: customer.id, source: row.source, date: row.date, summary: row.summary, contact: customer.contact, email: customer.email, status: row.status, ownerId: admin.id, lastChase: row.last, chaseCount: row.chases });
      return id;
    });

    function addQuote(customerIndex, status, notes, lines, date) {
      const id = nextId("q", "quotation");
      const seq = id.split("-")[1];
      const stored = lines.map((line) => ({ family: line[0], detail: line[1], qty: line[2], ratePaise: line[3] }));
      state.quotations.push(Object.assign({
        id,
        number: "QT-" + year + "-" + seq,
        customerId: customers[customerIndex],
        date,
        validUntil: addDays(date, 15),
        status,
        notes,
        lines: stored,
      }, quoteTotals(customers[customerIndex], stored)));
      return id;
    }
    const quoteHaldia = addQuote(0, "Accepted", "Shutdown calibration for Unit 3.", [["Portable monitor", "MSA Altair 4XR, serial A4X-190442", 1, 250000], ["Fixed monitor", "MSA Ultima X5000, serial UX5-220118", 1, 450000], ["Site visit", "Haldia, two engineers, one day", 1, 150000]], addMonths(today, -3));
    const quoteDurgapur = addQuote(1, "Sent", "SMS shop portables and one area monitor.", [["Portable monitor", "Honeywell BW Clip4", 4, 220000], ["Area monitor", "Dräger X-zone 5500", 1, 350000]], addDays(today, -4));
    addQuote(3, "Draft", "Electrical workshop, two portables.", [["Portable monitor", "Crowcon T4 calibration", 2, 250000]], addDays(today, -1));
    addQuote(5, "Rejected", "Customer deferred the cylinder-yard monitor.", [["Area monitor", "Area monitor at Howrah yard", 1, 350000]], addDays(today, -18));
    state.enquiries.find((item) => item.id === enquiries[3]).quotationId = quoteHaldia;

    function addJob(customerIndex, quoteId, woNumber, woDate, site, instrumentIndexes, status) {
      const id = nextId("w", "job");
      const seq = id.split("-")[1];
      state.workOrders.push({ id, number: "JOB-" + year + "-" + seq, woNumber, woDate, customerId: customers[customerIndex], quotationId: quoteId, site, instrumentIds: instrumentIndexes.map((index) => instruments[index]), status });
      return id;
    }
    const jobHaldia = addJob(0, quoteHaldia, "HHC/PO/26/118", addMonths(today, -3), "Unit 3, Haldia", [0, 1], "Invoiced");
    const jobBudge = addJob(2, null, "BBGS/WO/884", addDays(today, -2), "Turbine hall, Budge Budge", [4, 5], "Scheduled");
    const jobParadip = addJob(4, null, "PMW/26/044", addMonths(today, -2), "Dry dock, Paradip", [7], "Invoiced");
    const jobKgp = addJob(7, null, "KGP/MNT/219", addMonths(today, -4), "Paint shop, Kharagpur", [9], "Invoiced");
    const jobDock = addJob(3, null, "KDS/EL/118", addDays(today, -1), "Electrical workshop, Kolkata", [6], "Scheduled");

    const cylinders = [
      ["CYL-CH4-118", "Multi gas", [{ gas: "Methane", concentration: "50", unit: "% LEL" }, { gas: "Carbon monoxide", concentration: "100", unit: "ppm" }, { gas: "Hydrogen sulphide", concentration: "25", unit: "ppm" }, { gas: "Oxygen", concentration: "18", unit: "% vol" }], "Chemtron Gases", "GC-CH4-118", addMonths(today, 8), "Issued"],
      ["CYL-CO-042", "Single gas", [{ gas: "Carbon monoxide", concentration: "100", unit: "ppm" }], "Indian Oxygen", "GC-CO-042", addMonths(today, 5), "In stock"],
      ["CYL-O2-007", "Single gas", [{ gas: "Oxygen", concentration: "20.9", unit: "% vol" }], "Chemtron Gases", "GC-O2-007", addMonths(today, 10), "In stock"],
      ["CYL-H2S-015", "Single gas", [{ gas: "Hydrogen sulphide", concentration: "25", unit: "ppm" }], "Speciality Gas", "GC-H2S-015", addMonths(today, 2), "Quarantined"],
      ["CYL-LEL-003", "Single gas", [{ gas: "Methane", concentration: "50", unit: "% LEL" }], "Chemtron Gases", "GC-LEL-003", addDays(today, -30), "Expired"],
    ].map((row) => {
      const id = nextId("cyl", "cylinder");
      state.cylinders.push({ id, number: row[0], kind: row[1], gases: row[2], supplier: row[3], gasCertNo: row[4], expiry: row[5], location: "Kasba store", status: row[6], workOrderId: row[6] === "Issued" ? jobHaldia : "" });
      return id;
    });
    const upcoming = state.instruments.find((item) => item.serial === "T4-552190");
    if (upcoming) upcoming.due = addDays(today, 12);

    function addCertificate(spec) {
      const id = nextId("cert", "certificate");
      const seq = id.split("-")[1];
      state.certificates.push({
        id,
        number: spec.status === "Draft" ? "" : "CAL-" + year + "-" + seq,
        status: spec.status,
        revisionOf: "",
        family: spec.family,
        customerId: customers[spec.customer],
        instrumentId: instruments[spec.instrument],
        workOrderId: spec.job,
        woNumber: spec.woNumber,
        woDate: spec.woDate,
        serial: spec.serial,
        calibrationDate: spec.date,
        interval: spec.interval,
        dueDate: addMonths(spec.date, spec.interval),
        cylinderId: cylinders[0],
        cylinderNumber: "CYL-CH4-118",
        gasCertNo: "GC-CH4-118",
        engineerId: engineer.id,
        notes: spec.notes,
        gases: spec.gases,
      });
      return id;
    }
    const certHaldiaP = addCertificate({ status: "Issued", family: "Portable monitor", customer: 0, instrument: 0, job: jobHaldia, woNumber: "HHC/PO/26/118", woDate: addMonths(today, -3), serial: "A4X-190442", date: addMonths(today, -3), interval: 6, notes: "Shutdown calibration, Unit 3.", gases: [{ gas: "Methane", concentration: "50", unit: "% LEL", asFound: "48", asLeft: "50" }, { gas: "Carbon monoxide", concentration: "100", unit: "ppm", asFound: "96", asLeft: "100" }] });
    const certHaldiaF = addCertificate({ status: "Issued", family: "Fixed monitor", customer: 0, instrument: 1, job: jobHaldia, woNumber: "HHC/PO/26/118", woDate: addMonths(today, -3), serial: "UX5-220118", date: addMonths(today, -2), interval: 6, notes: "Fixed point at compressor house.", gases: [{ gas: "Methane", concentration: "50", unit: "% LEL", asFound: "46", asLeft: "50" }] });
    const certParadip = addCertificate({ status: "Issued", family: "Portable monitor", customer: 4, instrument: 7, job: jobParadip, woNumber: "PMW/26/044", woDate: addMonths(today, -2), serial: "XA-918334", date: addMonths(today, -2), interval: 3, notes: "Dry dock team monitors.", gases: [{ gas: "Hydrogen sulphide", concentration: "25", unit: "ppm", asFound: "23", asLeft: "25" }, { gas: "Oxygen", concentration: "18", unit: "% vol", asFound: "17.6", asLeft: "18.0" }] });
    const certKgp = addCertificate({ status: "Issued", family: "Fixed monitor", customer: 7, instrument: 9, job: jobKgp, woNumber: "KGP/MNT/219", woDate: addMonths(today, -4), serial: "SX-66021", date: addMonths(today, -4), interval: 4, notes: "Paint shop fixed point.", gases: [{ gas: "Methane", concentration: "50", unit: "% LEL", asFound: "47", asLeft: "50" }] });
    addCertificate({ status: "Draft", family: "Portable monitor", customer: 3, instrument: 6, job: jobDock, woNumber: "KDS/EL/118", woDate: addDays(today, -1), serial: "T4-552190", date: today, interval: 6, notes: "As-left reading still open. Not issued.", gases: [{ gas: "Methane", concentration: "50", unit: "% LEL", asFound: "49", asLeft: "" }] });

    function addInvoice(spec) {
      const id = nextId("inv", "invoice");
      const seq = id.split("-")[1];
      const lines = spec.lines.map((line) => ({ detail: line[0], family: line[1], qty: line[2], ratePaise: line[3] }));
      const taxablePaise = lines.reduce((sum, line) => sum + line.qty * line.ratePaise, 0);
      const tax = taxOf(customers[spec.customer], taxablePaise);
      const invoice = {
        id,
        number: "INV-" + year + "-" + seq,
        date: spec.date,
        due: addDays(spec.date, 30),
        customerId: customers[spec.customer],
        workOrderId: spec.job,
        certificateId: spec.certificate,
        status: "Issued",
        remindersStopped: false,
        irn: spec.irn || "",
        notes: spec.notes || "",
        lines,
        taxablePaise,
        cgstPaise: tax.cgstPaise,
        sgstPaise: tax.sgstPaise,
        igstPaise: tax.igstPaise,
        totalPaise: taxablePaise + tax.taxPaise,
        paidPaise: 0,
      };
      state.invoices.push(invoice);
      return invoice;
    }
    const invHaldia = addInvoice({ customer: 0, job: jobHaldia, certificate: certHaldiaP, date: addDays(today, -20), irn: "", notes: "Unit 3 shutdown. Site visit included.", lines: [["Portable monitor calibration, serial A4X-190442", "Portable monitor", 1, 250000], ["Fixed monitor calibration, serial UX5-220118", "Fixed monitor", 1, 450000], ["Site visit, Haldia", "Site visit", 1, 150000]] });
    const invParadip = addInvoice({ customer: 4, job: jobParadip, certificate: certParadip, date: addDays(today, -12), notes: "IGST. Paradip is outside West Bengal.", lines: [["Portable monitor calibration, serial XA-918334", "Portable monitor", 1, 250000]] });
    const invKgp = addInvoice({ customer: 7, job: jobKgp, certificate: certKgp, date: addDays(today, -40), notes: "Paint shop fixed monitor.", lines: [["Fixed monitor calibration, serial SX-66021", "Fixed monitor", 1, 450000]] });
    state.receipts.push({ id: nextId("rc", "receipt"), invoiceId: invHaldia.id, date: addDays(today, -5), amountPaise: Math.round(invHaldia.totalPaise / 2), mode: "Bank", reference: "HDFC UTR 61029441" });
    invHaldia.paidPaise = Math.round(invHaldia.totalPaise / 2);
    invHaldia.status = "Partly paid";
    state.receipts.push({ id: nextId("rc", "receipt"), invoiceId: invKgp.id, date: addDays(today, -10), amountPaise: invKgp.totalPaise, mode: "Bank", reference: "SBI UTR 22918440" });
    invKgp.paidPaise = invKgp.totalPaise;
    invKgp.status = "Paid";

    function addVisit(spec) {
      const id = nextId("v", "visit");
      state.visits.push({ id, workOrderId: spec.job, date: spec.date, time: spec.time, engineerId: engineer.id, jobType: spec.jobType, location: spec.location, contact: spec.contact, transport: spec.transport || "", travelPaise: spec.travel || 0, otherPaise: spec.other || 0, notes: spec.notes || "", packStatus: spec.pack, overrideReason: "" });
      return id;
    }
    const visitBudge = addVisit({ job: jobBudge, date: addDays(today, 4), time: "09:30", jobType: "Site calibration", location: "Turbine hall, Budge Budge", contact: "A. Ghosh", transport: "Office car", travel: 180000, other: 25000, notes: "Gate pass in the name of Rahul Sen.", pack: "Submitted" });
    addVisit({ job: jobBudge, date: addDays(today, 6), time: "14:00", jobType: "Site calibration", location: "Jetty, Budge Budge", contact: "A. Ghosh", pack: "Empty" });
    const visitKgp = addVisit({ job: jobKgp, date: addDays(today, -3), time: "11:00", jobType: "Workshop calibration", location: "Kasba workshop", contact: "B. Rao", transport: "Customer delivery", travel: 0, other: 0, notes: "Instrument received at the workshop.", pack: "Submitted" });
    const reqBudge = nextId("r", "requisition");
    state.requisitions.push({ id: reqBudge, number: "FR-" + year + "-" + reqBudge.split("-")[1], visitId: visitBudge, amountPaise: 205000, status: "Submitted", events: [{ at: new Date().toISOString(), by: engineer.id, text: "Submitted for ₹2,050." }] });
    const reqKgp = nextId("r", "requisition");
    state.requisitions.push({ id: reqKgp, number: "FR-" + year + "-" + reqKgp.split("-")[1], visitId: visitKgp, amountPaise: 0, status: "Released", events: [{ at: new Date().toISOString(), by: approver.id, text: "Workshop job. No travel amount. Released at ₹0." }] });

    [
      ["FIL-01", "MSA sensor filter, Altair", 24, 10],
      ["SEN-CO", "CO sensor, 4-series", 6, 4],
      ["SEN-H2S", "H2S sensor, 4-series", 2, 4],
      ["CAL-CAP", "Calibration cap, portable", 15, 5],
      ["TUB-3", "Tygon sample tube, 3 mm", 8, 6],
      ["BAT-XR", "Altair battery pack", 3, 3],
    ].forEach((row) => {
      state.spares.push({ id: nextId("s", "spare"), code: row[0], name: row[1], kind: /sensor,/i.test(row[1]) ? "Sensor" : /tube|cap/i.test(row[1]) ? "Consumable" : "Spare part", qty: row[2], reorder: row[3] });
    });

    const haldia = state.customers.find((item) => item.id === customers[0]);
    const durgapur = state.customers.find((item) => item.id === customers[1]);
    state.mails.push(
      { id: nextId("m", "mail"), at: new Date().toISOString(), type: "Order chase", to: durgapur.email, subject: "Reminder: calibration order not yet received", body: "This confirms our verbal discussion on " + addDays(today, -6) + ".\n\nFour portable monitors for the SMS shop, due this quarter.\n\nPlease place the order so we can schedule the work.", status: "Prepared", links: { enquiryId: enquiries[0] } },
      { id: nextId("m", "mail"), at: new Date().toISOString(), type: "Quotation", to: durgapur.email, subject: "Quotation " + state.quotations.find((item) => item.id === quoteDurgapur).number, body: "Please find the quotation for the SMS shop monitors. It is valid for 15 days.", status: "Prepared", links: { quotationId: quoteDurgapur } },
      { id: nextId("m", "mail"), at: new Date().toISOString(), type: "Certificate and invoice", to: haldia.email, subject: "Certificate " + state.certificates.find((item) => item.id === certHaldiaP).number + " and invoice " + invHaldia.number, body: "Certificate for serial A4X-190442.\nInvoice " + invHaldia.number + " total " + rupees(invHaldia.totalPaise) + ". A part payment has been received.", status: "Prepared", links: { certificateId: certHaldiaP, invoiceId: invHaldia.id } },
      { id: nextId("m", "mail"), at: new Date().toISOString(), type: "Visit pack", to: state.company.plannerEmail, subject: "Fund request " + state.requisitions[0].number, body: "Job type: Site calibration\nLocation: Turbine hall, Budge Budge\nEngineer: " + engineer.name + "\nAmount: ₹2,050", status: "Prepared", links: { requisitionId: reqBudge } },
      { id: nextId("m", "mail"), at: new Date().toISOString(), type: "Payment reminder", to: state.customers.find((item) => item.id === customers[4]).email, subject: "Invoice " + invParadip.number + " is outstanding", body: "Invoice " + invParadip.number + " for the Paradip dry-dock monitors is still open. Balance " + rupees(invParadip.totalPaise) + ".", status: "Prepared", links: { invoiceId: invParadip.id } }
    );
  }

  async function prepareSampleAccess() {
    let changed = false;
    if (!configured()) {
      state = empty();
      state.company = {
        legalName: "Firstly Calibration",
        name: "Firstly",
        gstin: "",
        stateCode: "19",
        state: "West Bengal",
        address: "",
        phone: "",
        email: SAMPLE_LOGINS[0].email,
        plannerEmail: SAMPLE_LOGINS[0].email,
        bank: "",
        signatory: SAMPLE_LOGINS[0].name,
      };
      changed = true;
    }
    for (const sample of SAMPLE_LOGINS) {
      const salt = makeSalt();
      const passwordHash = await digest(sample.password, salt);
      const existing = state.users.find((item) => item.email === sample.email);
      if (existing) {
        existing.name = sample.name;
        existing.role = sample.role;
        existing.title = sample.title;
        existing.salt = salt;
        existing.passwordHash = passwordHash;
        changed = true;
        continue;
      }
      state.users.push({
        id: nextId("u", "user"),
        name: sample.name,
        role: sample.role,
        title: sample.title,
        email: sample.email,
        salt,
        passwordHash,
        signature: "",
      });
      changed = true;
    }
    const signature = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="180" height="64" viewBox="0 0 180 64"><path d="M8 42c18-28 28 20 46-6 14-20 22 24 40 4 16-18 28 8 48-2" fill="none" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/></svg>');
    const engineer = await ensureNamedUser({ name: "Rahul Sen", role: "engineer", title: "Service engineer", email: "rahul@firstly.test", password: "Engineer@1234", phone: "9830012210", signature });
    const approver = await ensureNamedUser({ name: "Anita Roy", role: "approver", title: "Approver", email: "anita@firstly.test", password: "Approver@1234", phone: "9830064412", signature: "" });
    const adminUser = state.users.find((item) => item.role === "admin");
    if (adminUser && !adminUser.signature) adminUser.signature = signature;
    seedOperatingRecords(engineer, approver);
    save();
    return ok("");
  }

  function sampleLogins() {
    return SAMPLE_LOGINS.filter((sample) => state.users.some((item) => item.email === sample.email)).map((sample) => ({
      name: sample.name,
      title: sample.title,
      role: sample.role,
      email: sample.email,
      password: sample.password,
    }));
  }

  async function login(email, password) {
    const found = state.users.find((item) => item.email === (email || "").trim().toLowerCase());
    if (!found) return fail("Email or password is incorrect.");
    const hash = await digest(password || "", found.salt);
    if (hash !== found.passwordHash) return fail("Email or password is incorrect.");
    sessionStorage.setItem("firstly-user", found.id);
    return ok("Signed in.");
  }

  function logout() {
    sessionStorage.removeItem("firstly-user");
  }

  function rupees(paise) {
    const amount = Math.abs(Number(paise) || 0) / 100;
    return (paise < 0 ? "-" : "") + "₹" + amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function person(id) {
    const found = byId(state.users, id);
    return found ? found.name : "—";
  }

  function taxOf(customerId, taxablePaise) {
    const customer = byId(state.customers, customerId);
    const rate = Number(state.settings.gstRate) || 0;
    const tax = Math.round((taxablePaise * rate) / 100);
    const intra = customer && state.company && customer.stateCode === state.company.stateCode;
    if (intra) {
      const half = Math.floor(tax / 2);
      return { cgstPaise: half, sgstPaise: tax - half, igstPaise: 0, taxPaise: tax };
    }
    return { cgstPaise: 0, sgstPaise: 0, igstPaise: tax, taxPaise: tax };
  }

  function cleanGstin(value) {
    const gstin = (value || "").toUpperCase().replace(/\s/g, "");
    if (gstin && !/^[0-9]{2}[A-Z0-9]{13}$/.test(gstin)) return { error: "GSTIN must be 15 characters." };
    return { gstin };
  }

  function customerPayload(data) {
    const legalName = (data.legalName || "").trim();
    const email = (data.email || "").trim();
    if (!legalName || !email) return { error: "Legal name and email are required." };
    const gst = cleanGstin(data.gstin);
    if (gst.error) return gst;
    return {
      value: {
        legalName,
        tradeName: (data.tradeName || legalName).trim(),
        gstin: gst.gstin,
        stateCode: gst.gstin ? gst.gstin.slice(0, 2) : (data.stateCode || state.company.stateCode || ""),
        state: (data.state || "").trim(),
        address: (data.address || "").trim(),
        site: (data.site || data.address || "").trim(),
        email,
        phone: (data.phone || "").trim(),
        contact: (data.contact || "").trim(),
        gstr1: (data.gstr1 || "").trim(),
        gstr3b: (data.gstr3b || "").trim(),
        gstChecked: (data.gstChecked || "").trim(),
      },
    };
  }

  function addCustomer(data) {
    const denied = guard("customer");
    if (denied) return denied;
    const parsed = customerPayload(data);
    if (parsed.error) return fail(parsed.error);
    const id = nextId("c", "customer");
    state.customers.unshift(Object.assign({ id }, parsed.value));
    return ok("Customer saved.", { hash: "#/customers/" + id });
  }

  function updateCustomer(id, data) {
    const denied = guard("customer");
    if (denied) return denied;
    const customer = byId(state.customers, id);
    if (!customer) return fail("Customer not found.");
    const parsed = customerPayload(data);
    if (parsed.error) return fail(parsed.error);
    Object.assign(customer, parsed.value);
    return ok("Customer updated.", { hash: "#/customers/" + id });
  }

  function deleteCustomer(id) {
    const denied = guard("customer");
    if (denied) return denied;
    const linked = state.quotations.some((item) => item.customerId === id) || state.workOrders.some((item) => item.customerId === id) || state.invoices.some((item) => item.customerId === id) || state.enquiries.some((item) => item.customerId === id) || state.certificates.some((item) => item.customerId === id);
    if (linked) return fail("This customer has business records. Delete or move those records first.");
    const instrumentIds = state.instruments.filter((item) => item.customerId === id).map((item) => item.id);
    if (instrumentIds.some((instrumentId) => state.certificates.some((item) => item.instrumentId === instrumentId))) return fail("This customer has calibration certificates.");
    state.instruments = state.instruments.filter((item) => item.customerId !== id);
    state.customers = state.customers.filter((item) => item.id !== id);
    return ok("Customer deleted.", { hash: "#/customers" });
  }

  function addInstrument(data) {
    const denied = guard("instrument");
    if (denied) return denied;
    const parsed = instrumentPayload(data);
    if (parsed.error) return fail(parsed.error);
    const id = nextId("i", "instrument");
    state.instruments.unshift(Object.assign({ id, lastCalibration: "", due: "" }, parsed.value));
    return ok("Instrument saved.", { hash: "#/instruments/" + id });
  }

  function instrumentPayload(data) {
    if (!data.customerId || !byId(state.customers, data.customerId)) return { error: "Choose a customer." };
    const serial = (data.serial || "").trim();
    if (!serial) return { error: "Serial number is required." };
    if (!FAMILIES.includes(data.family)) return { error: "Choose portable, fixed, or area monitor." };
    const interval = Number(data.interval);
    if (![3, 4, 6].includes(interval)) return { error: "Interval must be 3, 4, or 6 months." };
    const make = (data.make || "").trim();
    const duplicate = state.instruments.find((item) => item.id !== data.id && item.make.toLowerCase() === make.toLowerCase() && item.serial.toLowerCase() === serial.toLowerCase());
    if (duplicate) return { error: "That serial number is already registered for this make." };
    return { value: { customerId: data.customerId, family: data.family, make, model: (data.model || "").trim(), serial, tag: (data.tag || "").trim(), interval } };
  }

  function updateInstrument(id, data) {
    const denied = guard("instrument");
    if (denied) return denied;
    const instrument = byId(state.instruments, id);
    if (!instrument) return fail("Instrument not found.");
    const parsed = instrumentPayload(Object.assign({}, data, { id }));
    if (parsed.error) return fail(parsed.error);
    Object.assign(instrument, parsed.value);
    if (instrument.lastCalibration) instrument.due = addMonths(instrument.lastCalibration, instrument.interval);
    return ok("Instrument updated.", { hash: "#/instruments/" + id });
  }

  function deleteInstrument(id) {
    const denied = guard("instrument");
    if (denied) return denied;
    if (state.certificates.some((item) => item.instrumentId === id)) return fail("This instrument has a certificate. Delete or revise that certificate first.");
    if (state.workOrders.some((item) => item.instrumentIds.includes(id) && !["Cancelled", "Closed"].includes(item.status))) return fail("This instrument is on an open work order.");
    state.instruments = state.instruments.filter((item) => item.id !== id);
    state.workOrders.forEach((order) => {
      order.instrumentIds = order.instrumentIds.filter((item) => item !== id);
    });
    return ok("Instrument deleted.", { hash: "#/instruments" });
  }

  function addEnquiry(data) {
    const denied = guard("enquiry");
    if (denied) return denied;
    if (!data.customerId || !(data.summary || "").trim()) return fail("Customer and a summary are required.");
    const customer = byId(state.customers, data.customerId);
    const id = nextId("e", "enquiry");
    state.enquiries.unshift({
      id,
      customerId: data.customerId,
      source: data.source === "Email" ? "Email" : "Verbal",
      date: data.date || todayIso(),
      summary: data.summary.trim(),
      contact: (data.contact || customer.contact || "").trim(),
      email: (data.email || customer.email).trim(),
      status: "Open",
      ownerId: user().id,
      lastChase: "",
      chaseCount: 0,
    });
    return ok("Confirmation saved.", { hash: "#/enquiries/" + id });
  }

  function updateEnquiry(id, data) {
    const denied = guard("enquiry");
    if (denied) return denied;
    const enquiry = byId(state.enquiries, id);
    if (!enquiry) return fail("Confirmation not found.");
    if (enquiry.status === "Converted") return fail("A converted confirmation is edited through its quotation.");
    if (!(data.summary || "").trim()) return fail("Summary is required.");
    enquiry.source = data.source === "Email" ? "Email" : "Verbal";
    enquiry.date = data.date || enquiry.date;
    enquiry.summary = data.summary.trim();
    enquiry.contact = (data.contact || "").trim();
    enquiry.email = (data.email || enquiry.email).trim();
    return ok("Confirmation updated.", { hash: "#/enquiries/" + id });
  }

  function deleteEnquiry(id) {
    const denied = guard("enquiry");
    if (denied) return denied;
    const enquiry = byId(state.enquiries, id);
    if (!enquiry) return fail("Confirmation not found.");
    if (enquiry.quotationId) return fail("This confirmation already has a quotation.");
    state.enquiries = state.enquiries.filter((item) => item.id !== id);
    return ok("Confirmation deleted.", { hash: "#/enquiries" });
  }

  function logMail(type, to, subject, body, links) {
    const id = nextId("m", "mail");
    state.mails.unshift({ id, at: new Date().toISOString(), type, to, subject, body, status: "Prepared", links: links || {} });
    return id;
  }

  function chaseEnquiry(id) {
    const denied = guard("enquiry");
    if (denied) return denied;
    const enquiry = byId(state.enquiries, id);
    if (!enquiry || enquiry.status === "Converted" || enquiry.status === "Lost") return fail("This confirmation is closed.");
    enquiry.status = "Chasing";
    enquiry.lastChase = todayIso();
    enquiry.chaseCount += 1;
    const subject = "Reminder: calibration order not yet received";
    const body = "This confirms our " + enquiry.source.toLowerCase() + " discussion on " + enquiry.date + ".\n\n" + enquiry.summary + "\n\nPlease place the order so we can schedule the work. This reminder repeats until the order is received.";
    logMail("Order chase", enquiry.email, subject, body, { enquiryId: id });
    return ok("Chase email prepared. Open it from the mail log.", { hash: "#/mail" });
  }

  function loseEnquiry(id) {
    const denied = guard("enquiry");
    if (denied) return denied;
    const enquiry = byId(state.enquiries, id);
    if (!enquiry) return fail("Confirmation not found.");
    enquiry.status = "Lost";
    return ok("Confirmation closed. Reminders will stop.");
  }

  function moneyLines(lines) {
    return lines.map((line) => ({
      family: (line.family || "").trim(),
      detail: (line.detail || "").trim(),
      qty: Math.max(1, Number(line.qty) || 1),
      ratePaise: Math.round((Number(line.rate) || 0) * 100),
    }));
  }

  function quoteLinesOk(lines) {
    if (!lines.length || lines.some((line) => line.ratePaise <= 0)) return fail("Each line needs a rate.");
    if (lines.some((line) => !line.family)) return fail("Enter a type.");
    return null;
  }

  function quoteTotals(customerId, lines) {
    const taxablePaise = lines.reduce((sum, line) => sum + line.qty * line.ratePaise, 0);
    return Object.assign({ taxablePaise }, taxOf(customerId, taxablePaise));
  }

  function addQuotation(data) {
    const denied = guard("quote");
    if (denied) return denied;
    if (!data.customerId) return fail("Choose a customer.");
    const lines = moneyLines(JSON.parse(data.lines || "[]"));
    const invalid = quoteLinesOk(lines);
    if (invalid) return invalid;
    const id = nextId("q", "quotation");
    state.quotations.unshift(Object.assign({
      id,
      number: nextNo("QT", "quotation"),
      customerId: data.customerId,
      date: todayIso(),
      validUntil: addDays(todayIso(), Number(state.settings.quotationValidityDays) || 15),
      status: "Draft",
      notes: (data.notes || "").trim(),
      lines,
    }, quoteTotals(data.customerId, lines)));
    return ok("Quotation saved.", { hash: "#/quotations/" + id });
  }

  function updateQuotation(id, data) {
    const denied = guard("quote");
    if (denied) return denied;
    const quote = byId(state.quotations, id);
    if (!quote) return fail("Quotation not found.");
    if (quote.status === "Accepted" || quote.status === "Rejected") return fail("Accepted and rejected quotations cannot be edited. Download a copy or create a new quotation.");
    const lines = moneyLines(JSON.parse(data.lines || "[]"));
    const invalid = quoteLinesOk(lines);
    if (invalid) return invalid;
    quote.customerId = data.customerId || quote.customerId;
    quote.notes = (data.notes || "").trim();
    quote.lines = lines;
    Object.assign(quote, quoteTotals(quote.customerId, lines));
    return ok("Quotation updated.", { hash: "#/quotations/" + id });
  }

  function deleteQuotation(id) {
    const denied = guard("quote");
    if (denied) return denied;
    const quote = byId(state.quotations, id);
    if (!quote) return fail("Quotation not found.");
    if (state.workOrders.some((item) => item.quotationId === id)) return fail("A work order uses this quotation.");
    if (quote.status === "Accepted") return fail("An accepted quotation stays on record.");
    state.quotations = state.quotations.filter((item) => item.id !== id);
    return ok("Quotation deleted.", { hash: "#/quotations" });
  }

  function sendQuotation(id) {
    const denied = guard("quote");
    if (denied) return denied;
    const quote = byId(state.quotations, id);
    if (!quote) return fail("Quotation not found.");
    const customer = byId(state.customers, quote.customerId);
    quote.status = quote.status === "Draft" ? "Sent" : quote.status;
    logMail("Quotation", customer.email, "Quotation " + quote.number, "Please find quotation " + quote.number + ", valid until " + quote.validUntil + ".", { quotationId: id });
    return ok("Quotation email prepared.", { hash: "#/mail" });
  }

  function acceptQuotation(id) {
    const denied = guard("quote");
    if (denied) return denied;
    const quote = byId(state.quotations, id);
    if (!quote) return fail("Quotation not found.");
    quote.status = "Accepted";
    state.enquiries.forEach((enquiry) => {
      if (enquiry.quotationId === id) enquiry.status = "Converted";
    });
    return ok("Quotation accepted.");
  }

  function rejectQuotation(id) {
    const denied = guard("quote");
    if (denied) return denied;
    const quote = byId(state.quotations, id);
    if (!quote) return fail("Quotation not found.");
    if (state.workOrders.some((item) => item.quotationId === id)) return fail("A work order already uses this quotation.");
    quote.status = "Rejected";
    return ok("Quotation marked rejected.");
  }

  function convertEnquiry(id) {
    const denied = guard("quote");
    if (denied) return denied;
    const enquiry = byId(state.enquiries, id);
    if (!enquiry || enquiry.status === "Lost") return fail("This confirmation cannot be converted.");
    const lines = [{ family: "Portable monitor", detail: enquiry.summary, qty: 1, ratePaise: state.rates["Portable monitor"] || 0 }];
    const quoteId = nextId("q", "quotation");
    const storedLines = lines[0].ratePaise > 0 ? lines : [{ family: "Portable monitor", detail: enquiry.summary, qty: 1, ratePaise: 0 }];
    if (storedLines[0].ratePaise <= 0) {
      return fail("Set the portable monitor rate in Settings before converting, or create the quotation and type the rate.");
    }
    state.quotations.unshift(Object.assign({
      id: quoteId,
      number: nextNo("QT", "quotation"),
      customerId: enquiry.customerId,
      date: todayIso(),
      validUntil: addDays(todayIso(), Number(state.settings.quotationValidityDays) || 15),
      status: "Draft",
      notes: "From " + enquiry.source.toLowerCase() + " confirmation.",
      lines: storedLines,
    }, quoteTotals(enquiry.customerId, storedLines)));
    enquiry.status = "Converted";
    enquiry.quotationId = quoteId;
    return ok("Quotation created.", { hash: "#/quotations/" + quoteId });
  }

  function workPayload(data) {
    if (!data.woNumber || !data.woDate) return { error: "Type the work order number and date." };
    const instrumentIds = JSON.parse(data.instrumentIds || "[]");
    if (!instrumentIds.length) return { error: "Select at least one instrument." };
    if (!data.customerId) return { error: "Choose a customer." };
    return {
      value: {
        woNumber: data.woNumber.trim(),
        woDate: data.woDate,
        customerId: data.customerId,
        quotationId: data.quotationId || null,
        site: (data.site || (byId(state.customers, data.customerId) || {}).site || "").trim(),
        instrumentIds,
      },
    };
  }

  function addWorkOrder(data) {
    const denied = guard("work");
    if (denied) return denied;
    const parsed = workPayload(data);
    if (parsed.error) return fail(parsed.error);
    const id = nextId("w", "job");
    state.workOrders.unshift(Object.assign({ id, number: nextNo("JOB", "job"), status: "Scheduled" }, parsed.value));
    return ok("Work order opened.", { hash: "#/work-orders/" + id });
  }

  function updateWorkOrder(id, data) {
    const denied = guard("work");
    if (denied) return denied;
    const order = byId(state.workOrders, id);
    if (!order) return fail("Work order not found.");
    if (order.status === "Invoiced" || order.status === "Cancelled") return fail("This work order is closed.");
    const parsed = workPayload(data);
    if (parsed.error) return fail(parsed.error);
    Object.assign(order, parsed.value);
    return ok("Work order updated.", { hash: "#/work-orders/" + id });
  }

  function deleteWorkOrder(id) {
    const denied = guard("work");
    if (denied) return denied;
    if (state.certificates.some((item) => item.workOrderId === id && item.status === "Issued")) return fail("Issued certificates are linked to this work order.");
    if (state.invoices.some((item) => item.workOrderId === id && item.status !== "Cancelled")) return fail("An invoice is linked to this work order.");
    state.visits.filter((item) => item.workOrderId === id).forEach((visit) => {
      state.requisitions = state.requisitions.filter((item) => item.visitId !== visit.id);
    });
    state.visits = state.visits.filter((item) => item.workOrderId !== id);
    state.certificates = state.certificates.filter((item) => item.workOrderId !== id || item.status === "Issued");
    state.workOrders = state.workOrders.filter((item) => item.id !== id);
    return ok("Work order deleted.", { hash: "#/work-orders" });
  }

  function addVisit(data) {
    const denied = guard("visit");
    if (denied) return denied;
    const order = byId(state.workOrders, data.workOrderId);
    if (!order) return fail("Choose a work order.");
    if (!data.date || !data.engineerId || !data.jobType || !(data.location || "").trim()) return fail("Date, engineer, job type, and location are required.");
    const id = nextId("v", "visit");
    state.visits.unshift({
      id,
      workOrderId: order.id,
      date: data.date,
      time: data.time || "09:00",
      engineerId: data.engineerId,
      jobType: data.jobType,
      location: data.location.trim(),
      contact: (data.contact || "").trim(),
      transport: "",
      travelPaise: 0,
      otherPaise: 0,
      notes: "",
      packStatus: "Empty",
      overrideReason: "",
    });
    return ok("Visit scheduled.", { hash: "#/visits/" + id });
  }

  function updateVisit(id, data) {
    const denied = guard("visit");
    if (denied) return denied;
    const visit = byId(state.visits, id);
    if (!visit) return fail("Visit not found.");
    if (state.requisitions.some((item) => item.visitId === id && item.status === "Released")) return fail("Funds are already released for this visit.");
    if (!data.date || !data.engineerId || !data.jobType || !(data.location || "").trim()) return fail("Date, engineer, job type, and location are required.");
    visit.date = data.date;
    visit.time = data.time || visit.time;
    visit.engineerId = data.engineerId;
    visit.jobType = data.jobType;
    visit.location = data.location.trim();
    visit.contact = (data.contact || "").trim();
    return ok("Visit updated.", { hash: "#/visits/" + id });
  }

  function deleteVisit(id) {
    const denied = guard("visit");
    if (denied) return denied;
    if (state.requisitions.some((item) => item.visitId === id && item.status === "Released")) return fail("Released funds keep this visit on record.");
    state.requisitions = state.requisitions.filter((item) => item.visitId !== id);
    state.visits = state.visits.filter((item) => item.id !== id);
    return ok("Visit deleted.", { hash: "#/visits" });
  }

  function saveVisitPack(data) {
    const denied = guard("visitPack");
    if (denied) return denied;
    const visit = byId(state.visits, data.id);
    if (!visit) return fail("Visit not found.");
    const ahead = diffDays(todayIso(), visit.date);
    if (ahead > 5) return fail("The pack opens on " + addDays(visit.date, -5) + ", five days before the visit.");
    if (ahead < 3) {
      const reason = (data.overrideReason || visit.overrideReason || "").trim();
      if (!reason) return fail("This visit is inside 3 days. Enter an override reason. A planner or administrator must submit it.");
      if (user().role === "engineer") return fail("Only a planner or administrator can override a visit inside 3 days.");
      visit.overrideReason = reason;
    }
    visit.time = data.time || visit.time;
    visit.jobType = data.jobType || visit.jobType;
    visit.location = data.location || visit.location;
    visit.contact = data.contact || visit.contact;
    visit.transport = data.transport || "";
    visit.travelPaise = Math.round((Number(data.travel) || 0) * 100);
    visit.otherPaise = Math.round((Number(data.other) || 0) * 100);
    visit.notes = data.notes || "";
    if (data.submit !== "yes") {
      if (visit.packStatus !== "Submitted") visit.packStatus = "Saved";
      return ok("Visit pack saved.");
    }
    if (state.requisitions.some((item) => item.visitId === visit.id && item.status === "Submitted")) return fail("This request is already waiting for approval.");
    visit.packStatus = "Submitted";
    const amount = visit.travelPaise + visit.otherPaise;
    if (amount === 0 && visit.jobType === "Workshop calibration") return ok("Workshop visit saved. No fund request was needed.");
    const id = nextId("r", "requisition");
    const number = nextNo("FR", "requisition");
    state.requisitions.unshift({
      id,
      number,
      visitId: visit.id,
      amountPaise: amount,
      status: "Submitted",
      events: [{ at: new Date().toISOString(), by: user().id, text: "Submitted for " + rupees(amount) + "." }],
    });
    logMail("Visit pack", state.company.plannerEmail, "Fund request " + number, "Job type: " + visit.jobType + "\nLocation: " + visit.location + "\nDate: " + visit.date + "\nEngineer: " + person(visit.engineerId) + "\nAmount: " + rupees(amount), { requisitionId: id });
    return ok("Planner email prepared and the fund request is open.", { hash: "#/requisitions/" + id });
  }

  function decideRequisition(data) {
    const denied = guard("fund");
    if (denied) return denied;
    const requisition = byId(state.requisitions, data.id);
    if (!requisition || requisition.status !== "Submitted") return fail("Only a submitted request can be decided.");
    const visit = byId(state.visits, requisition.visitId);
    if (!visit) return fail("Visit not found.");
    if (user().id === visit.engineerId) return fail("You cannot approve your own visit fund.");
    if (data.decision === "reject") {
      if (!(data.note || "").trim()) return fail("Enter the reason for rejection.");
      requisition.status = "Rejected";
      visit.packStatus = "Saved";
      requisition.events.push({ at: new Date().toISOString(), by: user().id, text: "Rejected. " + data.note.trim() });
      const engineer = byId(state.users, visit.engineerId);
      logMail("Fund decision", engineer ? engineer.email : state.company.email, requisition.number + " rejected", data.note.trim(), { requisitionId: requisition.id });
      return ok("Request rejected.");
    }
    const amount = Math.round((Number(data.amount) || 0) * 100);
    if (amount < 0) return fail("Amount cannot be negative.");
    requisition.amountPaise = amount;
    requisition.status = "Released";
    requisition.events.push({ at: new Date().toISOString(), by: user().id, text: "Approved and released " + rupees(amount) + "." });
    logMail("Fund decision", state.company.plannerEmail, requisition.number + " released", "Funds of " + rupees(amount) + " are released for the visit on " + visit.date + ".", { requisitionId: requisition.id });
    return ok("Funds released.");
  }

  function deleteRequisition(id) {
    const denied = guard("fund");
    if (denied) return denied;
    const requisition = byId(state.requisitions, id);
    if (!requisition) return fail("Request not found.");
    if (requisition.status === "Released") return fail("Released funds stay on record.");
    const visit = byId(state.visits, requisition.visitId);
    if (visit && visit.packStatus === "Submitted") visit.packStatus = "Saved";
    state.requisitions = state.requisitions.filter((item) => item.id !== id);
    return ok("Fund request deleted.", { hash: "#/requisitions" });
  }

  function certificateInput(data) {
    const interval = Number(data.interval);
    const cylinder = byId(state.cylinders, data.cylinderId);
    const selected = JSON.parse(data.gases || "[]");
    const found = JSON.parse(data.asFound || "[]");
    const left = JSON.parse(data.asLeft || "[]");
    const gases = (cylinder ? cylinder.gases : []).map((gas, index) => ({
      gas: gas.gas,
      concentration: gas.concentration,
      unit: gas.unit,
      asFound: found[index] || "",
      asLeft: left[index] || "",
      keep: selected[index] !== false,
    })).filter((gas) => gas.keep);
    return {
      family: data.family,
      customerId: data.customerId,
      instrumentId: data.instrumentId || "",
      workOrderId: data.workOrderId || "",
      woNumber: (data.woNumber || "").trim(),
      woDate: data.woDate || "",
      serial: (data.serial || "").trim(),
      calibrationDate: data.calibrationDate || "",
      interval,
      dueDate: data.calibrationDate && [3, 4, 6].includes(interval) ? addMonths(data.calibrationDate, interval) : "",
      cylinder,
      gases,
      engineerId: data.engineerId,
      notes: (data.notes || "").trim(),
      draftId: data.draftId || "",
      revisionOf: data.revisionOf || "",
    };
  }

  function validateCertificate(input, issue) {
    if (!FAMILIES.includes(input.family)) return "Choose portable, fixed, or area monitor.";
    if (!input.calibrationDate) return "Enter the calibration date.";
    if (![3, 4, 6].includes(input.interval)) return "Choose a 3, 4, or 6 month interval.";
    if (!input.serial) return "Enter the serial number.";
    if (!input.woNumber || !input.woDate) return "Enter the work order number and date.";
    if (!input.cylinder) return "Choose a cylinder.";
    if (["Empty", "Quarantined", "Expired"].includes(input.cylinder.status)) return "That cylinder cannot be used.";
    if (input.cylinder.expiry < input.calibrationDate) return "This cylinder expired on " + input.cylinder.expiry + ".";
    if (!input.gases.length) return "Keep at least one gas required for this job.";
    const engineer = byId(state.users, input.engineerId);
    const hasDsc = engineer && engineer.signatureType === "dsc" && engineer.dscSerial;
    if (!engineer || (!engineer.signature && !hasDsc)) return "The engineer needs a signature image or a DSC. Add one in Settings, Users.";
    if (issue && input.gases.some((gas) => gas.asLeft === "")) return "Enter the as-left reading for each gas used.";
    const customer = byId(state.customers, input.customerId);
    if (!customer) return "Choose a customer.";
    if (issue && !customer.email) return "The customer needs an email address.";
    return "";
  }

  function priceFor(family, workOrderId) {
    const order = workOrderId ? byId(state.workOrders, workOrderId) : null;
    const quote = order && order.quotationId ? byId(state.quotations, order.quotationId) : null;
    const line = quote && quote.lines.find((item) => item.family === family);
    if (line && line.ratePaise > 0) return line.ratePaise;
    return state.rates[family] || 0;
  }

  function saveCertificate(data) {
    const denied = guard("certificate");
    if (denied) return denied;
    const input = certificateInput(data);
    if (input.workOrderId) {
      const linked = byId(state.workOrders, input.workOrderId);
      if (linked) {
        input.customerId = linked.customerId;
        const match = linked.instrumentIds.map((id) => byId(state.instruments, id)).find((item) => item && item.serial.toLowerCase() === input.serial.toLowerCase());
        if (match) input.instrumentId = match.id;
      }
    }
    const issue = data.issue === "yes";
    const error = validateCertificate(input, issue);
    if (error) return fail(error);
    if (issue && priceFor(input.family, input.workOrderId) <= 0) return fail("Set a rate for " + input.family + " in Settings, or on the accepted quotation, before issuing.");
    let certificate = input.draftId ? byId(state.certificates, input.draftId) : null;
    if (certificate && certificate.status === "Issued") return fail("Issued certificates stay as issued. Use Revise.");
    if (!certificate) {
      certificate = { id: nextId("cert", "certificate"), number: "", status: "Draft", revisionOf: input.revisionOf || "" };
      state.certificates.unshift(certificate);
    }
    Object.assign(certificate, {
      family: input.family,
      customerId: input.customerId,
      instrumentId: input.instrumentId || "",
      workOrderId: input.workOrderId,
      woNumber: input.woNumber,
      woDate: input.woDate,
      serial: input.serial,
      calibrationDate: input.calibrationDate,
      interval: input.interval,
      dueDate: input.dueDate,
      cylinderId: input.cylinder.id,
      cylinderNumber: input.cylinder.number,
      gasCertNo: input.cylinder.gasCertNo,
      engineerId: input.engineerId,
      notes: input.notes,
      gases: input.gases.map((gas) => ({ gas: gas.gas, concentration: gas.concentration, unit: gas.unit, asFound: gas.asFound, asLeft: gas.asLeft })),
    });
    if (!issue) {
      certificate.status = "Draft";
      return ok("Draft saved.", { hash: "#/certificates/" + certificate.id });
    }
    certificate.status = "Issued";
    certificate.number = input.revisionOf && byId(state.certificates, input.revisionOf)
      ? byId(state.certificates, input.revisionOf).number + "-R1"
      : nextNo("CAL", "certificate");
    if (input.revisionOf) {
      const previous = byId(state.certificates, input.revisionOf);
      if (previous) previous.status = "Superseded";
    }
    if (input.instrumentId) {
      const instrument = byId(state.instruments, input.instrumentId);
      if (instrument) {
        instrument.serial = input.serial;
        instrument.lastCalibration = input.calibrationDate;
        instrument.due = input.dueDate;
        instrument.interval = input.interval;
        instrument.family = input.family;
      }
    }
    if (input.cylinder.status === "In stock") {
      input.cylinder.status = "Issued";
      input.cylinder.workOrderId = input.workOrderId || "";
    }
    const invoice = ensureInvoice(certificate);
    const order = input.workOrderId ? byId(state.workOrders, input.workOrderId) : null;
    if (order) {
      const done = order.instrumentIds.every((instrumentId) => state.certificates.some((item) => item.workOrderId === order.id && item.instrumentId === instrumentId && item.status === "Issued"));
      order.status = done ? "Invoiced" : "Calibrated";
    }
    const customer = byId(state.customers, certificate.customerId);
    logMail("Certificate and invoice", customer.email, "Certificate " + certificate.number + " and invoice " + invoice.number, "Certificate " + certificate.number + " for serial " + certificate.serial + " is due on " + certificate.dueDate + ".\nInvoice " + invoice.number + " total " + rupees(invoice.totalPaise) + ".", { certificateId: certificate.id, invoiceId: invoice.id });
    return ok("Certificate issued. The customer email is in the mail log.", { hash: "#/certificates/" + certificate.id });
  }

  function ensureInvoice(certificate) {
    const existing = state.invoices.find((invoice) => invoice.certificateId === certificate.id && invoice.status !== "Cancelled");
    if (existing) return existing;
    const rate = priceFor(certificate.family, certificate.workOrderId);
    const lines = [{ detail: certificate.family + " calibration, serial " + certificate.serial, family: certificate.family, qty: 1, ratePaise: rate }];
    const order = certificate.workOrderId ? byId(state.workOrders, certificate.workOrderId) : null;
    const quote = order && order.quotationId ? byId(state.quotations, order.quotationId) : null;
    const already = state.invoices.some((invoice) => invoice.workOrderId === certificate.workOrderId && invoice.status !== "Cancelled");
    if (quote && certificate.workOrderId && !already) {
      quote.lines.filter((line) => line.family === "Site visit").forEach((line) => lines.push({ detail: line.detail || "Site visit", family: line.family, qty: line.qty, ratePaise: line.ratePaise }));
    }
    const taxablePaise = lines.reduce((sum, line) => sum + line.qty * line.ratePaise, 0);
    const tax = taxOf(certificate.customerId, taxablePaise);
    const invoice = {
      id: nextId("inv", "invoice"),
      number: nextNo("INV", "invoice"),
      date: todayIso(),
      due: addDays(todayIso(), Number(state.settings.creditDays) || 30),
      customerId: certificate.customerId,
      workOrderId: certificate.workOrderId || "",
      certificateId: certificate.id,
      status: "Issued",
      remindersStopped: false,
      irn: "",
      notes: "",
      lines,
      taxablePaise,
      cgstPaise: tax.cgstPaise,
      sgstPaise: tax.sgstPaise,
      igstPaise: tax.igstPaise,
      totalPaise: taxablePaise + tax.taxPaise,
      paidPaise: 0,
    };
    state.invoices.unshift(invoice);
    return invoice;
  }

  function deleteCertificate(id) {
    const denied = guard("certificate");
    if (denied) return denied;
    const certificate = byId(state.certificates, id);
    if (!certificate) return fail("Certificate not found.");
    if (certificate.status === "Issued") return fail("An issued certificate is kept. Create a revision if the result changed.");
    state.certificates = state.certificates.filter((item) => item.id !== id);
    return ok("Draft deleted.", { hash: "#/certificates" });
  }

  function reviseCertificate(id) {
    const denied = guard("certificate");
    if (denied) return denied;
    const certificate = byId(state.certificates, id);
    if (!certificate || certificate.status !== "Issued") return fail("Only an issued certificate can be revised.");
    return ok("", { hash: "#/certificates/new?revise=" + id });
  }

  function balanceOf(invoice) {
    return invoice.totalPaise - invoice.paidPaise;
  }

  function refreshInvoice(invoice) {
    if (invoice.status === "Cancelled") return;
    if (invoice.paidPaise <= 0) invoice.status = "Issued";
    else if (invoice.paidPaise < invoice.totalPaise) invoice.status = "Partly paid";
    else invoice.status = "Paid";
  }

  function recordPayment(data) {
    const denied = guard("payment");
    if (denied) return denied;
    const invoice = byId(state.invoices, data.id);
    if (!invoice || invoice.status === "Cancelled") return fail("Invoice not found.");
    const amount = Math.round((Number(data.amount) || 0) * 100);
    if (amount <= 0) return fail("Enter the amount received.");
    if (amount > balanceOf(invoice)) return fail("That is more than the balance.");
    state.receipts.unshift({ id: nextId("rc", "receipt"), invoiceId: invoice.id, date: data.date || todayIso(), amountPaise: amount, mode: data.mode || "Bank", reference: (data.reference || "").trim() });
    invoice.paidPaise += amount;
    refreshInvoice(invoice);
    return ok(invoice.status === "Paid" ? "Invoice paid. Reminders stop." : "Receipt saved.");
  }

  function updateInvoice(id, data) {
    const denied = guard("invoice");
    if (denied) return denied;
    const invoice = byId(state.invoices, id);
    if (!invoice) return fail("Invoice not found.");
    invoice.irn = (data.irn || "").trim();
    invoice.notes = (data.notes || "").trim();
    invoice.remindersStopped = data.remindersStopped === "yes";
    return ok("Invoice updated.", { hash: "#/invoices/" + id });
  }

  function deleteInvoice(id) {
    const denied = guard("invoice");
    if (denied) return denied;
    const invoice = byId(state.invoices, id);
    if (!invoice) return fail("Invoice not found.");
    if (invoice.paidPaise > 0) return fail("This invoice has receipts. It stays on record.");
    const period = invoice.date.slice(0, 7);
    if (state.gst[period] && state.gst[period].status === "Filed") return fail("This invoice is in a filed GSTR-1 period.");
    state.invoices = state.invoices.filter((item) => item.id !== id);
    return ok("Invoice deleted.", { hash: "#/invoices" });
  }

  function deleteReceipt(id) {
    const denied = guard("payment");
    if (denied) return denied;
    const receipt = byId(state.receipts, id);
    if (!receipt) return fail("Receipt not found.");
    const invoice = byId(state.invoices, receipt.invoiceId);
    state.receipts = state.receipts.filter((item) => item.id !== id);
    if (invoice) {
      invoice.paidPaise = Math.max(0, invoice.paidPaise - receipt.amountPaise);
      refreshInvoice(invoice);
    }
    return ok("Receipt deleted.");
  }

  function cylinderPayload(data) {
    const number = (data.number || "").trim();
    if (!number) return { error: "Cylinder number is required." };
    if (state.cylinders.some((item) => item.id !== data.id && item.number.toLowerCase() === number.toLowerCase())) return { error: "That cylinder number already exists." };
    if (!data.expiry) return { error: "Expiry date is required." };
    const gases = JSON.parse(data.gases || "[]").map((gas) => ({ gas: (gas.gas || "").trim(), concentration: (gas.concentration || "").trim(), unit: gas.unit || "ppm" })).filter((gas) => gas.gas && gas.concentration);
    if (!gases.length) return { error: "Enter at least one certified gas and concentration." };
    return { value: { number, kind: gases.length > 1 ? "Multi gas" : "Single gas", gases, supplier: (data.supplier || "").trim(), gasCertNo: (data.gasCertNo || "").trim(), expiry: data.expiry } };
  }

  function addCylinder(data) {
    const denied = guard("stock");
    if (denied) return denied;
    const parsed = cylinderPayload(data);
    if (parsed.error) return fail(parsed.error);
    const id = nextId("cyl", "cylinder");
    state.cylinders.unshift(Object.assign({ id, location: "Store", status: "In stock", workOrderId: "" }, parsed.value));
    return ok("Cylinder saved.", { hash: "#/cylinders/" + id });
  }

  function updateCylinder(id, data) {
    const denied = guard("stock");
    if (denied) return denied;
    const cylinder = byId(state.cylinders, id);
    if (!cylinder) return fail("Cylinder not found.");
    if (state.certificates.some((item) => item.cylinderId === id && item.status === "Issued")) return fail("An issued certificate uses this cylinder. Add a new cylinder record instead of changing the certified values.");
    const parsed = cylinderPayload(Object.assign({}, data, { id }));
    if (parsed.error) return fail(parsed.error);
    Object.assign(cylinder, parsed.value);
    return ok("Cylinder updated.", { hash: "#/cylinders/" + id });
  }

  function deleteCylinder(id) {
    const denied = guard("stock");
    if (denied) return denied;
    if (state.certificates.some((item) => item.cylinderId === id)) return fail("A certificate uses this cylinder.");
    state.cylinders = state.cylinders.filter((item) => item.id !== id);
    return ok("Cylinder deleted.", { hash: "#/stock" });
  }

  function setCylinderStatus(id, status) {
    const denied = guard("stock");
    if (denied) return denied;
    const cylinder = byId(state.cylinders, id);
    if (!cylinder) return fail("Cylinder not found.");
    if (!["In stock", "Empty", "Quarantined", "Expired"].includes(status)) return fail("Unknown status.");
    cylinder.status = status;
    if (status === "In stock") {
      cylinder.workOrderId = "";
      cylinder.location = "Store";
    }
    return ok("Cylinder updated.");
  }

  function addSpare(data) {
    const denied = guard("stock");
    if (denied) return denied;
    const name = (data.name || "").trim();
    const code = (data.code || "").trim();
    if (!name || !code) return fail("Code and name are required.");
    const id = nextId("s", "spare");
    state.spares.unshift({ id, code, name, kind: ["Sensor", "Spare part", "Consumable"].includes(data.kind) ? data.kind : "Spare part", qty: Math.max(0, Number(data.qty) || 0), reorder: Math.max(0, Number(data.reorder) || 0) });
    return ok("Item saved.", { hash: "#/spares/" + id });
  }

  function updateSpare(id, data) {
    const denied = guard("stock");
    if (denied) return denied;
    const spare = byId(state.spares, id);
    if (!spare) return fail("Item not found.");
    if (!(data.name || "").trim() || !(data.code || "").trim()) return fail("Code and name are required.");
    spare.code = data.code.trim();
    spare.name = data.name.trim();
    if (["Sensor", "Spare part", "Consumable"].includes(data.kind)) spare.kind = data.kind;
    spare.reorder = Math.max(0, Number(data.reorder) || 0);
    return ok("Item updated.", { hash: "#/spares/" + id });
  }

  function deleteSpare(id) {
    const denied = guard("stock");
    if (denied) return denied;
    state.spares = state.spares.filter((item) => item.id !== id);
    return ok("Item deleted.", { hash: "#/stock" });
  }

  function moveSpare(data) {
    const denied = guard("stock");
    if (denied) return denied;
    const spare = byId(state.spares, data.id);
    if (!spare) return fail("Item not found.");
    const qty = Math.abs(Number(data.qty) || 0);
    if (!qty) return fail("Enter a quantity.");
    if (data.direction === "out" && qty > spare.qty) return fail("Not enough stock.");
    spare.qty += data.direction === "out" ? -qty : qty;
    return ok(spare.name + " now has " + spare.qty + " on hand.");
  }

  function updateMail(id, data) {
    const mail = byId(state.mails, id);
    if (!mail) return fail("Message not found.");
    if (!user()) return fail("Sign in to continue.");
    if (!(data.to || "").trim() || !(data.subject || "").trim()) return fail("Recipient and subject are required.");
    mail.to = data.to.trim();
    mail.subject = data.subject.trim();
    mail.body = data.body || "";
    return ok("Message updated.", { hash: "#/mail/" + id });
  }

  function deleteMail(id) {
    if (!user()) return fail("Sign in to continue.");
    state.mails = state.mails.filter((item) => item.id !== id);
    return ok("Message deleted.", { hash: "#/mail" });
  }

  function markMailOpened(id) {
    const mail = byId(state.mails, id);
    if (!mail) return fail("Message not found.");
    mail.status = "Opened in mail app";
    save();
    return { ok: true, message: "", mail };
  }

  function customerForMail(mail) {
    if (!mail) return null;
    const links = mail.links || {};
    let id = "";
    if (links.invoiceId) id = (byId(state.invoices, links.invoiceId) || {}).customerId;
    else if (links.enquiryId) id = (byId(state.enquiries, links.enquiryId) || {}).customerId;
    else if (links.instrumentId) id = (byId(state.instruments, links.instrumentId) || {}).customerId;
    else if (links.certificateId) id = (byId(state.certificates, links.certificateId) || {}).customerId;
    else if (links.quotationId) id = (byId(state.quotations, links.quotationId) || {}).customerId;
    return byId(state.customers, id) || state.customers.find((item) => item.email && item.email.toLowerCase() === String(mail.to || "").toLowerCase()) || null;
  }

  function whatsappLink(id) {
    const mail = byId(state.mails, id);
    if (!mail) return { ok: false, error: "Message not found." };
    if (!state.settings.whatsapp) return { ok: false, error: "WhatsApp reminders are switched off in Settings, Compliance." };
    const customer = customerForMail(mail);
    let digits = String((customer && customer.phone) || "").replace(/\D/g, "");
    if (digits.length === 11 && digits[0] === "0") digits = digits.slice(1);
    if (digits.length === 10) digits = "91" + digits;
    if (digits.length < 11) return { ok: false, error: "This customer has no mobile number on record. Add one on the customer page." };
    mail.status = "Opened in WhatsApp";
    save();
    return { ok: true, message: "", url: "https://wa.me/" + digits + "?text=" + encodeURIComponent(mail.subject + "\n\n" + mail.body) };
  }

  const GSTIN_FORMAT = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

  function gstChecks(period) {
    const issues = [];
    const firm = state.company || {};
    const sac = String(state.settings.sac || "");
    const add = (level, invoice, text) => issues.push({ level, invoiceId: invoice ? invoice.id : "", number: invoice ? invoice.number : "Settings", text });
    if (!/^99\d{4}(\d{2})?$/.test(sac)) add("error", null, "SAC " + (sac || "(empty)") + " is not a valid services code. Use 6 or 8 digits starting with 99, for example 998346.");
    if (firm.gstin && !GSTIN_FORMAT.test(firm.gstin)) add("error", null, "Your company GSTIN " + firm.gstin + " does not match the GSTIN pattern.");
    if (state.settings.turnover5cr && !state.settings.eInvoice) add("warn", null, "Turnover is marked above ₹5 crore but e-invoice is off. Invoices then need an IRN. Check Settings, Tax.");
    gstrRows(period).forEach((invoice) => {
      const customer = byId(state.customers, invoice.customerId);
      if (!customer) { add("error", invoice, "Customer record is missing."); return; }
      if (!customer.gstin) add("warn", invoice, customer.tradeName + " has no GSTIN, so this goes to GSTR-1 as B2C. Add the GSTIN if it is a registered business.");
      else {
        if (!GSTIN_FORMAT.test(customer.gstin)) add("error", invoice, customer.tradeName + " GSTIN " + customer.gstin + " does not match the GSTIN pattern.");
        if (customer.stateCode && customer.gstin.slice(0, 2) !== customer.stateCode) add("error", invoice, customer.tradeName + " GSTIN starts with " + customer.gstin.slice(0, 2) + " but the state code on file is " + customer.stateCode + ".");
      }
      const intra = customer.stateCode && firm.stateCode && customer.stateCode === firm.stateCode;
      if (customer.stateCode && firm.stateCode) {
        if (intra && invoice.igstPaise) add("error", invoice, "Same-state supply must carry CGST and SGST, not IGST.");
        if (!intra && (invoice.cgstPaise || invoice.sgstPaise)) add("error", invoice, "Inter-state supply must carry IGST, not CGST and SGST.");
      }
      const tax = (invoice.cgstPaise || 0) + (invoice.sgstPaise || 0) + (invoice.igstPaise || 0);
      const expected = Math.round(invoice.taxablePaise * Number(state.settings.gstRate) / 100);
      if (Math.abs(tax - expected) > 100) add("error", invoice, "Tax " + rupees(tax) + " does not match " + state.settings.gstRate + "% of the taxable value (" + rupees(expected) + ").");
      if (state.settings.eInvoice && !invoice.irn) add("warn", invoice, "E-invoice is on but no IRN is recorded yet.");
    });
    const periods = gstrPeriods().slice().sort();
    const before = periods.filter((item) => item < period && !(state.gst[item] && state.gst[item].status === "Filed"));
    if (before.length) add("warn", null, "Earlier period " + before.join(", ") + " is not recorded as filed. The portal blocks GSTR-1 while an earlier GSTR-3B is pending.");
    return issues;
  }

  function gstTrack() {
    const today = todayIso();
    const own = gstrPeriods().slice().sort().reverse().map((period) => {
      const rows = gstrRows(period);
      const filing = state.gst[period] || {};
      const taxable = rows.reduce((sum, item) => sum + item.taxablePaise, 0);
      const tax = rows.reduce((sum, item) => sum + (item.cgstPaise || 0) + (item.sgstPaise || 0) + (item.igstPaise || 0), 0);
      return { period, count: rows.length, taxable, tax, status: filing.status === "Filed" ? "Filed" : "Not filed", arn: filing.arn || "", filedAt: filing.filedAt || "", issues: gstChecks(period).filter((item) => item.level === "error").length };
    });
    const customers = state.customers.filter((item) => item.gstin).map((item) => ({
      id: item.id, name: item.tradeName, gstin: item.gstin, gstr1: item.gstr1 || "", gstr3b: item.gstr3b || "", checked: item.gstChecked || "",
      stale: !item.gstChecked || diffDays(item.gstChecked, today) > 30,
      risk: /not|miss|late|default/i.test((item.gstr1 || "") + " " + (item.gstr3b || "")),
    }));
    return { own, customers };
  }

  function tallyXml(period) {
    const firm = state.company || {};
    const invoices = period === "all" ? state.invoices.filter((item) => item.status !== "Cancelled") : gstrRows(period);
    const x = (value) => String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const amt = (paise) => (paise / 100).toFixed(2);
    const ledger = (name, paise, debit) => "<ALLLEDGERENTRIES.LIST><LEDGERNAME>" + x(name) + "</LEDGERNAME><ISDEEMEDPOSITIVE>" + (debit ? "Yes" : "No") + "</ISDEEMEDPOSITIVE><AMOUNT>" + (debit ? "-" : "") + amt(paise) + "</AMOUNT></ALLLEDGERENTRIES.LIST>";
    const vouchers = invoices.map((invoice) => {
      const customer = byId(state.customers, invoice.customerId) || {};
      const lines = [ledger(customer.legalName || "Customer", invoice.totalPaise, true), ledger("Calibration Services (SAC " + state.settings.sac + ")", invoice.taxablePaise, false)];
      if (invoice.cgstPaise) lines.push(ledger("Output CGST", invoice.cgstPaise, false));
      if (invoice.sgstPaise) lines.push(ledger("Output SGST", invoice.sgstPaise, false));
      if (invoice.igstPaise) lines.push(ledger("Output IGST", invoice.igstPaise, false));
      return '<TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHER VCHTYPE="Sales" ACTION="Create"><DATE>' + invoice.date.replace(/-/g, "") + "</DATE><VOUCHERTYPENAME>Sales</VOUCHERTYPENAME><VOUCHERNUMBER>" + x(invoice.number) + "</VOUCHERNUMBER><PARTYLEDGERNAME>" + x(customer.legalName || "Customer") + "</PARTYLEDGERNAME><PARTYGSTIN>" + x(customer.gstin || "") + "</PARTYGSTIN><NARRATION>" + x(invoice.notes || "Calibration services") + "</NARRATION>" + lines.join("") + "</VOUCHER></TALLYMESSAGE>";
    }).join("");
    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME><STATICVARIABLES><SVCURRENTCOMPANY>' + x(firm.legalName) + "</SVCURRENTCOMPANY></STATICVARIABLES></REQUESTDESC><REQUESTDATA>" + vouchers + "</REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>\n";
    return { count: invoices.length, xml };
  }

  function recordGstFiling(data) {
    const denied = guard("gst");
    if (denied) return denied;
    const period = data.period;
    if (!/^\d{4}-\d{2}$/.test(period || "")) return fail("Choose a return period.");
    const arn = (data.arn || "").trim();
    if (arn.length < 8) return fail("Enter the ARN from the GST portal after you file.");
    if (!gstrRows(period).length) return fail("This period has no invoices.");
    state.gst[period] = { status: "Filed", arn, filedAt: data.filedAt || todayIso() };
    return ok("Filing recorded with ARN " + arn + ".");
  }

  function gstrRows(period) {
    return state.invoices.filter((invoice) => invoice.date.slice(0, 7) === period && invoice.status !== "Cancelled");
  }

  function gstrPeriods() {
    const set = new Set(state.invoices.filter((invoice) => invoice.status !== "Cancelled").map((invoice) => invoice.date.slice(0, 7)));
    return [...set].sort().reverse();
  }

  function saveSettings(data) {
    if (!user() || user().role !== "admin") return fail("Only an administrator can change company settings.");
    const section = data.section || "company";
    if (section === "company") {
      state.company.legalName = (data.legalName || state.company.legalName).trim();
      state.company.name = (data.tradeName || state.company.legalName).trim();
      const gst = cleanGstin(data.gstin);
      if (gst.error) return fail(gst.error);
      state.company.gstin = gst.gstin;
      state.company.stateCode = gst.gstin ? gst.gstin.slice(0, 2) : (data.stateCode || state.company.stateCode);
      state.company.state = (data.state || "").trim();
      state.company.address = (data.address || "").trim();
      state.company.phone = (data.phone || "").trim();
      state.company.email = (data.email || "").trim();
      state.company.plannerEmail = (data.plannerEmail || state.company.email).trim();
      state.company.bank = (data.bank || "").trim();
      state.company.signatory = (data.signatory || "").trim();
    } else if (section === "tax") {
      state.settings.sac = (data.sac || "998346").trim();
      state.settings.gstRate = Number(data.gstRate) || 0;
      state.settings.eInvoice = data.eInvoice === "yes";
    } else if (section === "compliance") {
      state.settings.nabl = data.nabl === "yes";
      state.settings.nablNo = (data.nablNo || "").trim();
      if (state.settings.nabl && !state.settings.nablNo) return fail("Enter the NABL accreditation number, or choose No.");
      state.settings.turnover5cr = data.turnover5cr === "yes";
      state.settings.whatsapp = data.whatsapp !== "no";
    } else if (section === "rates") {
      FAMILIES.concat(["Site visit"]).forEach((family) => {
        const key = "rate_" + family;
        if (data[key] != null && data[key] !== "") state.rates[family] = Math.round(Number(data[key]) * 100);
      });
    } else if (section === "reminders") {
      state.settings.creditDays = Number(data.creditDays) || 0;
      state.settings.paymentEveryDays = Number(data.paymentEveryDays) || 7;
      state.settings.chaseEveryDays = Number(data.chaseEveryDays) || 3;
      state.settings.dueLeadDays = Number(data.dueLeadDays) || 15;
      state.settings.quotationValidityDays = Number(data.quotationValidityDays) || 15;
    } else {
      return fail("Choose a settings section.");
    }
    return ok("Settings saved.", { hash: "#/settings?section=" + section });
  }

  async function addUser(data) {
    if (!user() || user().role !== "admin") return fail("Only an administrator can add users.");
    const email = (data.email || "").trim().toLowerCase();
    const name = (data.name || "").trim();
    if (!name || !email) return fail("Name and email are required.");
    if (state.users.some((item) => item.email === email)) return fail("That email is already a user.");
    if (!PERMS[data.role]) return fail("Choose a role.");
    if ((data.password || "").length < 8) return fail("Use a password of at least 8 characters.");
    const salt = makeSalt();
    const id = nextId("u", "user");
    state.users.push({ id, name, role: data.role, title: (data.title || data.role).trim(), email, salt, passwordHash: await digest(data.password, salt), signature: data.signature || "", signatureType: data.signatureType === "dsc" ? "dsc" : "image", dscSerial: (data.dscSerial || "").trim(), dscValid: data.dscValid || "" });
    save();
    return ok("User added.", { hash: "#/settings?section=users" });
  }

  async function updateUser(id, data) {
    const current = user();
    if (!current) return fail("Sign in to continue.");
    const account = byId(state.users, id);
    if (!account) return fail("User not found.");
    if (current.role !== "admin" && current.id !== id) return fail("You can edit only your own signature.");
    if (current.role === "admin") {
      account.name = (data.name || account.name).trim();
      account.title = (data.title || account.title).trim();
      if (PERMS[data.role] && account.role === "admin" && data.role !== "admin" && state.users.filter((item) => item.role === "admin").length === 1) return fail("Keep at least one administrator.");
      if (PERMS[data.role]) account.role = data.role;
      const email = (data.email || account.email).trim().toLowerCase();
      if (state.users.some((item) => item.email === email && item.id !== id)) return fail("That email is already a user.");
      account.email = email;
    }
    if (data.signature) account.signature = data.signature;
    if (data.signatureType) {
      account.signatureType = data.signatureType === "dsc" ? "dsc" : "image";
      account.dscSerial = (data.dscSerial || "").trim();
      account.dscValid = data.dscValid || "";
      if (account.signatureType === "dsc" && !account.dscSerial) return fail("Enter the DSC serial number, or choose scanned image.");
    }
    if (data.password) {
      if (data.password.length < 8) return fail("Use a password of at least 8 characters.");
      account.salt = makeSalt();
      account.passwordHash = await digest(data.password, account.salt);
    }
    save();
    return ok("User updated.");
  }

  function deleteUser(id) {
    if (!user() || user().role !== "admin") return fail("Only an administrator can remove users.");
    const account = byId(state.users, id);
    if (!account) return fail("User not found.");
    if (account.id === user().id) return fail("You cannot remove the account you are using.");
    if (account.role === "admin" && state.users.filter((item) => item.role === "admin").length === 1) return fail("Keep at least one administrator.");
    if (state.certificates.some((item) => item.engineerId === id && item.status === "Issued")) return fail("This person signed issued certificates.");
    state.users = state.users.filter((item) => item.id !== id);
    return ok("User removed.");
  }

  function openWorkForInstrument(instrumentId) {
    return state.workOrders.find((order) => !["Invoiced", "Closed", "Cancelled"].includes(order.status) && order.instrumentIds.includes(instrumentId)) || null;
  }

  function runDueJobs() {
    if (!configured() || !state.company) return { ok: true, created: 0, message: "" };
    const today = todayIso();
    if (state.lastJobsRun === today) return { ok: true, created: 0, message: "" };
    let created = 0;
    state.instruments.forEach((instrument) => {
      if (!instrument.due || diffDays(today, instrument.due) !== Number(state.settings.dueLeadDays)) return;
      if (openWorkForInstrument(instrument.id)) return;
      const marker = "due:" + instrument.id + ":" + instrument.due;
      if (state.mails.some((mail) => (mail.body || "").includes(marker))) return;
      const customer = byId(state.customers, instrument.customerId);
      if (!customer) return;
      logMail("Due reminder", customer.email, "Calibration due on " + instrument.due + " for " + instrument.serial, "Serial " + instrument.serial + " (" + instrument.family + ") is due on " + instrument.due + ".\n" + marker, { instrumentId: instrument.id });
      created += 1;
    });
    state.invoices.forEach((invoice) => {
      if (invoice.remindersStopped || invoice.status === "Paid" || invoice.status === "Cancelled" || balanceOf(invoice) <= 0 || invoice.due >= today) return;
      const previous = state.mails.filter((mail) => mail.type === "Payment reminder" && mail.subject.includes(invoice.number));
      if (previous[0] && diffDays(previous[0].at.slice(0, 10), today) < Number(state.settings.paymentEveryDays)) return;
      const customer = byId(state.customers, invoice.customerId);
      logMail("Payment reminder", customer.email, "Payment pending for " + invoice.number, "Invoice " + invoice.number + " has a balance of " + rupees(balanceOf(invoice)) + ". The due date was " + invoice.due + ".", { invoiceId: invoice.id });
      created += 1;
    });
    state.enquiries.forEach((enquiry) => {
      if (enquiry.status === "Converted" || enquiry.status === "Lost") return;
      const last = enquiry.lastChase || enquiry.date;
      if (diffDays(last, today) < Number(state.settings.chaseEveryDays)) return;
      enquiry.status = "Chasing";
      enquiry.lastChase = today;
      enquiry.chaseCount += 1;
      logMail("Order chase", enquiry.email, "Reminder: calibration order not yet received", enquiry.summary, { enquiryId: enquiry.id });
      created += 1;
    });
    state.visits.forEach((visit) => {
      if (visit.packStatus !== "Empty" || diffDays(today, visit.date) !== 5) return;
      const marker = "pack:" + visit.id;
      if (state.mails.some((mail) => (mail.body || "").includes(marker))) return;
      const engineer = byId(state.users, visit.engineerId);
      if (!engineer) return;
      logMail("Visit pack due", engineer.email, "Visit pack due for " + visit.date, visit.jobType + " at " + visit.location + ".\n" + marker, { visitId: visit.id });
      created += 1;
    });
    state.lastJobsRun = today;
    save();
    return { ok: true, created, message: created ? created + (created === 1 ? " reminder is" : " reminders are") + " ready in the mail log." : "" };
  }

  function exportBackup() {
    if (!user() || user().role !== "admin") return fail("Only an administrator can export the backup.");
    return { ok: true, file: { filename: "calibration-backup.json", mime: "application/json", content: JSON.stringify(state) } };
  }

  function importBackup(text) {
    if (!user() || user().role !== "admin") return fail("Only an administrator can restore a backup.");
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return fail("That file is not valid JSON.");
    }
    if (!data || data.version !== 2 || !Array.isArray(data.users) || !data.company) return fail("That file is not a calibration backup.");
    state = data;
    save();
    logout();
    return ok("Backup restored. Sign in with a user from that file.");
  }

  function resetInstallation() {
    if (!user() || user().role !== "admin") return fail("Only an administrator can erase this installation.");
    localStorage.removeItem(KEY);
    state = empty();
    logout();
    return ok("All records were erased.");
  }

  function engineers() {
    return state.users.filter((item) => item.role === "engineer" || item.role === "admin");
  }

  load();

  return {
    FAMILIES,
    load,
    today: todayIso,
    addMonths,
    addDays,
    diffDays,
    configured,
    user,
    can,
    login,
    logout,
    prepareSampleAccess,
    sampleLogins,
    setup,
    register,
    rupees,
    person,
    balanceOf,
    taxOf,
    engineers,
    state: () => state,
    customer: (id) => byId(state.customers, id),
    instrument: (id) => byId(state.instruments, id),
    enquiry: (id) => byId(state.enquiries, id),
    quotation: (id) => byId(state.quotations, id),
    workOrder: (id) => byId(state.workOrders, id),
    visit: (id) => byId(state.visits, id),
    requisition: (id) => byId(state.requisitions, id),
    certificate: (id) => byId(state.certificates, id),
    invoice: (id) => byId(state.invoices, id),
    cylinder: (id) => byId(state.cylinders, id),
    spare: (id) => byId(state.spares, id),
    mail: (id) => byId(state.mails, id),
    openWorkForInstrument,
    gstrRows,
    gstrPeriods,
    gstChecks,
    gstTrack,
    tallyXml,
    whatsappLink,
    customerForMail,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addInstrument,
    updateInstrument,
    deleteInstrument,
    addEnquiry,
    updateEnquiry,
    deleteEnquiry,
    chaseEnquiry,
    loseEnquiry,
    convertEnquiry,
    addQuotation,
    updateQuotation,
    deleteQuotation,
    sendQuotation,
    acceptQuotation,
    rejectQuotation,
    addWorkOrder,
    updateWorkOrder,
    deleteWorkOrder,
    addVisit,
    updateVisit,
    deleteVisit,
    saveVisitPack,
    decideRequisition,
    deleteRequisition,
    saveCertificate,
    deleteCertificate,
    reviseCertificate,
    recordPayment,
    updateInvoice,
    deleteInvoice,
    deleteReceipt,
    addCylinder,
    updateCylinder,
    deleteCylinder,
    setCylinderStatus,
    addSpare,
    updateSpare,
    deleteSpare,
    moveSpare,
    updateMail,
    deleteMail,
    markMailOpened,
    recordGstFiling,
    saveSettings,
    addUser,
    updateUser,
    deleteUser,
    runDueJobs,
    exportBackup,
    importBackup,
    resetInstallation,
  };
})();
