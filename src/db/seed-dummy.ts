// Seeds realistic dummy data (staff, customers, parts, jobs, invoices, payments)
// for local development. Run after db:seed. Skips if customers already exist.
import { db } from "./index";
import {
  users,
  customers,
  jobs,
  jobDevices,
  jobStatusHistory,
  parts,
  jobParts,
  partStockAdjustments,
  invoices,
  invoiceItems,
  payments,
  businessSettings,
} from "./schema";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";

// Deterministic PRNG so reruns on a fresh DB give the same data.
let seed = 42;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const money = (n: number) => n.toFixed(2);
const daysAgo = (d: number, h = 0) => new Date(Date.now() - d * 86400000 - h * 3600000);

const STAFF_PASSWORD = "Staff@12345"; // local dummy accounts only

const STATUS_FLOW = ["received", "diagnosing", "waiting_parts", "repairing", "ready", "delivered"] as const;
type Status = (typeof STATUS_FLOW)[number] | "cancelled";

async function main() {
  const existing = await db.query.customers.findFirst();
  if (existing) {
    console.log("Customers already exist — skipping dummy seed.");
    process.exit(0);
  }

  const admin = await db.query.users.findFirst();
  if (!admin) throw new Error("Run `npm run db:seed` first.");

  // ---- Business settings ----
  await db.update(businessSettings).set({
    businessName: "QuickFix Mobile Care",
    gstin: "24ABCDE1234F1Z5",
    address: "Shop 12, Silver Plaza, CG Road, Ahmedabad, Gujarat 380009",
    phone: "9876543210",
    email: "hello@quickfix.local",
  });

  // ---- Staff ----
  const passwordHash = await bcrypt.hash(STAFF_PASSWORD, 10);
  const staff = await db
    .insert(users)
    .values([
      { name: "Ravi Patel", email: "ravi@mobileshop.local", role: "staff", phone: "9825011111", passwordHash },
      { name: "Imran Shaikh", email: "imran@mobileshop.local", role: "staff", phone: "9825022222", passwordHash },
      { name: "Neha Desai", email: "neha@mobileshop.local", role: "accountant", phone: "9825033333", passwordHash },
    ])
    .returning();
  const techs = [staff[0], staff[1]];

  // ---- Customers ----
  const customerSeed = [
    ["Amit Shah", "9898012345", "Navrangpura, Ahmedabad"],
    ["Priya Mehta", "9898023456", "Satellite, Ahmedabad"],
    ["Rahul Verma", "9898034567", "Bopal, Ahmedabad"],
    ["Sneha Joshi", "9898045678", "Maninagar, Ahmedabad"],
    ["Karan Trivedi", "9898056789", "Vastrapur, Ahmedabad"],
    ["Pooja Rana", "9898067890", "Paldi, Ahmedabad"],
    ["Vikram Singh", "9898078901", "Chandkheda, Ahmedabad"],
    ["Anjali Gupta", "9898089012", "Gota, Ahmedabad"],
    ["Rohit Chauhan", "9898090123", "Thaltej, Ahmedabad"],
    ["Meera Iyer", "9898101234", "Prahlad Nagar, Ahmedabad"],
    ["Sanjay Kapoor", "9898112345", "Naranpura, Ahmedabad"],
    ["Divya Nair", "9898123456", "Ghatlodia, Ahmedabad"],
    ["Harsh Modi", "9898134567", "Ellisbridge, Ahmedabad"],
    ["Kavya Pandya", "9898145678", "Sabarmati, Ahmedabad"],
    ["TechServe Solutions Pvt Ltd", "7926401234", "SG Highway, Ahmedabad"],
  ] as const;
  const custs = await db
    .insert(customers)
    .values(
      customerSeed.map(([name, phone, address], i) => ({
        name,
        phone,
        address,
        email: `${name.split(" ")[0].toLowerCase()}@example.com`,
        gstin: i === 14 ? "24AAACT1234B1Z2" : null,
        notes: i % 5 === 0 ? "Regular customer" : null,
        createdAt: daysAgo(90 - i * 3),
      }))
    )
    .returning();

  // ---- Parts / inventory ----
  const partSeed = [
    ["iPhone 13 Display (OLED)", "DSP-IP13", "Display", 6500, 9500, 4],
    ["iPhone 12 Battery", "BAT-IP12", "Battery", 1200, 2200, 8],
    ["Samsung A52 Display", "DSP-SA52", "Display", 3200, 4800, 3],
    ["Redmi Note 11 Battery", "BAT-RN11", "Battery", 650, 1200, 12],
    ["Type-C Charging Port", "CHG-TC", "Charging", 120, 450, 25],
    ["Lightning Charging Flex", "CHG-LTN", "Charging", 450, 1100, 6],
    ["OnePlus 9 Back Glass", "BG-OP9", "Body", 700, 1500, 5],
    ["Vivo Y20 Display", "DSP-VY20", "Display", 1800, 2900, 2],
    ["Loudspeaker Module (Universal)", "SPK-UNI", "Audio", 150, 500, 18],
    ["Earpiece Speaker", "EAR-UNI", "Audio", 100, 400, 20],
    ["Rear Camera Module iPhone 11", "CAM-IP11", "Camera", 2800, 4500, 3],
    ["Tempered Glass", "TG-UNI", "Accessories", 25, 150, 60],
    ["Laptop Keyboard HP 15", "KB-HP15", "Laptop", 900, 1800, 4],
    ["MacBook Air M1 Battery", "BAT-MBA", "Laptop", 4500, 7500, 1],
    ["Thermal Paste", "TP-01", "Consumables", 80, 250, 10],
  ] as const;
  const partRows = await db
    .insert(parts)
    .values(
      partSeed.map(([name, sku, category, cost, price, qty]) => ({
        name,
        sku,
        category,
        unitCost: money(cost),
        sellingPrice: money(price),
        quantityInStock: qty + 4, // headroom for parts consumed by dummy jobs
        lowStockThreshold: 5,
        createdAt: daysAgo(100),
      }))
    )
    .returning();
  await db.insert(partStockAdjustments).values(
    partRows.map((p) => ({
      partId: p.id,
      changeQuantity: p.quantityInStock,
      reason: "Opening stock",
      recordedBy: admin.id,
      createdAt: daysAgo(100),
    }))
  );

  // ---- Jobs ----
  const deviceSeed = [
    ["Mobile", "Apple", "iPhone 13", "Screen cracked, touch not working", "DSP-IP13"],
    ["Mobile", "Apple", "iPhone 12", "Battery drains fast, phone shuts down at 20%", "BAT-IP12"],
    ["Mobile", "Samsung", "Galaxy A52", "Display has green lines after a fall", "DSP-SA52"],
    ["Mobile", "Xiaomi", "Redmi Note 11", "Battery swollen, back panel lifting", "BAT-RN11"],
    ["Mobile", "OnePlus", "9", "Back glass shattered", "BG-OP9"],
    ["Mobile", "Vivo", "Y20", "No display, phone vibrates on boot", "DSP-VY20"],
    ["Mobile", "Samsung", "Galaxy M31", "Not charging, port loose", "CHG-TC"],
    ["Mobile", "Apple", "iPhone 11", "Rear camera blurry, autofocus not working", "CAM-IP11"],
    ["Mobile", "Realme", "Narzo 50", "Speaker not working on calls", "SPK-UNI"],
    ["Mobile", "Oppo", "A74", "Earpiece low volume", "EAR-UNI"],
    ["Laptop", "HP", "Pavilion 15", "Several keys not working", "KB-HP15"],
    ["Laptop", "Apple", "MacBook Air M1", "Battery service recommended, 300 cycles", "BAT-MBA"],
    ["Mobile", "Apple", "iPhone XR", "Water damage, not powering on", null],
    ["Tablet", "Samsung", "Galaxy Tab A7", "Charging very slow", "CHG-TC"],
  ] as const;

  // 30 jobs spread over the last ~60 days; older ones are further along.
  const JOB_COUNT = 30;
  const year = new Date().getFullYear();
  let invoiceSeq = 1;
  const counts = { jobs: 0, devices: 0, invoices: 0, payments: 0 };

  for (let i = 0; i < JOB_COUNT; i++) {
    const age = Math.round(((JOB_COUNT - i) / JOB_COUNT) * 60); // days ago
    const createdAt = daysAgo(age, int(0, 8));
    const customer = custs[i % custs.length];
    const tech = pick(techs);

    // Status: older jobs mostly delivered, recent ones in progress.
    let finalStatus: Status;
    if (i === 7 || i === 19) finalStatus = "cancelled";
    else if (age > 20) finalStatus = rand() < 0.85 ? "delivered" : "ready";
    else if (age > 8) finalStatus = pick(["repairing", "ready", "delivered", "waiting_parts"] as const);
    else finalStatus = pick(["received", "diagnosing", "waiting_parts", "repairing"] as const);

    const deviceCount = i % 9 === 4 ? 2 : 1;
    const devs = Array.from({ length: deviceCount }, () => pick(deviceSeed));
    const usedParts = devs
      .map((d) => partRows.find((p) => p.sku === d[4]))
      .filter((p): p is (typeof partRows)[number] => !!p);
    const labour = int(3, 8) * 100;
    const partsTotal = usedParts.reduce((s, p) => s + Number(p.sellingPrice), 0);
    const estimate = partsTotal + labour;
    const isDone = finalStatus === "ready" || finalStatus === "delivered";

    const [job] = await db
      .insert(jobs)
      .values({
        jobNumber: `JOB-${year}-${String(i + 1).padStart(4, "0")}`,
        customerId: customer.id,
        priority: pick(["low", "normal", "normal", "normal", "high", "urgent"] as const),
        estimatedCost: money(estimate),
        finalCost: isDone ? money(estimate) : null,
        assignedTo: tech.id,
        createdBy: admin.id,
        promisedAt: new Date(createdAt.getTime() + int(1, 4) * 86400000),
        notes: i % 4 === 0 ? "Customer requested original parts only" : null,
        createdAt,
        updatedAt: createdAt,
      })
      .returning();
    counts.jobs++;

    const flow: Status[] =
      finalStatus === "cancelled"
        ? ["received", "diagnosing", "cancelled"]
        : STATUS_FLOW.slice(0, STATUS_FLOW.indexOf(finalStatus) + 1).filter(
            (s) => s !== "waiting_parts" || finalStatus === "waiting_parts" || rand() < 0.4
          );

    let lastAt = createdAt;
    for (const d of devs) {
      const deliveredAt = finalStatus === "delivered" ? new Date(createdAt.getTime() + flow.length * 12 * 3600000) : null;
      const [dev] = await db
        .insert(jobDevices)
        .values({
          jobId: job.id,
          deviceType: d[0],
          brand: d[1],
          model: d[2],
          serialNumber: `SN${int(100000, 999999)}${int(10, 99)}`,
          issueDescription: d[3],
          accessories: pick(["None", "Charger", "Back cover", "Charger, back cover", "SIM tray only"]),
          passcode: rand() < 0.5 ? String(int(1000, 9999)) : null,
          status: finalStatus,
          deliveredAt,
          createdAt,
          updatedAt: deliveredAt ?? createdAt,
        })
        .returning();
      counts.devices++;

      await db.insert(jobStatusHistory).values(
        flow.map((status, idx) => {
          const at = new Date(Math.min(createdAt.getTime() + idx * 12 * 3600000, Date.now()));
          lastAt = at;
          return {
            jobId: job.id,
            jobDeviceId: dev.id,
            status,
            note: idx === 0 ? "Device received at counter" : status === "cancelled" ? "Customer declined estimate" : null,
            changedBy: idx === 0 ? admin.id : tech.id,
            changedAt: at,
          };
        })
      );
    }

    // Parts consumed for jobs that got past diagnosis.
    if (["repairing", "ready", "delivered"].includes(finalStatus)) {
      for (const p of usedParts) {
        await db.insert(jobParts).values({
          jobId: job.id,
          partId: p.id,
          quantity: 1,
          unitCostAtUse: p.unitCost,
          unitPriceAtUse: p.sellingPrice,
          usedAt: lastAt,
          recordedBy: tech.id,
        });
        await db
          .update(parts)
          .set({ quantityInStock: sql`${parts.quantityInStock} - 1` })
          .where(eq(parts.id, p.id));
      }
    }

    // Invoices + payments for finished jobs.
    if (isDone) {
      const items = [
        ...usedParts.map((p) => ({ description: p.name, hsnSac: "8517", unitPrice: Number(p.sellingPrice) })),
        { description: "Repair service / labour charges", hsnSac: "9987", unitPrice: labour },
      ];
      const subtotal = items.reduce((s, it) => s + it.unitPrice, 0);
      const discount = i % 6 === 0 ? 100 : 0;
      const taxable = subtotal - discount;
      const isInterstate = customer.gstin && customer.gstin.slice(0, 2) !== "24";
      const cgst = isInterstate ? 0 : taxable * 0.09;
      const sgst = isInterstate ? 0 : taxable * 0.09;
      const igst = isInterstate ? taxable * 0.18 : 0;
      const total = Math.round(taxable + cgst + sgst + igst);

      // Delivered → fully paid mostly; ready → unpaid or partial (gives outstanding balances).
      let paid: number;
      if (finalStatus === "delivered") paid = rand() < 0.8 ? total : Math.round(total * 0.5);
      else paid = rand() < 0.5 ? 0 : Math.round(total * 0.3);
      const status = paid >= total ? "paid" : paid > 0 ? "partially_paid" : "issued";
      const issuedAt = lastAt;

      const [inv] = await db
        .insert(invoices)
        .values({
          invoiceNumber: `INV-${year}-${String(invoiceSeq++).padStart(4, "0")}`,
          jobId: job.id,
          customerId: customer.id,
          subtotal: money(subtotal),
          discount: money(discount),
          cgstAmount: money(cgst),
          sgstAmount: money(sgst),
          igstAmount: money(igst),
          total: money(total),
          amountPaid: money(paid),
          status,
          placeOfSupply: "Gujarat",
          issuedAt,
          dueAt: new Date(issuedAt.getTime() + 7 * 86400000),
          createdBy: admin.id,
          createdAt: issuedAt,
          updatedAt: issuedAt,
        })
        .returning();
      counts.invoices++;

      await db.insert(invoiceItems).values(
        items.map((it) => ({
          invoiceId: inv.id,
          description: it.description,
          hsnSac: it.hsnSac,
          quantity: "1",
          unitPrice: money(it.unitPrice),
          taxRatePercent: "18",
          amount: money(it.unitPrice),
        }))
      );

      if (paid > 0) {
        const method = pick(["cash", "upi", "upi", "card", "bank_transfer"] as const);
        await db.insert(payments).values({
          invoiceId: inv.id,
          jobId: job.id,
          customerId: customer.id,
          amount: money(paid),
          method,
          reference: method === "upi" ? `UPI${int(100000000, 999999999)}` : method === "card" ? `XXXX${int(1000, 9999)}` : null,
          recordedBy: staff[2].id,
          paidAt: issuedAt,
        });
        counts.payments++;
      }
    }
  }

  console.log(
    `Dummy data created: ${staff.length} staff, ${custs.length} customers, ${partRows.length} parts, ` +
      `${counts.jobs} jobs (${counts.devices} devices), ${counts.invoices} invoices, ${counts.payments} payments.`
  );
  console.log(`Staff logins: ravi@ / imran@ / neha@mobileshop.local — password ${STAFF_PASSWORD}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
