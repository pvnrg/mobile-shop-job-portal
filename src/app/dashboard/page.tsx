import Link from "next/link";
import { db } from "@/db";
import { jobs, invoices, payments, customers } from "@/db/schema";
import { desc, eq, gte, sql, ne } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { jobStatusColors, jobStatusLabels } from "@/lib/status";
import { Users, Wrench, IndianRupee, AlertCircle, Plus } from "lucide-react";

export default async function DashboardPage() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    activeJobsCount,
    totalCustomers,
    monthPayments,
    outstandingInvoices,
    recentJobs,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(jobs)
      .where(ne(jobs.status, "delivered")),
    db.select({ count: sql<number>`count(*)::int` }).from(customers),
    db
      .select({ total: sql<string>`coalesce(sum(${payments.amount}), 0)` })
      .from(payments)
      .where(gte(payments.paidAt, startOfMonth)),
    db
      .select({ total: sql<string>`coalesce(sum(${invoices.total} - ${invoices.amountPaid}), 0)` })
      .from(invoices)
      .where(sql`${invoices.status} NOT IN ('paid', 'cancelled', 'draft')`),
    db
      .select({ job: jobs, customerName: customers.name })
      .from(jobs)
      .innerJoin(customers, eq(jobs.customerId, customers.id))
      .orderBy(desc(jobs.createdAt))
      .limit(6),
  ]);

  const stats = [
    {
      label: "Active Jobs",
      value: String(activeJobsCount[0]?.count ?? 0),
      icon: Wrench,
      href: "/dashboard/jobs",
    },
    {
      label: "Total Customers",
      value: String(totalCustomers[0]?.count ?? 0),
      icon: Users,
      href: "/dashboard/customers",
    },
    {
      label: "Collected This Month",
      value: formatCurrency(monthPayments[0]?.total ?? "0"),
      icon: IndianRupee,
      href: "/dashboard/payments",
    },
    {
      label: "Outstanding Udhar",
      value: formatCurrency(outstandingInvoices[0]?.total ?? "0"),
      icon: AlertCircle,
      href: "/dashboard/invoices",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your repair shop</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/jobs/new">
            <Plus className="h-4 w-4" /> New Job
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href}>
              <Card className="transition-colors hover:bg-muted/40">
                <CardContent className="flex items-center justify-between pt-6">
                  <div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                    <div className="text-2xl font-semibold">{stat.value}</div>
                  </div>
                  <Icon className="h-8 w-8 text-muted-foreground/40" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Jobs</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/jobs">View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentJobs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No jobs yet.{" "}
              <Link href="/dashboard/jobs/new" className="underline">
                Create your first job
              </Link>
            </p>
          ) : (
            recentJobs.map(({ job, customerName }) => (
              <Link
                key={job.id}
                href={`/dashboard/jobs/${job.id}`}
                className="flex items-center justify-between rounded-lg border p-3 text-sm transition-colors hover:bg-muted/40"
              >
                <div>
                  <div className="font-medium">{job.jobNumber}</div>
                  <div className="text-muted-foreground">
                    {customerName} · {job.brand} {job.model}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="hidden text-muted-foreground sm:inline">
                    {formatDate(job.createdAt)}
                  </span>
                  <Badge variant="outline" className={jobStatusColors[job.status]}>
                    {jobStatusLabels[job.status]}
                  </Badge>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
