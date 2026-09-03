import Link from "next/link";
import { db } from "@/db";
import { jobs, customers, jobDevices } from "@/db/schema";
import { desc, eq, and, ilike, or, sql, inArray, asc } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Wrench, X } from "lucide-react";
import { formatDate } from "@/lib/format";
import { jobStatusColors, jobStatusLabels, jobStatuses, type JobStatus } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { JobDevice } from "@/db/types";
import { CustomerCombobox } from "@/components/customers/customer-combobox";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; customerId?: string }>;
}) {
  const { q, status, customerId } = await searchParams;
  const statusFilter = jobStatuses.includes(status as JobStatus) ? (status as JobStatus) : undefined;
  const customerFilter = customerId ? Number(customerId) : undefined;

  const conditions = [
    statusFilter
      ? sql`exists (select 1 from job_devices jd where jd.job_id = ${jobs.id} and jd.status = ${statusFilter})`
      : undefined,
    customerFilter ? eq(jobs.customerId, customerFilter) : undefined,
    q
      ? or(
          ilike(jobs.jobNumber, `%${q}%`),
          ilike(customers.name, `%${q}%`),
          ilike(customers.phone, `%${q}%`),
          sql`exists (select 1 from job_devices jd where jd.job_id = ${jobs.id} and (jd.brand ilike ${`%${q}%`} or jd.model ilike ${`%${q}%`}))`
        )
      : undefined,
  ].filter(Boolean);

  const [rows, customerList] = await Promise.all([
    db
      .select({
        job: jobs,
        customerName: customers.name,
        customerPhone: customers.phone,
      })
      .from(jobs)
      .innerJoin(customers, eq(jobs.customerId, customers.id))
      .where(conditions.length ? and(...conditions) : sql`true`)
      .orderBy(desc(jobs.createdAt))
      .limit(200),
    db
      .select({ id: customers.id, name: customers.name, phone: customers.phone })
      .from(customers)
      .orderBy(asc(customers.name)),
  ]);

  const jobIds = rows.map((r) => r.job.id);
  const devicesForJobs =
    jobIds.length > 0
      ? await db
          .select()
          .from(jobDevices)
          .where(inArray(jobDevices.jobId, jobIds))
          .orderBy(asc(jobDevices.id))
      : [];
  const devicesByJob = new Map<number, JobDevice[]>();
  for (const d of devicesForJobs) {
    if (!devicesByJob.has(d.jobId)) devicesByJob.set(d.jobId, []);
    devicesByJob.get(d.jobId)!.push(d);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Repair Jobs</h1>
          <p className="text-sm text-muted-foreground">
            Track every mobile repair job from intake to delivery
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/jobs/new">
            <Plus className="h-4 w-4" />
            New Job
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/jobs">
          <Badge
            variant="outline"
            className={cn("cursor-pointer px-3 py-1", !statusFilter && "bg-primary text-primary-foreground")}
          >
            All
          </Badge>
        </Link>
        {jobStatuses.map((s) => (
          <Link key={s} href={`/dashboard/jobs?status=${s}`}>
            <Badge
              variant="outline"
              className={cn(
                "cursor-pointer px-3 py-1",
                statusFilter === s ? jobStatusColors[s] : ""
              )}
            >
              {jobStatusLabels[s]}
            </Badge>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <form className="mb-4 flex flex-wrap gap-2">
            {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                name="q"
                placeholder="Search job #, device, customer..."
                defaultValue={q}
                className="pl-8"
              />
            </div>
            <div className="w-full sm:w-64">
              <CustomerCombobox customers={customerList} name="customerId" defaultValue={customerFilter} />
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
            {customerFilter && (
              <Button asChild type="button" variant="ghost" size="sm">
                <Link
                  href={`/dashboard/jobs${statusFilter ? `?status=${statusFilter}` : ""}`}
                >
                  <X className="h-4 w-4" /> Clear customer filter
                </Link>
              </Button>
            )}
          </form>

          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <Wrench className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No jobs found.</p>
              <Button asChild size="sm" variant="outline">
                <Link href="/dashboard/jobs/new">Create your first job</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Received</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ job, customerName, customerPhone }) => {
                    const devices = devicesByJob.get(job.id) ?? [];
                    const first = devices[0];
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
                          {customerName}
                          <div className="text-xs text-muted-foreground">{customerPhone}</div>
                        </TableCell>
                        <TableCell>
                          {first ? (
                            <>
                              {first.brand} {first.model}
                              <div className="text-xs text-muted-foreground">
                                {first.deviceType}
                                {devices.length > 1 ? ` +${devices.length - 1} more` : ""}
                              </div>
                            </>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {devices.map((d) => (
                              <Badge key={d.id} variant="outline" className={jobStatusColors[d.status]}>
                                {jobStatusLabels[d.status]}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
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
    </div>
  );
}
