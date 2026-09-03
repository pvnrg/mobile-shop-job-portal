import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { createInvoiceAction } from "@/lib/actions/invoices";
import { db } from "@/db";
import { customers, jobs } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>;
}) {
  const { jobId } = await searchParams;

  const customerList = await db
    .select({ id: customers.id, name: customers.name, phone: customers.phone })
    .from(customers)
    .orderBy(asc(customers.name));

  let defaultCustomerId: number | undefined;
  let defaultItems: { description: string; hsnSac: string; quantity: number; unitPrice: number; taxRatePercent: number }[] | undefined;

  if (jobId) {
    const job = await db.query.jobs.findFirst({
      where: eq(jobs.id, Number(jobId)),
      with: { devices: { orderBy: (jobDevices, { asc }) => [asc(jobDevices.id)] } },
    });
    if (job && job.devices.length > 0) {
      defaultCustomerId = job.customerId;
      defaultItems = job.devices.map((device, index) => ({
        description: `Repair service — ${device.brand ?? ""} ${device.model ?? ""} (${job.jobNumber})`.trim(),
        hsnSac: "9987",
        quantity: 1,
        // estimatedCost is one total for the whole job — prefill the first
        // line item with it and leave the rest for the owner to redistribute.
        unitPrice: index === 0 && job.estimatedCost ? Number(job.estimatedCost) : 0,
        taxRatePercent: 18,
      }));
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New GST Invoice</h1>
        <p className="text-sm text-muted-foreground">
          Create a GST-compliant invoice for a customer
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoice Details</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceForm
            action={createInvoiceAction}
            customers={customerList}
            defaultCustomerId={defaultCustomerId}
            defaultJobId={jobId ? Number(jobId) : undefined}
            defaultItems={defaultItems}
          />
        </CardContent>
      </Card>
    </div>
  );
}
