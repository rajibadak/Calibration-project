# Firstly Calibration: Client Demo Guide (বাংলা)

এই গাইডটা কোড দেখে লেখা। প্রতিটা মেনুতে কী আছে, কেন আছে, ডেমোতে কী দেখাবে আর ক্লায়েন্টকে কী বলবে, সব আছে।

## আগে জেনে রাখো

- লগইন: `admin@firstly.test` / `Admin@1234` (Admin), `accounts@firstly.test` / `Accounts@1234` (Accounts). লগইন পেজে ক্লিক করলেই সাইন-ইন হয়ে যায়।
- ডেটা ব্রাউজারেই থাকে (localStorage)। প্রথমবার খুললে স্যাম্পল ডেটা নিজে থেকে ভরে যায়।
- ইমেইল সিস্টেম **নিজে পাঠায় না**। মেইল "Prepared" হয়ে Mail log-এ থাকে, তুমি "Open in mail app" চাপলে তোমার মেইল অ্যাপে খোলে।
- GST সিস্টেম **নিজে ফাইল করে না**। Signatory পোর্টালে ফাইল করেন, তারপর ARN এখানে লিখে রাখা হয়।
- স্যাম্পল ডেটায় Rates আগে থেকেই বসানো আছে (Portable ₹2,500, Fixed ₹4,500, Area ₹3,500, Site visit ₹1,500)। শুধু একদম নতুন (খালি) ইনস্টলেশনে রেট শূন্য থাকে, তখন Settings → Rates ভরতে হবে।
- Certificate ডেমোর জন্য যেসব instrument-এর খোলা work order আছে: `A5X-330912`, `GT-77821`, `T4-552190`। এগুলো দিয়ে করলে WO নম্বর নিজে ভরে যায়।

## পুরো ব্যবসার গল্প (ক্লায়েন্টকে প্রথমে এটা বলো)

```
ফোন/ইমেইলে কথা  →  Confirmation  →  Quotation  →  Work Order  →  Visit + Fund Request
        →  Calibration (Certificate)  →  Invoice  →  Payment  →  GST
```
সাইডবারের মেনুগুলো এই গল্পের ধাপ। নিচে সাইডবারের ক্রমেই সব মেনু আছে।

---

## ০. Login / Register পেজ

**কী:** সিস্টেমে ঢোকার পেজ। বাঁদিকে কোম্পানির লোগো আর বর্ণনা, ডানদিকে Login ও Register ট্যাব।

**স্ক্রিনে কী আছে:**
- Login: Email, Password
- বাঁদিকে "Sample accounts": ক্লিক করলেই ওই অ্যাকাউন্টে ঢুকে যায় (ডেমোর জন্য সুবিধা)
- Register: নাম, designation, email, phone, password, **Role** (Administrator / Planner / Service engineer / Accounts / Approver) এবং কোম্পানির তথ্য (legal name, GSTIN, state, address, bank)

**ক্লায়েন্টকে বলার পয়েন্ট:** "প্রত্যেকে নিজের role অনুযায়ী লগইন করে। Engineer শুধু নিজের কাজ দেখে, Accounts শুধু বিলিং, Admin সব।"

---

## ১. Dashboard

**কী:** সকালে খুলেই দেখা যায় আজ কী কী কাজ আছে। কোথাও খুঁজতে হয় না।

**স্ক্রিনে কী আছে (উপর থেকে নিচে):**
1. **Greeting strip:** "Good morning, [নাম]" আর আজকের তারিখ।
2. **Due status bar:** সব instrument-এর অবস্থা একটা রঙিন বারে। Overdue (লাল), Due today, Due soon (কমলা), In date (সবুজ), No due date (ধূসর)। পাশে প্রতিটার সংখ্যা।
3. **৪টা KPI কার্ড** (ক্লিক করলে সেই পেজে যায়):
   - Confirmations without an order (Open + Chasing)
   - Fund requests to approve
   - Invoices with a balance
   - Instruments overdue (০-র বেশি হলে লাল)
4. **Upcoming visits:** পরের ৭ দিনের ভিজিট (তারিখ, job, location, engineer, pack অবস্থা)
5. **Overdue instruments:** যাদের calibration due পেরিয়ে গেছে (serial, customer, due, status)
6. **Recent activity:** সর্বশেষ ৬টা মেইল/নোটিফিকেশন

**ডেমোতে বলো:** "ম্যানেজার সকালে শুধু এই পেজ দেখলেই বুঝবে কোথায় আগুন লেগেছে।"

---

## সাইডবার গ্রুপ: SALES

## ২. Customers

**কী:** যে কোম্পানিগুলোর monitor আপনারা calibrate করেন তাদের তালিকা (customer master)।

**লিস্ট পেজ:** সার্চ (নাম, GSTIN, email), কলাম: Customer, GSTIN, State, Email, Actions (view / edit / delete / download)। **Add customer** বাটন।

**নতুন customer ফর্ম:** Legal name, Trade name, Email, Phone, Contact person, GSTIN, State, GST state code, Billing address, Site, GSTR-1 status noted, GSTR-3B status noted, Date GST was checked।

**Customer detail পেজ:** পুরো তথ্য + ওই customer-এর সব **Instruments** (due অবস্থাসহ) + সব **Invoices** (status ও বাকি টাকাসহ)।

**গুরুত্বপূর্ণ নিয়ম:**
- Customer-এর state দেখে quotation/invoice-এ নিজে ঠিক করে নেয় CGST+SGST হবে না IGST।
- যে customer-এর সাথে quotation, work order, invoice, certificate জড়িত তাকে delete করা যায় না।
- GSTR-1 / GSTR-3B অবস্থা **হাতে লিখে** রাখতে হয় (পোর্টালে দেখে)। সিস্টেম নিজে GST পোর্টাল থেকে আনে না।

**ডেমো ধাপ:** তালিকা দেখাও → একটা customer খোলো → তার instruments ও invoices একসাথে দেখাও।

**বলার পয়েন্ট:** "একটা customer-এর পুরো ইতিহাস এক পেজে।"

---

## ৩. Quotations

**কী:** দামের প্রস্তাব (offer)। নম্বর `QT-YYYY-####`।

**লিস্ট পেজ:** সার্চ + স্ট্যাটাস ফিল্টার (Draft / Sent / Accepted / Rejected)। কলাম: Quotation, Customer, Date, Total, Status, Actions।

**ফর্ম:** Customer বাছো → লাইন যোগ করো (**Type**: Portable/Fixed/Area monitor/Site visit বা যেকোনো, **Description**, **Qty**, **Rate ₹**) → Notes। **Add line / Remove** দিয়ে যত খুশি লাইন।
- Confirmation থেকে এলে description আর notes আগে থেকেই ভরা থাকে।

**Detail পেজ:** কোম্পানির letterhead-সহ quotation-এর ছাপার মতো চেহারা, "Valid until" তারিখ (ডিফল্ট ১৫ দিন)।
বাটন:
- **Prepare email:** customer-কে পাঠানোর মেইল তৈরি করে (Mail log-এ যায়)
- **Mark accepted / Mark rejected**
- **Open work order** (শুধু Accepted হলে): সরাসরি work order খোলে
- **Edit** (Accepted/Rejected হলে lock হয়ে যায়), **Download**

**নিয়ম:** Accepted quotation delete করা যায় না। GST (CGST/SGST বা IGST) আর মোট টাকা নিজে হিসাব হয়।

**ডেমো ধাপ:** নতুন quotation বানাও → দুটো লাইন দাও → save → Prepare email → Mark accepted → Open work order।

**বলার পয়েন্ট:** "GST হিসাব, বৈধতার তারিখ, নম্বর সব নিজে হয়। প্রতিটা quotation-এর ইতিহাস থাকে।"

---

## ৪. Confirmations

**কী:** ফোনে/ইমেইলে "হ্যাঁ করবো" বলেছে কিন্তু এখনও লিখিত order (PO) আসেনি, এমন কাজের তালিকা। নিজে থেকে প্রতি ৩ দিনে রিমাইন্ডার মেইল তৈরি করে।

**লিস্ট পেজ:** সার্চ + ফিল্টার (Open / Chasing / Converted / Lost)। কলাম: Source (Verbal/Email), Customer, Date, Status, Chases (কতবার রিমাইন্ডার গেছে), Actions। **Record confirmation** বাটন।

**ফর্ম:** Customer, Source (Verbal/Email), তারিখ, Contact, Email, Summary।

**Detail পেজে ৩ বাটন:**
1. **Prepare chase email:** রিমাইন্ডার মেইল তৈরি করে (status "Chasing", chase সংখ্যা +১)
2. **Convert to quotation:** summary কপি করে সরাসরি quotation বানায় (status "Converted")
3. **Mark lost:** বন্ধ করে দেয়

**স্ট্যাটাস:** `Open → Chasing → Converted` অথবা `Lost`। Converted হলে এখানে আর edit হয় না। যেসব confirmation-এর quotation আছে সেগুলো delete হয় না।

**অটো রিমাইন্ডার:** শেষ chase (বা confirmation-এর তারিখ) থেকে ৩ দিন পার হলেই নতুন chase মেইল তৈরি হয় (Settings → Reminders-এ দিন বদলানো যায়)। Converted/Lost হলে বন্ধ। কেউ লগইন করা অবস্থায় দিনে একবার চলে।

**স্যাম্পল ডেটা:** Durgapur (Verbal, Chasing), তৃতীয় customer (Email, Open), Haldia (Converted), পঞ্চম customer (Lost)।

**ডেমো ধাপ:** নতুন confirmation → Prepare chase email → Mail menu-তে মেইল দেখাও → ফিরে এসে Convert to quotation।

**বলার পয়েন্ট:** "মুখের কথাও আর হারায় না। ফলো-আপ নিজে নিজে হয়।"

---

## সাইডবার গ্রুপ: OPERATIONS

## ৫. Work Orders

**কী:** Customer অর্ডার দেওয়ার পর কাজের রেকর্ড। অভ্যন্তরীণ নম্বর `JOB-YYYY-####` সিস্টেম নিজে দেয়। **Customer-এর নিজের work order নম্বর ও তারিখ হাতে লিখতে হয়**, কারণ সেটা certificate-এ ছাপা হয়।

**লিস্ট পেজ:** সার্চ + ফিল্টার (Scheduled / Calibrated / Invoiced / Cancelled)। কলাম: Job, Customer order, Order date, Customer, Status, Actions। **Open work order** বাটন।

**ফর্ম:**
- Customer (বাছলে নিচে তার instrument-এর চেকবক্স দেখায়)
- Accepted quotation (ঐ customer-এর Accepted quotation থেকে বাছা যায়, না থাকলেও চলে)
- Customer work order number, Customer work order date
- Site
- **Instruments:** কোন কোন monitor এই অর্ডারে পড়ছে, টিক দাও। Instrument না থাকলে "Add one" লিংক।

**Detail পেজ:** Job নম্বর, customer order তারিখ, status, site, quotation লিংক, instruments। বাটন: **Schedule visit**, **Certificate**, **Edit** (Invoiced/Cancelled হলে বন্ধ), **Download**।

**ডেমো ধাপ:** Accepted quotation থেকে work order খোলো → instrument টিক দাও → detail-এ গিয়ে Schedule visit ও Certificate বাটন দেখাও।

**বলার পয়েন্ট:** "এই একটা কাজের সূত্র ধরেই visit, certificate, invoice সব জুড়ে থাকে।"

---

## ৬. Visits

**কী:** Engineer কবে কোথায় যাবে তার সময়সূচি, আর যাওয়ার আগে খরচের তথ্য (Visit pack)।

**লিস্ট পেজ:** সার্চ। কলাম: Date, Job, Location, Engineer, Pack (অবস্থা), Actions। **Schedule visit** বাটন।

**Schedule ফর্ম:** Work order, Engineer, Date (ডিফল্ট ৪ দিন পরে), Time, **Job type** (Site calibration / Workshop calibration / Breakdown call / Installation), Site contact, Location।

**Detail পেজ ও Visit pack:**
- ভিজিটের **৫ দিন আগে** pack খোলে। তার আগে লেখা থাকে "pack opens on [তারিখ]"।
- Pack-এ: Time, Job type, Location, Contact, **Transport**, **Travel (₹)**, **Other expenses (₹)**, Notes।
- দুটো বাটন: **Save pack** (শুধু সংরক্ষণ) আর **Submit for approval** (planner-কে মেইল যায়, fund request খোলে)।
- ভিজিট ৩ দিনের কম বাকি থাকলে **Override reason** লিখতে হয় (Planner/Admin দিতে পারেন)।
- **Workshop calibration-এ যদি ট্রাভেল ও অন্য খরচ শূন্য হয়, fund request খোলে না।** বাকি সব ক্ষেত্রে approval লাগে।
- Fund request-এ টাকা release হয়ে গেলে ভিজিট আর edit/delete হয় না।

**অটো:** ভিজিটের ঠিক ৫ দিন আগে pack খালি থাকলে engineer-কে "Visit pack due" রিমাইন্ডার মেইল তৈরি হয়।

**ডেমো ধাপ:** একটা visit খোলো → pack ভরো (Travel ₹ দাও) → Submit for approval → Fund requests মেনুতে গিয়ে request দেখাও।

**বলার পয়েন্ট:** "Engineer খরচের হিসাব আগেই দেয়, অনুমোদন ছাড়া টাকা ছাড় হয় না।"

---

## ৭. Instruments

**কী:** Customer-এর প্রতিটা physical monitor-এর রেজিস্টার। এখান থেকেই "পরের calibration কবে" জানা যায়।

**লিস্ট পেজ:** সার্চ (serial, make, customer) + ফিল্টার (Overdue / Due today / Due soon / In date / No due date)। কলাম: Family, Serial, Make and model, Customer, Due (রঙিন ব্যাজ), Actions। **Add instrument** বাটন।

**ফর্ম:** Customer, **Family** (Portable / Fixed / Area), **Interval** (3 / 4 / 6 মাস), Make, Model, Serial number, Tag।

**Detail পেজ:** Customer লিংক, make, model, tag, interval, **Last calibration**, **Due** (ব্যাজসহ)। **Calibrate** বাটন সরাসরি certificate ফর্ম খোলে (serial আগে থেকে ভরা)।

**অটো:** Due date-এর **১৫ দিন আগে** customer-কে "Calibration due" রিমাইন্ডার মেইল তৈরি হয় (Settings → Reminders-এ "Due reminder lead" দিয়ে বদলানো যায়)।

**বলার পয়েন্ট:** "কোন monitor-এর calibration কখন শেষ, কখন আবার লাগবে, কেউ মনে রাখতে হয় না। Customer-কে আগেই জানানো যায়, এতে নতুন কাজও আসে।"

---

## ৮. Certificates (মূল ফিচার)

**কী:** Calibration সম্পন্ন করার পর দেওয়া certificate। নম্বর `CAL-YYYY-####`। ৩ রকম ছাপার layout: Portable / Fixed / Area।

**লিস্ট পেজ:** সার্চ + ফিল্টার (Draft / Issued / Superseded)। কলাম: Certificate, Serial, Customer, Calibrated, Due, Status, Actions। **New certificate** বাটন।

**নতুন certificate ফর্ম (বাঁয়ে ফর্ম, ডানে লাইভ প্রিভিউ):**

*তুমি লেখো/বাছো:*
- Work order (বাছলে customer, WO নম্বর, তারিখ নিজে ভরে যায়)
- Customer, Family
- **Serial number**
- **Calibration date**
- **Interval** (3/4/6 মাস)
- Work order number ও date
- **Cylinder** (শুধু In stock / Issued cylinder দেখায়)
- Engineer
- Notes

*সিস্টেম নিজে করে:*
- **Due date** = calibration date + interval (লাইভ দেখায়, edit করা যায় না)
- Cylinder বাছলেই তার **গ্যাস ও concentration** নিচে চলে আসে। তুমি শুধু যে গ্যাস লাগেনি তার টিক তুলে দিতে পারো। **Cylinder-এ নেই এমন গ্যাস যোগ করা যায় না।** প্রতিটা গ্যাসের জন্য **As found** ও **As left** রিডিং লেখো।
- Empty / Quarantined / Expired cylinder ব্যবহার করতে গেলে লাল সতর্কতা।

*বাটন:* **Save draft** আর **Issue certificate**।

**Issue করলে যা যা ঘটে:**
1. Engineer-এর সংরক্ষিত **signature** certificate-এ বসে যায়
2. Certificate নম্বর পায়, lock হয়ে যায়
3. Instrument-এর **Last calibration ও Due date নিজে আপডেট** হয়
4. **Tax invoice নিজে তৈরি** হয় (রেট কার্ড বা accepted quotation থেকে)
5. Customer-কে certificate + invoice পাঠানোর মেইল **তৈরি** হয় (নিজে পাঠায় না)

**ভুল হলে:** Issued certificate edit হয় না। **Revise** চাপলে নতুন certificate হয় (নম্বর `-R1`), পুরোনোটা "Superseded" হয়ে যায়।

**ডেমো ধাপ:** Instrument থেকে Calibrate → cylinder বাছো (গ্যাস নিজে এলো দেখাও) → as found/as left দাও → ডানে প্রিভিউ দেখাও → Issue → certificate ও invoice link দেখাও।

**বলার পয়েন্ট:** "Engineer-কে concentration আবার টাইপ করতে হয় না, ভুলের সম্ভাবনা কম। Due date হিসাব হাতে করতে হয় না। Signature, invoice, মেইল সব এক ক্লিকে।"

---

## ৯. Stock

**কী:** Calibration-এর গ্যাস cylinder আর spare parts (sensor, filter ইত্যাদি) এর মজুত।

**পেজ উপরে:** ৩টা কার্ড: Cylinders in stock, Cylinders not available, Spares at or below reorder।

**Cylinders টেবিল:** Cylinder নম্বর, Type (single/multi gas), Certified gases (যেমন Methane 50 % LEL, CO 100 ppm), Expiry, Status, Actions। সার্চ আছে।
- **Add cylinder ফর্ম:** Cylinder number, Expiry, Supplier, Gas certificate number, **গ্যাসের লাইন** (Gas, Concentration, Unit: ppm / % LEL / % vol / mg/m3)। **Add gas** দিয়ে multi-gas বানাও।
- **Detail পেজে status বাটন:** In stock / Empty / Quarantined / Expired। Issued certificate যে cylinder ব্যবহার করেছে তার গ্যাসের মান আর বদলানো যায় না (শুধু status বদলানো যায়)।

**Spares টেবিল:** Code, Item, On hand, Reorder, Stock (In stock / Reorder ব্যাজ)।
- **Add spare:** Code, Name, Quantity received, Reorder at
- **Detail-এ Stock movement:** Quantity + Direction (**Receive** / **Issue**)

**বলার পয়েন্ট:** "Expired বা খালি cylinder দিয়ে ভুলে certificate হবে না। Spare কমে গেলে সতর্কতা আসে।"

---

## সাইডবার গ্রুপ: FINANCE

## ১০. Invoices

**কী:** Tax invoice (`INV-YYYY-####`), SAC 998346, GST ১৮%। Certificate issue করলে নিজে তৈরি হয়।

**পেজ উপরে ৩টা সংখ্যা:** Total outstanding, Overdue (লাল), Paid this month।

**লিস্ট:** সার্চ + ফিল্টার (Issued / Partly paid / Paid / Cancelled)। কলাম: Invoice, Customer, Date, Total, Balance, Status, Actions। Payment হয়ে গেলে invoice delete হয় না।

**Detail পেজ:**
- ছাপার মতো invoice (কোম্পানির তথ্য, customer, লাইন, কর, মোট)
- **Record payment:** Amount (ডিফল্ট বাকি টাকা), Date, **Mode** (Bank / UPI / Cash / Cheque), Reference। আংশিক পেমেন্ট দেওয়া যায়, status হয় "Partly paid" তারপর "Paid"।
- **Invoice record:** **IRN** (e-invoice পোর্টাল থেকে পাওয়ার পর পেস্ট করার জায়গা; সিস্টেম নিজে IRN বা QR বানায় না), Notes, **Stop payment reminders** চেকবক্স
- নিচে Receipts-এর তালিকা

**অটো রিমাইন্ডার:** Due date পেরোলে প্রতি ৭ দিনে "Payment pending" মেইল তৈরি হয়, যতক্ষণ না টাকা শূন্য হয় বা reminder বন্ধ করা হয় (Settings: credit days ও দিন বদলানো যায়)।

**বলার পয়েন্ট:** "কার কত বাকি, কতদিন ধরে বাকি, সব এক নজরে। তাগাদা নিজে নিজে তৈরি হয়।"

---

## ১১. Fund Requests

**কী:** Engineer-এর ট্রাভেল/খরচের অগ্রিম অনুমোদন। Visit pack submit করলে নিজে খোলে। নম্বর `FR-YYYY-####`।

**লিস্ট:** সার্চ + ফিল্টার (Submitted / Released / Rejected)। কলাম: Request, Visit (তারিখ), Engineer, Amount, Status, Actions।

**Detail পেজ:**
- Status, amount, visit লিংক, engineer
- **History:** কে কখন কী করেছে (ধারাবাহিক টাইমলাইন)। এটাই "সহজে ট্র্যাক করা"-র দাবি পূরণ করে।
- **Decision ফর্ম** (Approver/Admin দেখেন): **Amount to release**, **Note**, **Approve and release** / **Reject** (reject-এ কারণ লিখতে হয়)

**বড় নিয়ম:** যে engineer ভিজিটে যাচ্ছে সে **নিজের request নিজে approve/reject করতে পারে না।** তখন পেজে লেখা আসে "অন্য approver লাগবে"। Release হয়ে গেলে request delete হয় না।

**বলার পয়েন্ট:** "টাকা ছাড়ের স্বচ্ছতা। কে চেয়েছে, কে অনুমোদন করেছে, কত টাকা, কখন, সব লেখা থাকে।"

---

## ১২. GST

**কী:** মাসভিত্তিক outward supply (বিক্রির invoice) তালিকা, GSTR-1 ফাইল করার প্রস্তুতি।

**স্ক্রিনে কী আছে:**
- উপরে **মাসের বাটন** (যে মাসে invoice আছে সেগুলো)। বাছলে ঐ মাসের তথ্য আসে।
- **Download JSON** বাটন (ঐ মাসের ডেটা)
- টেবিল: Invoice, Customer GSTIN, Date, Taxable, Tax, IRN, Actions
- **Record the portal filing:** **ARN** ও **Filed on** তারিখ, **Save ARN**
- হেডলাইনে দেখায় "Filed, ARN … recorded" বা "Not yet recorded as filed"

**কাজের ধারা:** invoice তৈরি → মাস বাছো → তালিকা মেলাও → JSON ডাউনলোড → Signatory GST পোর্টালে (বা GSP-র মাধ্যমে) ফাইল করেন → ARN এখানে লিখে রাখো।

**ক্লায়েন্টকে সৎভাবে বলো:** সিস্টেম নিজে ফাইল করে না, ARN বা IRN বানায় না। এটা আইনত অনুমোদিত ব্যক্তির কাজ। এখানে প্রস্তুতি ও রেকর্ড। পরের ধাপে GSP integration যোগ করা যাবে।

---

## সাইডবার গ্রুপ: ADMIN

## ১৩. Mail

**কী:** সিস্টেমের তৈরি সব মেইলের লগ (quotation, chase, certificate+invoice, due reminder, payment reminder, visit pack)।

**লিস্ট:** সার্চ + ফিল্টার (Prepared / Opened in mail app)। কলাম: Type, To, Subject, Date, Status, Actions।

**Detail পেজ:** প্রাপক, status, পুরো মেইলের লেখা। বাটন:
- **Open in mail app:** তোমার ডিফল্ট মেইল অ্যাপে মেইলটা খুলে দেয়, তুমি নিজে Send চাপো
- **Edit:** প্রাপক, subject, লেখা ঠিক করো (পাঠানোর আগে)
- **Download**

**মনে রাখো:** Status "Prepared" থাকে যতক্ষণ না তুমি খোলো। সিস্টেম নিজে "Sent" দেখায় না, কারণ এটা browser prototype।

**বলার পয়েন্ট:** "কোন মেইল কখন তৈরি হলো তার প্রমাণ থাকে। Production-এ SMTP যুক্ত করলে নিজে থেকে চলে যাবে।"

---

## ১৪. Reports

**কী:** দুটো কাজের রিপোর্ট।

1. **Calibration due:** আগামী ৩০ দিনে (এবং overdue) যাদের calibration লাগবে। সার্চ আছে। কলাম: Serial, Customer, Family, Due, Status। উপরে **Download due list** বাটন।
2. **Outstanding invoices:** যাদের টাকা বাকি। কলাম: Invoice, Customer, Due, Balance, Status।

**বলার পয়েন্ট:** "এই তালিকা ধরে সেলস টিম নতুন কাজ ধরতে পারে, অ্যাকাউন্টস তাগাদা দিতে পারে।"

---

## ১৫. Settings

**কী:** সিস্টেমের কনফিগারেশন। Admin সব ট্যাব দেখে। অন্য role শুধু **Account** দেখে (নিজের password ও signature)।

**ট্যাবগুলো (বাঁদিকে):**
1. **Company:** Legal name, Trade name, Email, **Planner email**, Phone, GSTIN, State, State code, Address, Bank details, Signatory
2. **Tax:** SAC (998346), GST % (১৮), E-invoice applies (No/Yes)
3. **Rates:** Portable / Fixed / Area monitor ও Site visit এর রেট (₹)। **শূন্য থাকলে certificate issue হবে না।**
4. **Reminders:** Credit days, Payment reminder every (days), Confirmation chase every (days), Due reminder lead (days), Quotation validity (days)
5. **Users:** ব্যবহারকারীর তালিকা (Name, Email, Role, **Signature** আছে কিনা)। নতুন user যোগ, edit, delete, password বদল, **Signature image আপলোড** (certificate-এ বসে)
6. **Backup:** **Download backup** (JSON), **Import** (restore, তখন সাইন-আউট হয়), **Erase installation** (সব মুছে দেয়, সাবধান!)

**বলার পয়েন্ট:** "ট্যাক্স রেট, রিমাইন্ডারের দিন সব বদলানো যায়, কোডে হাত না দিয়ে।"

---

## টপবার (প্রতিটা পেজের উপরে)

- **Sidebar toggle:** মেনু ছোট/বড় করা
- **Breadcrumb:** এখন কোন পেজে আছো
- **Search box:** Customers, serial, invoice খোঁজার জন্য
- **Bell আইকন (Notifications):** তৈরি হওয়া মেইলের তালিকা, ক্লিক করলে বিস্তারিত। লাল ডট = Prepared মেইল আছে
- **Account মেনু:** My account, Logout

---

## ডেমোর সুপারিশ করা ক্রম (প্রায় ১৫ মিনিট)

1. Dashboard (১ মিনিট): আজকের অবস্থা
2. Confirmations → Convert to quotation (২ মিনিট)
3. Quotation → Accepted → Open work order (২ মিনিট)
4. Work order → Schedule visit → Visit pack submit (২ মিনিট)
5. Fund requests → Approve (১ মিনিট)
6. Instrument → Calibrate → Certificate Issue (৩ মিনিট)
7. Invoice → Record payment (১ মিনিট)
8. Mail log → Open in mail app (১ মিনিট)
9. GST → মাস → JSON → ARN (১ মিনিট)
10. Reports + Settings (১ মিনিট)

## ক্লায়েন্ট যা জিজ্ঞেস করতে পারে

| প্রশ্ন | উত্তর |
|---|---|
| ডেটা কোথায় থাকে? | এখন ব্রাউজারে (প্রোটোটাইপ)। Production-এ PostgreSQL ডেটাবেস। |
| মেইল কি নিজে যায়? | এখন তৈরি হয়, নিজে যায় না। Production-এ SMTP যুক্ত হলে যাবে। |
| GST কি নিজে ফাইল হয়? | না। আইনত Signatory-কে করতে হয়। সিস্টেম প্রস্তুতি ও ARN রেকর্ড রাখে। পরে GSP যুক্ত করা যাবে। |
| একসাথে অনেকে ব্যবহার করতে পারবে? | এই প্রোটোটাইপে না (প্রতিটা ব্রাউজারে আলাদা ডেটা)। Production ভার্সনে পারবে। |
| ভুল certificate কীভাবে ঠিক হবে? | Revise করলে `-R1` সংস্করণ হয়, পুরোনোটা Superseded থাকে। |


---

## PDF (Requirement Summary) অনুযায়ী নতুন যোগ হওয়া ফিচার

| PDF-এর দাবি | কোথায় যোগ হলো | কীভাবে দেখাবে |
|---|---|---|
| GST error check (GSTIN, HSN/SAC) | **GST পেজ → Pre-filing check** | SAC ভুল (যেমন 1234) দিলে "Error" দেখায়। Customer GSTIN-এর ফরম্যাট, state code মিল, CGST/SGST বনাম IGST, ১৮% হার, IRN বাকি, আগের মাস ফাইল হয়নি, সবই চেক করে |
| GST tracking | **GST পেজ → GST track record** | মাসওয়ারি নিজের ফাইলিং (ARN, তারিখ, error সংখ্যা) আর customer GSTIN-এর ফাইলিং অবস্থা, ৩০ দিনের বেশি পুরোনো হলে "Re-check" |
| Tally / accounting integration | **GST পেজ ও Invoices পেজ → Export to Tally (XML)** | বোতামে ক্লিক করলে Tally-তে import করার Sales voucher XML নামে |
| WhatsApp reminder | **Mail → মেইল খুলে → Send on WhatsApp** | customer-এর মোবাইল নম্বরে WhatsApp চ্যাট খোলে, লেখা ভরা থাকে, তুমি Send চাপো। Settings → Compliance-এ বন্ধ করা যায় |
| NABL certificate format | **Settings → Compliance** | NABL = Yes ও accreditation নম্বর দিলে certificate-এ "NABL accredited laboratory · Accreditation No." লেখা আসে |
| ₹5 কোটি turnover / e-invoice | **Settings → Compliance** | Yes দিলে আর e-invoice বন্ধ থাকলে GST check সতর্ক করে |
| Signature: scanned image না DSC | **Settings → Users → Signature type** | DSC বাছলে serial ও মেয়াদ দিতে হয়, certificate-এ "Digitally signed (DSC) · Serial · Valid till" ছাপা হয় |
| Stock: cylinder, **sensor**, spares | **Stock → Spares → Type** | Sensor / Spare part / Consumable আলাদা করে দেখায় |

## PDF-এর ফেজ অনুযায়ী প্রজেক্টের অবস্থা

| ফেজ | প্রোটোটাইপে কী আছে | প্রোডাকশনে যা লাগবে |
|---|---|---|
| **Phase 1 · Core** | Customer, instrument, certificate (due date, cylinder, signature, NABL), quotation, invoice, payment reminder, PO follow-up (Confirmations), due reminder | Real SMTP, যাতে মেইল নিজে যায় |
| **Phase 2 · Operations** | Visit scheduling, fund requisition ও approval, stock (cylinder + sensor + spare) | Planner মেইল পাঠানো, ডেটাবেস |
| **Phase 3 · Compliance** | GSTR-1 JSON, pre-filing check, GST track record, ARN রেকর্ড, e-invoice IRN পেস্ট, Tally XML export | GSP integration (upload), IRN নিজে তৈরি, GSTIN live verify, GSTR-2B reconciliation |

## ক্লায়েন্টকে সৎভাবে যা বলবে (এখনও নেই)
- মেইল নিজে যায় না (প্রস্তুত হয়, মেইল অ্যাপে বা WhatsApp-এ খুলে দেয়)
- GSTR-1 নিজে upload হয় না। OTP/EVC দিয়ে আপনার লোককে নিশ্চিত করতে হবে, GSP-র বার্ষিক সাবস্ক্রিপশন আলাদা খরচ (PDF-এও বলা আছে)
- GSTR-2B reconciliation এবং GSTIN-এর live যাচাই নেই (এর জন্য GSP লাগে)
- WhatsApp এখন "chat খুলে দেয়" ধরনের, স্বয়ংক্রিয় নয়। স্বয়ংক্রিয় করতে WhatsApp Business API লাগবে
- স্যাম্পল customer-দের ফোন নম্বর landline, তাই WhatsApp ডেমোর আগে একটা customer-এর মোবাইল নম্বর বসিয়ে নাও
