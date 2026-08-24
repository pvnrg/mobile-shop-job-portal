import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { invoices, invoiceItems, payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { invoiceStatusColors, invoiceStatusLabels } from "@/lib/status";
import { PrintButton } from "@/components/invoices/print-button";
import { SendWhatsappButton } from "@/components/invoices/send-whatsapp-button";
import { CreditCard, XCircle } from "lucide-react";
import { cancelInvoiceAction } from "@/lib/actions/invoices";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoiceId = Number(id);
  if (!Number.isFinite(invoiceId)) notFound();

  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
    with: { customer: true },
  });
  if (!invoice) notFound();

  const [items, invoicePayments, settings] = await Promise.all([
    db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId)),
    db.select().from(payments).where(eq(payments.invoiceId, invoiceId)),
    db.query.businessSettings.findFirst(),
  ]);

  const balanceDue = Number(invoice.total) - Number(invoice.amountPaid);
  const cancelAction = cancelInvoiceAction.bind(null, invoiceId);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{invoice.invoiceNumber}</h1>
          <Badge variant="outline" className={invoiceStatusColors[invoice.status]}>
            {invoiceStatusLabels[invoice.status]}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <PrintButton />
          {invoice.status !== "cancelled" && <SendWhatsappButton invoiceId={invoice.id} />}
          {balanceDue > 0 && invoice.status !== "cancelled" && (
            <Button asChild size="sm">
              <Link
                href={`/dashboard/payments/new?invoiceId=${invoice.id}&customerId=${invoice.customerId}`}
              >
                <CreditCard className="h-4 w-4" /> Record Payment
              </Link>
            </Button>
          )}
          {invoice.status !== "cancelled" && invoice.status !== "paid" && (
            <form action={cancelAction}>
              <Button type="submit" size="sm" variant="destructive">
                <XCircle className="h-4 w-4" /> Cancel
              </Button>
            </form>
          )}
        </div>
      </div>

      <Card className="print:border-none print:shadow-none">
        <CardContent className="space-y-6 pt-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row">
            <div className="flex items-start gap-3">
              {settings?.logoPath && (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-background">
                  <Image
                    src={settings.logoPath}
                    alt=""
                    width={48}
                    height={48}
                    className="h-full w-full object-contain"
                    unoptimized
                  />
                </div>
              )}
              <div>
                <h2 className="text-lg font-semibold">{settings?.businessName ?? "Mobile Repair Shop"}</h2>
                {settings?.address && (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{settings.address}</p>
                )}
                {settings?.gstin && <p className="text-sm">GSTIN: {settings.gstin}</p>}
                {settings?.phone && <p className="text-sm text-muted-foreground">{settings.phone}</p>}
              </div>
            </div>
            <div className="sm:text-right">
              <div className="text-sm text-muted-foreground">Invoice #</div>
              <div className="font-medium">{invoice.invoiceNumber}</div>
              <div className="mt-2 text-sm text-muted-foreground">Issued</div>
              <div className="font-medium">{formatDate(invoice.issuedAt)}</div>
              {invoice.dueAt && (
                <>
                  <div className="mt-2 text-sm text-muted-foreground">Due</div>
                  <div className="font-medium">{formatDate(invoice.dueAt)}</div>
                </>
              )}
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-sm text-muted-foreground">Bill To</div>
              <div className="font-medium">{invoice.customer.name}</div>
              <div className="text-sm">{invoice.customer.phone}</div>
              {invoice.customer.address && (
                <div className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {invoice.customer.address}
                </div>
              )}
              {invoice.customer.gstin && <div className="text-sm">GSTIN: {invoice.customer.gstin}</div>}
            </div>
            {invoice.placeOfSupply && (
              <div className="sm:text-right">
                <div className="text-sm text-muted-foreground">Place of Supply</div>
                <div className="font-medium">{invoice.placeOfSupply}</div>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="hidden sm:table-cell">HSN/SAC</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Tax %</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {item.hsnSac || "—"}
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="text-right">{item.taxRatePercent}%</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-1 text-sm sm:max-w-xs sm:ml-auto">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span>- {formatCurrency(invoice.discount)}</span>
            </div>
            {Number(invoice.cgstAmount) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">CGST</span>
                <span>{formatCurrency(invoice.cgstAmount)}</span>
              </div>
            )}
            {Number(invoice.sgstAmount) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">SGST</span>
                <span>{formatCurrency(invoice.sgstAmount)}</span>
              </div>
            )}
            {Number(invoice.igstAmount) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">IGST</span>
                <span>{formatCurrency(invoice.igstAmount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1 text-base font-semibold">
              <span>Total</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
            <div className="flex justify-between text-emerald-600">
              <span>Paid</span>
              <span>{formatCurrency(invoice.amountPaid)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Balance Due</span>
              <span className={balanceDue > 0 ? "text-red-600" : ""}>
                {formatCurrency(balanceDue)}
              </span>
            </div>
          </div>

          {invoice.notes && (
            <div>
              <div className="text-sm text-muted-foreground">Notes</div>
              <p className="whitespace-pre-wrap text-sm">{invoice.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {invoicePayments.length > 0 && (
        <Card className="print:hidden">
          <CardContent className="pt-6">
            <h3 className="mb-3 text-sm font-medium">Payment History</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="hidden sm:table-cell">Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoicePayments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.paidAt)}</TableCell>
                    <TableCell>{formatCurrency(p.amount)}</TableCell>
                    <TableCell className="capitalize">{p.method.replace("_", " ")}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {p.reference || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
