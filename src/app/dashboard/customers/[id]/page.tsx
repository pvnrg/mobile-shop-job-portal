import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { customers, jobs, payments, invoices } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { jobStatusColors, jobStatusLabels } from "@/lib/status";
import { ClearAccountButton } from "@/components/customers/clear-account-button";
import { ClearInvoiceButton } from "@/components/customers/clear-invoice-button";
import { SendOutstandingReminderButton } from "@/components/customers/send-outstanding-reminder-button";
import { CheckCircle2, Mail, MapPin, Pencil, Phone, Plus } from "lucide-react";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customerId = Number(id);
  if (!Number.isFinite(customerId)) notFound();

  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, customerId),
  });
  if (!customer) notFound();

  const [customerJobs, customerPayments, customerInvoices] = await Promise.all([
    db.query.jobs.findMany({
      where: eq(jobs.customerId, customerId),
      with: { devices: { orderBy: (jobDevices, { asc }) => [asc(jobDevices.id)] } },
      orderBy: (jobs, { desc }) => [desc(jobs.createdAt)],
    }),
    db
      .select()
      .from(payments)
      .where(eq(payments.customerId, customerId))
      .orderBy(desc(payments.paidAt)),
    db
      .select()
      .from(invoices)
      .where(eq(invoices.customerId, customerId))
      .orderBy(desc(invoices.createdAt)),
  ]);

  const totalInvoiced = customerInvoices.reduce((sum, i) => sum + Number(i.total), 0);
  const totalPaid = customerPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalUdhar = customerInvoices.reduce((sum, i) => {
    if (i.status === "cancelled") return sum;
    const due = Number(i.total) - Number(i.amountPaid);
    return sum + Math.max(0, due);
  }, 0);

  const invoiceByJobId = new Map(
    customerInvoices.filter((i) => i.jobId !== null).map((i) => [i.jobId as number, i])
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{customer.name}</h1>
            {customer.gstin && <Badge variant="outline">{customer.gstin}</Badge>}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" /> {customer.phone}
            </span>
            {customer.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> {customer.email}
              </span>
            )}
            {customer.address && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {customer.address}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/customers/${customer.id}/edit`}>
              <Pencil className="h-4 w-4" /> Edit
            </Link>
          </Button>
          <SendOutstandingReminderButton customerId={customer.id} totalUdhar={totalUdhar} />
          <ClearAccountButton customerId={customer.id} totalUdhar={totalUdhar} />
          <Button asChild size="sm">
            <Link href={`/dashboard/jobs/new?customerId=${customer.id}`}>
              <Plus className="h-4 w-4" /> New Job
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Invoiced
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCurrency(totalInvoiced)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-emerald-600">
            {formatCurrency(totalPaid)}
          </CardContent>
        </Card>
        <Card className={totalUdhar > 0 ? "border-red-200" : "border-emerald-200"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Udhar (Outstanding)
            </CardTitle>
          </CardHeader>
          <CardContent
            className={`flex items-center gap-2 text-2xl font-semibold ${totalUdhar > 0 ? "text-red-600" : "text-emerald-600"}`}
          >
            {totalUdhar > 0 ? (
              formatCurrency(totalUdhar)
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-base font-medium">No Udhar — Account Clear</span>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Repair Jobs ({customerJobs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {customerJobs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No jobs yet for this customer.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job #</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="hidden sm:table-cell">Received</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerJobs.map((job) => {
                    const invoice = invoiceByJobId.get(job.id);
                    const due = invoice ? Number(invoice.total) - Number(invoice.amountPaid) : 0;
                    const first = job.devices[0];

                    return (
                      <TableRow key={job.id}>
                        <TableCell>
                          <Link
                            href={`/dashboard/jobs/${job.id}`}
                            className="font-medium hover:underline"
                          >
                            {job.jobNumber}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {first ? (
                            <>
                              {first.brand} {first.model}
                              <div className="text-xs text-muted-foreground">
                                {first.deviceType}
                                {job.devices.length > 1 ? ` +${job.devices.length - 1} more` : ""}
                              </div>
                            </>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {job.devices.map((d) => (
                              <Badge key={d.id} variant="outline" className={jobStatusColors[d.status]}>
                                {jobStatusLabels[d.status]}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {!invoice ? (
                            <span className="text-xs text-muted-foreground">Not invoiced</span>
                          ) : invoice.status === "cancelled" ? (
                            <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200">
                              Cancelled
                            </Badge>
                          ) : due <= 0 ? (
                            <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                              No Udhar
                            </Badge>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant="outline"
                                className={
                                  Number(invoice.amountPaid) > 0
                                    ? "bg-amber-100 text-amber-700 border-amber-200"
                                    : "bg-red-100 text-red-700 border-red-200"
                                }
                              >
                                {Number(invoice.amountPaid) > 0
                                  ? `Partial — ${formatCurrency(due)} due`
                                  : `Udhar ${formatCurrency(due)}`}
                              </Badge>
                              <ClearInvoiceButton invoiceId={invoice.id} />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {formatDate(job.createdAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment History ({customerPayments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {customerPayments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No payments recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden sm:table-cell">Method</TableHead>
                    <TableHead className="hidden md:table-cell">Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerPayments.map((p) => {
                    const invoice = p.invoiceId
                      ? customerInvoices.find((i) => i.id === p.invoiceId)
                      : undefined;
                    const isFullSettlement =
                      invoice && Number(invoice.amountPaid) >= Number(invoice.total);

                    return (
                      <TableRow key={p.id}>
                        <TableCell>{formatDate(p.paidAt)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(p.amount)}</TableCell>
                        <TableCell>
                          {!invoice ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : isFullSettlement ? (
                            <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                              Full Payment
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
                              Portion Payment
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell capitalize">
                          {p.method.replace("_", " ")}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {p.reference || "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
