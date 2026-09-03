// One-time migration script: copies the single device that used to live
// directly on each `jobs` row into its own `job_devices` row, and repoints
// `job_status_history` at the new device. Must run AFTER the Phase A schema
// push (which adds `job_devices` and the nullable `job_status_history.job_device_id`
// column) and BEFORE the Phase C push (which drops the old device/status
// columns off `jobs`) — see the "Multiple Devices per Job" migration plan.
//
// Reads the old `jobs` columns via raw SQL rather than the Drizzle `jobs`
// schema object, since by the time this needs to run again (e.g. on
// production) `schema.ts` will already reflect the post-migration shape and
// no longer declares those columns.
import { db } from "./index";
import { jobDevices, jobStatusHistory } from "./schema";
import { eq, isNull, count } from "drizzle-orm";
import { sql } from "drizzle-orm";

type OldJobRow = {
  id: number;
  device_type: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  issue_description: string;
  accessories: string | null;
  passcode: string | null;
  status: string;
  delivered_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

async function main() {
  const allJobs = await db.execute<OldJobRow>(
    sql`select id, device_type, brand, model, serial_number, issue_description, accessories, passcode, status, delivered_at, created_at, updated_at from jobs`
  );

  let devicesCreated = 0;
  let historyRepointed = 0;

  await db.transaction(async (tx) => {
    for (const job of allJobs) {
      const [device] = await tx
        .insert(jobDevices)
        .values({
          jobId: job.id,
          deviceType: job.device_type,
          brand: job.brand,
          model: job.model,
          serialNumber: job.serial_number,
          issueDescription: job.issue_description,
          accessories: job.accessories,
          passcode: job.passcode,
          status: job.status as (typeof jobDevices.$inferInsert)["status"],
          // db.execute() returns raw driver values for timestamp columns
          // (strings, not Date instances) since it bypasses Drizzle's
          // schema-based row mapping — wrap explicitly so the insert's
          // timestamp columns get real Date objects either way.
          deliveredAt: job.delivered_at ? new Date(job.delivered_at) : null,
          createdAt: new Date(job.created_at),
          updatedAt: new Date(job.updated_at),
        })
        .returning({ id: jobDevices.id });
      devicesCreated++;

      const result = await tx
        .update(jobStatusHistory)
        .set({ jobDeviceId: device.id })
        .where(eq(jobStatusHistory.jobId, job.id))
        .returning({ id: jobStatusHistory.id });
      historyRepointed += result.length;
    }
  });

  console.log(`Jobs processed: ${allJobs.length}`);
  console.log(`Job devices created: ${devicesCreated}`);
  console.log(`Status history rows repointed: ${historyRepointed}`);

  const [{ unlinkedCount }] = await db
    .select({ unlinkedCount: count() })
    .from(jobStatusHistory)
    .where(isNull(jobStatusHistory.jobDeviceId));

  if (unlinkedCount > 0) {
    console.error(
      `FAILED: ${unlinkedCount} job_status_history rows still have a null job_device_id.`
    );
    process.exit(1);
  }

  console.log("Backfill verified: no job_status_history rows left with a null job_device_id.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
