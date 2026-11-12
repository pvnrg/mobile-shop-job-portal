import { Card, CardContent } from "@/components/ui/card";
import { JobForm } from "@/components/jobs/job-form";
import { createJobAction } from "@/lib/actions/jobs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCustomerOption } from "@/lib/customer-option";
import { asc, eq } from "drizzle-orm";
import { getDeviceMasterData } from "@/lib/device-master";

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const { customerId } = await searchParams;

  const [defaultCustomer, technicians, deviceMasterData] = await Promise.all([
    getCustomerOption(customerId ? Number(customerId) : null),
    db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.active, 1))
      .orderBy(asc(users.name)),
    getDeviceMasterData(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Repair Job</h1>
        <p className="text-sm text-muted-foreground">
          Log a new mobile device for repair
        </p>
      </div>
      <Card>
        <CardContent>
          <JobForm
            action={createJobAction}
            defaultCustomer={defaultCustomer}
            technicians={technicians}
            deviceMasterData={deviceMasterData}
            submitLabel="Create Job"
          />
        </CardContent>
      </Card>
    </div>
  );
}
