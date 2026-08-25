import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PartForm } from "@/components/inventory/part-form";
import { createPartAction } from "@/lib/actions/parts";

export default function NewPartPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add Part</h1>
        <p className="text-sm text-muted-foreground">Add a new spare part to inventory</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Part Details</CardTitle>
        </CardHeader>
        <CardContent>
          <PartForm action={createPartAction} isCreate submitLabel="Add Part" />
        </CardContent>
      </Card>
    </div>
  );
}
