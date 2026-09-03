import Link from "next/link";
import { db } from "@/db";
import { jobs, jobDevices, invoices, payments, jobParts, users } from "@/db/schema";
import { and, eq, gte, lte, sql, ne } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart } from "@/components/reports/bar-chart";
import { formatCurrency } from "@/lib/format";
import { resolveDateRange, toDateInputValue } from "@/lib/date-range";
import { jobStatusColors, jobStatusLabels, jobStatuses } from "@/lib/status";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const { start, end } = resolveDateRange(from, to);

  const [
    invoiceTotals,
    paymentTotal,
    paymentsByDay,
    deliveredCount,
    jobsByStatus,
    topDevices,
    technicianStats,
    partsStats,
    outstanding,
  ] = await Promise.all([
    db
      .select({
        subtotal: sql<string>`coalesce(sum(${invoices.subtotal}), 0)`,
        cgst: sql<string>`coalesce(sum(${invoices.cgstAmount}), 0)`,
        sgst: sql<string>`coalesce(sum(${invoices.sgstAmount}), 0)`,
        igst: sql<string>`coalesce(sum(${invoices.igstAmount}), 0)`,
        total: sql<string>`coalesce(sum(${invoices.total}), 0)`,
        count: sql<number>`count(*)::int`,
      })
      .from(invoices)
      .where(
        and(
          gte(invoices.issuedAt, start),
          lte(invoices.issuedAt, end),
          ne(invoices.status, "cancelled")
        )
      ),
    db
      .select({ total: sql<string>`coalesce(sum(${payments.amount}), 0)` })
      .from(payments)
      .where(and(gte(payments.paidAt, start), lte(payments.paidAt, end))),
    db
      .select({
        day: sql<string>`to_char(${payments.paidAt}, 'DD Mon')`,
        total: sql<string>`sum(${payments.amount})`,
      })
      .from(payments)
      .where(and(gte(payments.paidAt, start), lte(payments.paidAt, end)))
      .groupBy(sql`to_char(${payments.paidAt}, 'DD Mon'), date_trunc('day', ${payments.paidAt})`)
      .orderBy(sql`date_trunc('day', ${payments.paidAt})`),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(jobDevices)
      .where(and(gte(jobDevices.deliveredAt, start), lte(jobDevices.deliveredAt, end))),
    db
      .select({ status: jobDevices.status, count: sql<number>`count(*)::int` })
      .from(jobDevices)
      .groupBy(jobDevices.status),
    db
      .select({
        brand: jobDevices.brand,
        deviceType: jobDevices.deviceType,
        count: sql<number>`count(*)::int`,
      })
      .from(jobDevices)
      .where(and(gte(jobDevices.createdAt, start), lte(jobDevices.createdAt, end)))
      .groupBy(jobDevices.brand, jobDevices.deviceType)
      .orderBy(sql`count(*) desc`)
      .limit(8),
    db
      .select({
        technicianId: jobs.assignedTo,
        technicianName: users.name,
        count: sql<number>`count(*)::int`,
      })
      .from(jobDevices)
      .innerJoin(jobs, eq(jobDevices.jobId, jobs.id))
      .leftJoin(users, eq(jobs.assignedTo, users.id))
      .where(
        and(
          gte(jobDevices.deliveredAt, start),
          lte(jobDevices.deliveredAt, end),
          sql`${jobs.assignedTo} is not null`
        )
      )
      .groupBy(jobs.assignedTo, users.name)
      .orderBy(sql`count(*) desc`),
    db
      .select({
        costTotal: sql<string>`coalesce(sum(${jobParts.unitCostAtUse} * ${jobParts.quantity}), 0)`,
        revenueTotal: sql<string>`coalesce(sum(${jobParts.unitPriceAtUse} * ${jobParts.quantity}), 0)`,
        count: sql<number>`count(*)::int`,
      })
      .from(jobParts)
      .where(and(gte(jobParts.usedAt, start), lte(jobParts.usedAt, end))),
    db
      .select({ total: sql<string>`coalesce(sum(${invoices.total} - ${invoices.amountPaid}), 0)` })
      .from(invoices)
      .where(sql`${invoices.status} not in ('paid', 'cancelled', 'draft')`),
  ]);

  const inv = invoiceTotals[0];
  const partsProfit = Number(partsStats[0]?.revenueTotal ?? 0) - Number(partsStats[0]?.costTotal ?? 0);

  const statusCounts = new Map(jobsByStatus.map((r) => [r.status, r.count]));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Revenue, GST, and shop performance for a date range
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="from" className="text-xs">
                From
              </Label>
              <Input id="from" name="from" type="date" defaultValue={toDateInputValue(start)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="to" className="text-xs">
                To
              </Label>
              <Input id="to" name="to" type="date" defaultValue={toDateInputValue(end)} />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              Apply
            </Button>
            <div className="flex gap-2 pb-0.5">
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/reports">This Month</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link
                  href={`/dashboard/reports?from=${toDateInputValue(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1))}&to=${toDateInputValue(new Date(new Date().getFullYear(), new Date().getMonth(), 0))}`}
                >
                  Last Month
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link
                  href={`/dashboard/reports?from=${toDateInputValue(new Date(new Date().getFullYear(), 0, 1))}&to=${toDateInputValue(new Date(new Date().getFullYear(), 11, 31))}`}
                >
                  This Year
                </Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Invoiced</div>
            <div className="text-2xl font-semibold">{formatCurrency(inv?.total ?? "0")}</div>
            <div className="text-xs text-muted-foreground">{inv?.count ?? 0} invoices</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Collected</div>
            <div className="text-2xl font-semibold text-emerald-600">
              {formatCurrency(paymentTotal[0]?.total ?? "0")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Jobs Delivered</div>
            <div className="text-2xl font-semibold">{deliveredCount[0]?.count ?? 0}</div>
          </CardContent>
        </Card>
        <Card className={Number(outstanding[0]?.total ?? 0) > 0 ? "border-red-200" : undefined}>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Current Outstanding Udhar</div>
            <div className="text-2xl font-semibold text-red-600">
              {formatCurrency(outstanding[0]?.total ?? "0")}
            </div>
            <div className="text-xs text-muted-foreground">All-time, not period-limited</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">GST Summary</CardTitle>
          <CardDescription>For invoices issued in this period — useful for filing returns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <div className="text-xs text-muted-foreground">Taxable Value</div>
              <div className="text-lg font-medium">{formatCurrency(inv?.subtotal ?? "0")}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">CGST</div>
              <div className="text-lg font-medium">{formatCurrency(inv?.cgst ?? "0")}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">SGST</div>
              <div className="text-lg font-medium">{formatCurrency(inv?.sgst ?? "0")}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">IGST</div>
              <div className="text-lg font-medium">{formatCurrency(inv?.igst ?? "0")}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Collections by Day</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart
            data={paymentsByDay.map((r) => ({ label: r.day, value: Number(r.total) }))}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current Job Pipeline</CardTitle>
            <CardDescription>All jobs by status, right now</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {jobStatuses.map((s) => {
              const count = statusCounts.get(s) ?? 0;
              return (
                <div key={s} className="flex items-center justify-between text-sm">
                  <Badge variant="outline" className={jobStatusColors[s]}>
                    {jobStatusLabels[s]}
                  </Badge>
                  <span className="font-medium">{count}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Devices Repaired</CardTitle>
            <CardDescription>Devices received in this period</CardDescription>
          </CardHeader>
          <CardContent>
            {topDevices.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No jobs in this period.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Brand</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Jobs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topDevices.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell>{d.brand || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{d.deviceType}</TableCell>
                      <TableCell className="text-right font-medium">{d.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Technician Performance</CardTitle>
            <CardDescription>Jobs delivered in this period</CardDescription>
          </CardHeader>
          <CardContent>
            {technicianStats.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No deliveries in this period.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Technician</TableHead>
                    <TableHead className="text-right">Jobs Delivered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {technicianStats.map((t) => (
                    <TableRow key={t.technicianId}>
                      <TableCell>{t.technicianName || "Unassigned"}</TableCell>
                      <TableCell className="text-right font-medium">{t.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parts Profitability</CardTitle>
            <CardDescription>Parts used on jobs in this period</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Parts Revenue</span>
              <span className="font-medium">{formatCurrency(partsStats[0]?.revenueTotal ?? "0")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Parts Cost</span>
              <span className="font-medium">{formatCurrency(partsStats[0]?.costTotal ?? "0")}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-medium">
              <span>Gross Margin</span>
              <span className={partsProfit >= 0 ? "text-emerald-600" : "text-red-600"}>
                {formatCurrency(partsProfit)}
              </span>
            </div>
            <p className="pt-1 text-xs text-muted-foreground">
              {partsStats[0]?.count ?? 0} part line items used
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
