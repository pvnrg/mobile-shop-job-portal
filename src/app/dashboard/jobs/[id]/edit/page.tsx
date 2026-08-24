import { notFound } from "next/navigation";
import { db } from "@/db";
import { jobs, customers, users } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JobForm } from "@/components/jobs/job-form";
import { updateJobDetailsAction } from "@/lib/actions/jobs";
import { getDeviceMasterData } from "@/lib/device-master";

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const jobId = Number(id);
  if (!Number.isFinite(jobId)) notFound();

  const job = await db.query.jobs.findFirst({ where: eq(jobs.id, jobId) });
  if (!job) notFound();

  const [customerList, technicians, deviceMasterData] = await Promise.all([
    db
      .select({ id: customers.id, name: customers.name, phone: customers.phone })
      .from(customers)
      .orderBy(asc(customers.name)),
    db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.active, 1))
      .orderBy(asc(users.name)),
    getDeviceMasterData(),
  ]);

  const action = updateJobDetailsAction.bind(null, jobId);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Job {job.jobNumber}</h1>
        <p className="text-sm text-muted-foreground">Update device and job details</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Job Details</CardTitle>
        </CardHeader>
        <CardContent>
          <JobForm
            action={action}
            customers={customerList}
            technicians={technicians}
            deviceMasterData={deviceMasterData}
            defaultValues={job}
            submitLabel="Save Changes"
          />
        </CardContent>
      </Card>
    </div>
  );
}
