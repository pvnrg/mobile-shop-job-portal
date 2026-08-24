import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentForm } from "@/components/payments/payment-form";
import { db } from "@/db";
import { customers, invoices } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; invoiceId?: string }>;
}) {
  const { customerId, invoiceId } = await searchParams;

  const customerList = await db
    .select({ id: customers.id, name: customers.name, phone: customers.phone })
    .from(customers)
    .orderBy(asc(customers.name));

  let suggestedAmount: number | undefined;
  if (invoiceId) {
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, Number(invoiceId)),
    });
    if (invoice) {
      suggestedAmount = Number(invoice.total) - Number(invoice.amountPaid);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Record Payment</h1>
        <p className="text-sm text-muted-foreground">Log a payment received from a customer</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentForm
            customers={customerList}
            defaultCustomerId={customerId ? Number(customerId) : undefined}
            defaultInvoiceId={invoiceId ? Number(invoiceId) : undefined}
            suggestedAmount={suggestedAmount}
          />
        </CardContent>
      </Card>
    </div>
  );
}
