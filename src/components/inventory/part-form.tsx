"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import type { FormState } from "@/lib/actions/parts";
import type { Part } from "@/db/types";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {label}
    </Button>
  );
}

export function PartForm({
  action,
  defaultValues,
  isCreate = false,
  submitLabel = "Save Part",
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  defaultValues?: Partial<Part>;
  isCreate?: boolean;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Part Name *</Label>
          <Input id="name" name="name" defaultValue={defaultValues?.name} required />
          {state.fieldErrors?.name && (
            <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="sku">SKU / Part Number</Label>
          <Input id="sku" name="sku" defaultValue={defaultValues?.sku ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            name="category"
            placeholder="Screen, Battery, Charging Port..."
            defaultValue={defaultValues?.category ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unitCost">Unit Cost (₹) *</Label>
          <Input
            id="unitCost"
            name="unitCost"
            type="number"
            min="0"
            step="0.01"
            defaultValue={defaultValues?.unitCost ?? "0"}
            required
          />
          <p className="text-xs text-muted-foreground">What you pay your supplier per unit.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sellingPrice">Selling Price (₹) *</Label>
          <Input
            id="sellingPrice"
            name="sellingPrice"
            type="number"
            min="0"
            step="0.01"
            defaultValue={defaultValues?.sellingPrice ?? "0"}
            required
          />
          <p className="text-xs text-muted-foreground">What you charge the customer per unit.</p>
        </div>
        {isCreate && (
          <div className="space-y-2">
            <Label htmlFor="quantityInStock">Starting Stock Quantity *</Label>
            <Input
              id="quantityInStock"
              name="quantityInStock"
              type="number"
              min="0"
              step="1"
              defaultValue={defaultValues?.quantityInStock ?? "0"}
              required
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="lowStockThreshold">Low Stock Alert Threshold *</Label>
          <Input
            id="lowStockThreshold"
            name="lowStockThreshold"
            type="number"
            min="0"
            step="1"
            defaultValue={defaultValues?.lowStockThreshold ?? "5"}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} defaultValue={defaultValues?.notes ?? ""} />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton label={submitLabel} />
    </form>
  );
}
