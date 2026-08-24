import Link from "next/link";
import { db } from "@/db";
import { payments, customers, invoices } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, Plus } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { paymentMethodLabels } from "@/lib/status";

export default async function PaymentsPage() {
  const rows = await db
    .select({
      payment: payments,
      customerName: customers.name,
      invoiceNumber: invoices.invoiceNumber,
    })
    .from(payments)
    .innerJoin(customers, eq(payments.customerId, customers.id))
    .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
    .orderBy(desc(payments.paidAt))
    .limit(200);

  const totalCollected = rows.reduce((sum, r) => sum + Number(r.payment.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
          <p className="text-sm text-muted-foreground">
            Record and track customer payments
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/payments/new">
            <Plus className="h-4 w-4" />
            Record Payment
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="flex items-center justify-between pt-6">
          <div>
            <div className="text-sm text-muted-foreground">Total Collected</div>
            <div className="text-2xl font-semibold">{formatCurrency(totalCollected)}</div>
          </div>
          <CreditCard className="h-8 w-8 text-muted-foreground/40" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <CreditCard className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
              <Button asChild size="sm" variant="outline">
                <Link href="/dashboard/payments/new">Record your first payment</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="hidden sm:table-cell">Method</TableHead>
                    <TableHead className="hidden md:table-cell">Invoice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ payment, customerName, invoiceNumber }) => (
                    <TableRow key={payment.id}>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(payment.paidAt)}
                      </TableCell>
                      <TableCell>{customerName}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {paymentMethodLabels[payment.method]}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {invoiceNumber ? (
                          <Link
                            href={`/dashboard/invoices`}
                            className="text-muted-foreground hover:underline"
                          >
                            {invoiceNumber}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
