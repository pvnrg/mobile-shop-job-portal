import { notFound } from "next/navigation";
import { db } from "@/db";
import { parts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PartForm } from "@/components/inventory/part-form";
import { updatePartAction } from "@/lib/actions/parts";

export default async function EditPartPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const partId = Number(id);
  if (!Number.isFinite(partId)) notFound();

  const part = await db.query.parts.findFirst({ where: eq(parts.id, partId) });
  if (!part) notFound();

  const action = updatePartAction.bind(null, partId);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Part</h1>
        <p className="text-sm text-muted-foreground">
          Update {part.name}&apos;s details. To change stock quantity, use &quot;Adjust
          Stock&quot; on the part page instead.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Part Details</CardTitle>
        </CardHeader>
        <CardContent>
          <PartForm action={action} defaultValues={part} submitLabel="Save Changes" />
        </CardContent>
      </Card>
    </div>
  );
}
