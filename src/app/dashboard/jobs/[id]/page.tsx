import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { jobs, jobStatusHistory, media, users, invoices, parts, jobParts } from "@/db/schema";
import { eq, desc, asc, and } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { jobStatusColors, jobStatusLabels } from "@/lib/status";
import { StatusUpdateForm } from "@/components/jobs/status-update-form";
import { MediaUploadForm } from "@/components/jobs/media-upload";
import { MediaGallery } from "@/components/jobs/media-gallery";
import { JobPartsSection } from "@/components/jobs/job-parts-section";
import { ClearInvoiceButton } from "@/components/customers/clear-invoice-button";
import {
  CheckCircle2,
  Pencil,
  Phone,
  Receipt,
  Smartphone,
  User as UserIcon,
} from "lucide-react";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const jobId = Number(id);
  if (!Number.isFinite(jobId)) notFound();

  const job = await db.query.jobs.findFirst({
    where: eq(jobs.id, jobId),
    with: { customer: true },
  });
  if (!job) notFound();

  const [history, mediaItems, assignee, jobInvoices] = await Promise.all([
    db
      .select({ h: jobStatusHistory, changedByName: users.name })
      .from(jobStatusHistory)
      .leftJoin(users, eq(jobStatusHistory.changedBy, users.id))
      .where(eq(jobStatusHistory.jobId, jobId))
      .orderBy(desc(jobStatusHistory.changedAt)),
    db.select().from(media).where(eq(media.jobId, jobId)).orderBy(desc(media.uploadedAt)),
    job.assignedTo
      ? db.query.users.findFirst({ where: eq(users.id, job.assignedTo) })
      : Promise.resolve(undefined),
    db.select().from(invoices).where(eq(invoices.jobId, jobId)),
  ]);

  const [availableParts, partUsages] = await Promise.all([
    db
      .select({
        id: parts.id,
        name: parts.name,
        sku: parts.sku,
        quantityInStock: parts.quantityInStock,
        sellingPrice: parts.sellingPrice,
      })
      .from(parts)
      .where(and(eq(parts.active, 1)))
      .orderBy(asc(parts.name)),
    db
      .select({ usage: jobParts, partName: parts.name })
      .from(jobParts)
      .innerJoin(parts, eq(jobParts.partId, parts.id))
      .where(eq(jobParts.jobId, jobId))
      .orderBy(desc(jobParts.usedAt)),
  ]);

  const jobInvoice = jobInvoices[0];
  const due = jobInvoice ? Number(jobInvoice.total) - Number(jobInvoice.amountPaid) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{job.jobNumber}</h1>
            <Badge variant="outline" className={jobStatusColors[job.status]}>
              {jobStatusLabels[job.status]}
            </Badge>
            {job.priority !== "normal" && (
              <Badge variant="outline" className="capitalize">
                {job.priority} priority
              </Badge>
            )}
            {jobInvoice && jobInvoice.status !== "cancelled" && (
              due <= 0 ? (
                <Badge variant="outline" className="flex items-center gap-1 bg-emerald-100 text-emerald-700 border-emerald-200">
                  <CheckCircle2 className="h-3 w-3" /> No Udhar
                </Badge>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className={
                      Number(jobInvoice.amountPaid) > 0
                        ? "bg-amber-100 text-amber-700 border-amber-200"
                        : "bg-red-100 text-red-700 border-red-200"
                    }
                  >
                    {Number(jobInvoice.amountPaid) > 0
                      ? `Partial — ${formatCurrency(due)} due`
                      : `Udhar ${formatCurrency(due)}`}
                  </Badge>
                  <ClearInvoiceButton invoiceId={jobInvoice.id} />
                </div>
              )
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Received {formatDateTime(job.createdAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/jobs/${job.id}/edit`}>
              <Pencil className="h-4 w-4" /> Edit
            </Link>
          </Button>
          {jobInvoices.length === 0 ? (
            <Button asChild size="sm">
              <Link href={`/dashboard/invoices/new?jobId=${job.id}`}>
                <Receipt className="h-4 w-4" /> Create Invoice
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm" variant="secondary">
              <Link href={`/dashboard/invoices/${jobInvoices[0].id}`}>
                <Receipt className="h-4 w-4" /> View Invoice
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Smartphone className="h-4 w-4" /> Device & Issue
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-muted-foreground">Device</div>
                  <div className="font-medium">
                    {job.brand} {job.model} ({job.deviceType})
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Serial / IMEI</div>
                  <div className="font-medium">{job.serialNumber || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Accessories</div>
                  <div className="font-medium">{job.accessories || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Promised Delivery</div>
                  <div className="font-medium">{formatDate(job.promisedAt)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Estimated Cost</div>
                  <div className="font-medium">
                    {job.estimatedCost ? formatCurrency(job.estimatedCost) : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Assigned Technician</div>
                  <div className="font-medium">{assignee?.name || "Unassigned"}</div>
                </div>
              </div>
              <Separator />
              <div>
                <div className="text-xs text-muted-foreground">Issue Description</div>
                <p className="mt-1 whitespace-pre-wrap">{job.issueDescription}</p>
              </div>
              {job.notes && (
                <div>
                  <div className="text-xs text-muted-foreground">Internal Notes</div>
                  <p className="mt-1 whitespace-pre-wrap">{job.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Parts Used</CardTitle>
            </CardHeader>
            <CardContent>
              <JobPartsSection
                jobId={job.id}
                parts={availableParts}
                usages={partUsages.map(({ usage, partName }) => ({
                  id: usage.id,
                  partId: usage.partId,
                  partName,
                  quantity: usage.quantity,
                  unitCostAtUse: usage.unitCostAtUse,
                  unitPriceAtUse: usage.unitPriceAtUse,
                  usedAt: usage.usedAt,
                }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Media & Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <MediaUploadForm jobId={job.id} />
              <MediaGallery items={mediaItems} jobId={job.id} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserIcon className="h-4 w-4" /> Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Link href={`/dashboard/customers/${job.customer.id}`} className="font-medium hover:underline">
                {job.customer.name}
              </Link>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" /> {job.customer.phone}
              </div>
              {job.customer.gstin && <Badge variant="outline">{job.customer.gstin}</Badge>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Update Status</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusUpdateForm jobId={job.id} currentStatus={job.status} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status History</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4 border-l pl-4">
                {history.map(({ h, changedByName }) => (
                  <li key={h.id} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                    <div className="text-sm font-medium">{jobStatusLabels[h.status]}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(h.changedAt)}
                      {changedByName ? ` · ${changedByName}` : ""}
                    </div>
                    {h.note && <p className="mt-1 text-sm">{h.note}</p>}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
