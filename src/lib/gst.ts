export type GstLineItem = {
  quantity: number;
  unitPrice: number;
  taxRatePercent: number;
};

export type GstType = "intra" | "inter";

export function computeInvoiceTotals(
  items: GstLineItem[],
  discount: number,
  gstType: GstType
) {
  let subtotal = 0;
  let totalTax = 0;

  for (const item of items) {
    const amount = item.quantity * item.unitPrice;
    subtotal += amount;
    totalTax += (amount * item.taxRatePercent) / 100;
  }

  const cgst = gstType === "intra" ? totalTax / 2 : 0;
  const sgst = gstType === "intra" ? totalTax / 2 : 0;
  const igst = gstType === "inter" ? totalTax : 0;
  const total = Math.max(0, subtotal - discount) + cgst + sgst + igst;

  return {
    subtotal: round2(subtotal),
    cgst: round2(cgst),
    sgst: round2(sgst),
    igst: round2(igst),
    total: round2(total),
  };
}

export function round2(value: number) {
  return Math.round(value * 100) / 100;
}
