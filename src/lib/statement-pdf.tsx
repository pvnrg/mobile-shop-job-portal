import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatDate } from "@/lib/format";
import { paymentMethodLabels, type PaymentMethod } from "@/lib/status";
import {
  getCustomerLedger,
  statementPeriods,
  type LedgerEntry,
  type StatementPeriod,
} from "@/lib/statement";

// The built-in PDF fonts (Helvetica) have no "₹" glyph, so amounts use "Rs."
// — the usual form on printed Indian bills anyway.
function rs(value: number) {
  return `Rs. ${new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
}

function balanceText(value: number) {
  const rounded = Math.round(value * 100) / 100;
  if (rounded > 0) return `${rs(rounded)} Due`;
  if (rounded < 0) return `${rs(-rounded)} Adv`;
  return rs(0);
}

const c = { muted: "#6b7280", border: "#e5e7eb", head: "#f3f4f6", red: "#b91c1c", green: "#15803d" };

const s = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#111827" },
  row: { flexDirection: "row" },
  between: { flexDirection: "row", justifyContent: "space-between" },
  shop: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  muted: { color: c.muted },
  title: { fontSize: 11, fontFamily: "Helvetica-Bold", textAlign: "right" },
  rule: { borderBottomWidth: 1, borderBottomColor: c.border, marginVertical: 10 },
  label: { fontSize: 8, color: c.muted, marginBottom: 2 },
  bold: { fontFamily: "Helvetica-Bold" },
  boxes: { flexDirection: "row", gap: 6, marginVertical: 10 },
  box: { flex: 1, borderWidth: 1, borderColor: c.border, borderRadius: 4, padding: 6 },
  boxValue: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 2 },
  table: { borderWidth: 1, borderColor: c.border, borderRadius: 4 },
  th: { flexDirection: "row", backgroundColor: c.head, fontFamily: "Helvetica-Bold", fontSize: 8, color: c.muted },
  tr: { flexDirection: "row", borderTopWidth: 1, borderTopColor: c.border },
  tfoot: { flexDirection: "row", borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.head, fontFamily: "Helvetica-Bold" },
  cDate: { width: "14%", padding: 5 },
  cPart: { width: "41%", padding: 5 },
  cNum: { width: "15%", padding: 5, textAlign: "right" },
  small: { fontSize: 7.5, color: c.muted, marginTop: 1 },
  footer: { position: "absolute", bottom: 20, left: 32, right: 32, fontSize: 7.5, color: c.muted, textAlign: "center" },
});

function billStatus(e: Extract<LedgerEntry, { kind: "bill" }>) {
  if (e.billDue <= 0) return "Paid";
  if (e.billPaid > 0) return `Part paid - ${rs(e.billDue)} udhar`;
  return `Udhar - ${rs(e.billDue)}`;
}

function Particulars({ e }: { e: LedgerEntry }) {
  if (e.kind === "bill") {
    const sub = [e.device, e.jobNumber].filter(Boolean).join(" · ");
    return (
      <View>
        <Text style={s.bold}>Bill {e.invoiceNumber}</Text>
        {sub ? <Text style={s.small}>{sub}</Text> : null}
        <Text style={[s.small, { color: e.billDue > 0 ? c.red : c.green }]}>{billStatus(e)}</Text>
      </View>
    );
  }
  const method = paymentMethodLabels[e.method as PaymentMethod] ?? e.method;
  const sub = [e.invoiceNumber ? `For ${e.invoiceNumber}` : "Not linked to a bill", e.reference ? `Ref ${e.reference}` : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <View>
      <Text style={s.bold}>Payment received · {method}</Text>
      <Text style={s.small}>{sub}</Text>
    </View>
  );
}

/** Renders the customer's bank-style statement as a PDF. Null if the customer doesn't exist. */
export async function renderStatementPdf(customerId: number, period: StatementPeriod = "all") {
  const [customer, business, ledger] = await Promise.all([
    db.query.customers.findFirst({ where: eq(customers.id, customerId) }),
    db.query.businessSettings.findFirst(),
    getCustomerLedger(customerId, period),
  ]);
  if (!customer) return null;

  const shopName = business?.businessName ?? "Mobile Repair Shop";
  const periodLabel = statementPeriods.find((p) => p.value === period)?.label ?? "All time";
  const { entries, openingBalance, closingBalance, totalBilled, totalPaid, from } = ledger;
  const showOpening = from !== null;
  const balColor = (v: number) => (v > 0.004 ? c.red : v < -0.004 ? c.green : c.muted);

  const doc = (
    <Document title={`Account Statement - ${customer.name}`} author={shopName}>
      <Page size="A4" style={s.page} wrap>
        <View style={s.between}>
          <View style={{ maxWidth: "60%" }}>
            <Text style={s.shop}>{shopName}</Text>
            {business?.address ? <Text style={s.muted}>{business.address}</Text> : null}
            <Text style={s.muted}>
              {[business?.phone, business?.gstin ? `GSTIN ${business.gstin}` : null].filter(Boolean).join(" · ")}
            </Text>
          </View>
          <View>
            <Text style={s.title}>ACCOUNT STATEMENT</Text>
            <Text style={[s.muted, { textAlign: "right" }]}>Period: {periodLabel}</Text>
            <Text style={[s.muted, { textAlign: "right" }]}>Generated {formatDate(new Date())}</Text>
          </View>
        </View>

        <View style={s.rule} />

        <Text style={s.label}>Customer</Text>
        <Text style={s.bold}>{customer.name}</Text>
        <Text style={s.muted}>{customer.phone}</Text>
        {customer.address ? <Text style={s.muted}>{customer.address}</Text> : null}

        <View style={s.boxes}>
          {showOpening ? (
            <View style={s.box}>
              <Text style={s.label}>Opening balance</Text>
              <Text style={[s.boxValue, { color: balColor(openingBalance) }]}>{balanceText(openingBalance)}</Text>
            </View>
          ) : null}
          <View style={s.box}>
            <Text style={s.label}>Total billed</Text>
            <Text style={s.boxValue}>{rs(totalBilled)}</Text>
          </View>
          <View style={s.box}>
            <Text style={s.label}>Total paid</Text>
            <Text style={[s.boxValue, { color: c.green }]}>{rs(totalPaid)}</Text>
          </View>
          <View style={s.box}>
            <Text style={s.label}>Closing balance</Text>
            <Text style={[s.boxValue, { color: balColor(closingBalance) }]}>{balanceText(closingBalance)}</Text>
          </View>
        </View>

        <View style={s.table}>
          <View style={s.th} fixed>
            <Text style={s.cDate}>DATE</Text>
            <Text style={s.cPart}>PARTICULARS</Text>
            <Text style={s.cNum}>BILL (DR)</Text>
            <Text style={s.cNum}>PAID (CR)</Text>
            <Text style={s.cNum}>BALANCE</Text>
          </View>
          {showOpening ? (
            <View style={s.tr}>
              <Text style={s.cDate}>{formatDate(from)}</Text>
              <Text style={[s.cPart, s.muted]}>Opening balance (brought forward)</Text>
              <Text style={s.cNum} />
              <Text style={s.cNum} />
              <Text style={[s.cNum, { color: balColor(openingBalance) }]}>{balanceText(openingBalance)}</Text>
            </View>
          ) : null}
          {entries.length === 0 && !showOpening ? (
            <View style={s.tr}>
              <Text style={[s.cPart, s.muted, { width: "100%", textAlign: "center" }]}>No bills or payments yet.</Text>
            </View>
          ) : null}
          {entries.map((e) => (
            <View key={e.id} style={s.tr} wrap={false}>
              <Text style={s.cDate}>{formatDate(e.date)}</Text>
              <View style={s.cPart}>
                <Particulars e={e} />
              </View>
              <Text style={s.cNum}>{e.kind === "bill" ? rs(e.debit) : ""}</Text>
              <Text style={[s.cNum, { color: c.green }]}>{e.kind === "payment" ? rs(e.credit) : ""}</Text>
              <Text style={[s.cNum, s.bold, { color: balColor(e.balance) }]}>{balanceText(e.balance)}</Text>
            </View>
          ))}
          <View style={s.tfoot} wrap={false}>
            <Text style={[s.cDate, { width: "55%" }]}>Totals & closing balance</Text>
            <Text style={s.cNum}>{rs(totalBilled)}</Text>
            <Text style={[s.cNum, { color: c.green }]}>{rs(totalPaid)}</Text>
            <Text style={[s.cNum, { color: balColor(closingBalance) }]}>{balanceText(closingBalance)}</Text>
          </View>
        </View>

        <Text style={[s.small, { marginTop: 8 }]}>
          Due = amount you owe the shop. Adv = advance paid to the shop. Cancelled bills are not included.
        </Text>

        <Text
          style={s.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `${shopName}${business?.phone ? ` · ${business.phone}` : ""} · Page ${pageNumber} of ${totalPages}`
          }
        />
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(doc);
  const safeName = customer.name.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "Customer";
  return { buffer, filename: `Statement_${safeName}.pdf` };
}
