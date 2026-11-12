import { notFound } from "next/navigation";
import { db } from "@/db";
import { jobs, users } from "@/db/schema";
import { getCustomerOption } from "@/lib/customer-option";
import { eq, asc } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
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

  const job = await db.query.jobs.findFirst({
    where: eq(jobs.id, jobId),
    with: { devices: { orderBy: (jobDevices, { asc }) => [asc(jobDevices.id)] } },
  });
  if (!job) notFound();

  const [defaultCustomer, technicians, deviceMasterData] = await Promise.all([
    getCustomerOption(job.customerId),
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
        <CardContent>
          <JobForm
            action={action}
            defaultCustomer={defaultCustomer}
            technicians={technicians}
            deviceMasterData={deviceMasterData}
            defaultValues={job}
            defaultDevices={job.devices}
            submitLabel="Save Changes"
          />
        </CardContent>
      </Card>
    </div>
  );
}
