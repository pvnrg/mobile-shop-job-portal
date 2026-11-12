import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentForm } from "@/components/payments/payment-form";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCustomerOption } from "@/lib/customer-option";

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; invoiceId?: string }>;
}) {
  const { customerId, invoiceId } = await searchParams;

  const defaultCustomer = await getCustomerOption(customerId ? Number(customerId) : null);

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
            defaultCustomer={defaultCustomer}
            defaultInvoiceId={invoiceId ? Number(invoiceId) : undefined}
            suggestedAmount={suggestedAmount}
          />
        </CardContent>
      </Card>
    </div>
  );
}
