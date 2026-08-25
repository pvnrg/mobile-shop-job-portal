import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { parts, partStockAdjustments, jobParts, jobs, users } from "@/db/schema";
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
import { formatCurrency, formatDateTime } from "@/lib/format";
import { AdjustStockDialog } from "@/components/inventory/adjust-stock-dialog";
import { toggleActivePartAction } from "@/lib/actions/parts";
import { Pencil } from "lucide-react";

export default async function PartDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const partId = Number(id);
  if (!Number.isFinite(partId)) notFound();

  const part = await db.query.parts.findFirst({ where: eq(parts.id, partId) });
  if (!part) notFound();

  const [adjustments, usages] = await Promise.all([
    db
      .select({ adj: partStockAdjustments, changedByName: users.name })
      .from(partStockAdjustments)
      .leftJoin(users, eq(partStockAdjustments.recordedBy, users.id))
      .where(eq(partStockAdjustments.partId, partId))
      .orderBy(desc(partStockAdjustments.createdAt))
      .limit(50),
    db
      .select({ usage: jobParts, jobNumber: jobs.jobNumber, jobId: jobs.id })
      .from(jobParts)
      .innerJoin(jobs, eq(jobParts.jobId, jobs.id))
      .where(eq(jobParts.partId, partId))
      .orderBy(desc(jobParts.usedAt))
      .limit(50),
  ]);

  const isLow = part.quantityInStock <= part.lowStockThreshold;
  const toggleAction = toggleActivePartAction.bind(null, partId, part.active !== 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{part.name}</h1>
            <Badge
              variant="outline"
              className={
                isLow
                  ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30"
                  : "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30"
              }
            >
              {part.quantityInStock} in stock
            </Badge>
            {part.active !== 1 && <Badge variant="outline">Inactive</Badge>}
          </div>
          {part.sku && <p className="text-sm text-muted-foreground">SKU: {part.sku}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/inventory/${part.id}/edit`}>
              <Pencil className="h-4 w-4" /> Edit
            </Link>
          </Button>
          <AdjustStockDialog partId={part.id} currentStock={part.quantityInStock} />
          <form action={toggleAction}>
            <Button type="submit" size="sm" variant="outline">
              {part.active === 1 ? "Deactivate" : "Activate"}
            </Button>
          </form>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Category</div>
            <div className="font-medium">{part.category || "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Unit Cost</div>
            <div className="font-medium">{formatCurrency(part.unitCost)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Selling Price</div>
            <div className="font-medium">{formatCurrency(part.sellingPrice)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Low Stock Threshold</div>
            <div className="font-medium">{part.lowStockThreshold}</div>
          </CardContent>
        </Card>
      </div>

      {part.notes && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Notes</div>
            <p className="mt-1 whitespace-pre-wrap text-sm">{part.notes}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Used In Jobs ({usages.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {usages.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              This part hasn&apos;t been used on any job yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead className="hidden sm:table-cell">Cost at Use</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usages.map(({ usage, jobNumber, jobId }) => (
                    <TableRow key={usage.id}>
                      <TableCell>
                        <Link href={`/dashboard/jobs/${jobId}`} className="font-medium hover:underline">
                          {jobNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{usage.quantity}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {formatCurrency(Number(usage.unitCostAtUse) * usage.quantity)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {formatDateTime(usage.usedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stock Adjustment History ({adjustments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {adjustments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No manual stock adjustments yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Change</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="hidden sm:table-cell">By</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adjustments.map(({ adj, changedByName }) => (
                    <TableRow key={adj.id}>
                      <TableCell
                        className={adj.changeQuantity > 0 ? "text-emerald-600" : "text-red-600"}
                      >
                        {adj.changeQuantity > 0 ? `+${adj.changeQuantity}` : adj.changeQuantity}
                      </TableCell>
                      <TableCell>
                        {adj.reason}
                        {adj.note && (
                          <div className="text-xs text-muted-foreground">{adj.note}</div>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {changedByName || "—"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {formatDateTime(adj.createdAt)}
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
