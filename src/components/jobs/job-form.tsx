"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { CustomerCombobox, type CustomerOption } from "@/components/customers/customer-combobox";
import { DevicePicker } from "@/components/devices/device-picker";
import type { FormState } from "@/lib/actions/jobs";
import type { Job } from "@/db/types";
import type { DeviceMasterData } from "@/lib/device-master";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {label}
    </Button>
  );
}

export function JobForm({
  action,
  customers,
  technicians,
  deviceMasterData,
  defaultValues,
  defaultCustomerId,
  submitLabel = "Create Job",
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  customers: CustomerOption[];
  technicians: { id: number; name: string }[];
  deviceMasterData: DeviceMasterData;
  defaultValues?: Partial<Job>;
  defaultCustomerId?: number;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});

  const promisedAtDefault = defaultValues?.promisedAt
    ? new Date(defaultValues.promisedAt).toISOString().slice(0, 16)
    : "";

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        <Label>Customer *</Label>
        <CustomerCombobox
          customers={customers}
          name="customerId"
          defaultValue={defaultValues?.customerId ?? defaultCustomerId}
        />
        {state.fieldErrors?.customerId && (
          <p className="text-xs text-destructive">{state.fieldErrors.customerId[0]}</p>
        )}
      </div>

      <DevicePicker
        masterData={deviceMasterData}
        defaultDeviceType={defaultValues?.deviceType}
        defaultBrand={defaultValues?.brand ?? ""}
        defaultModel={defaultValues?.model ?? ""}
        errors={state.fieldErrors}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="serialNumber">Serial / IMEI Number</Label>
          <Input id="serialNumber" name="serialNumber" defaultValue={defaultValues?.serialNumber ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="passcode">Device Passcode (optional)</Label>
          <Input id="passcode" name="passcode" defaultValue={defaultValues?.passcode ?? ""} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="issueDescription">Issue Description *</Label>
        <Textarea
          id="issueDescription"
          name="issueDescription"
          rows={3}
          placeholder="Describe the reported issue..."
          defaultValue={defaultValues?.issueDescription}
          required
        />
        {state.fieldErrors?.issueDescription && (
          <p className="text-xs text-destructive">{state.fieldErrors.issueDescription[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="accessories">Accessories Received</Label>
        <Input
          id="accessories"
          name="accessories"
          placeholder="Charger, case, SIM card..."
          defaultValue={defaultValues?.accessories ?? ""}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select name="priority" defaultValue={defaultValues?.priority ?? "normal"}>
            <SelectTrigger id="priority" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="estimatedCost">Estimated Cost (₹)</Label>
          <Input
            id="estimatedCost"
            name="estimatedCost"
            type="number"
            min="0"
            step="0.01"
            defaultValue={defaultValues?.estimatedCost ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="promisedAt">Promised Delivery</Label>
          <Input
            id="promisedAt"
            name="promisedAt"
            type="datetime-local"
            defaultValue={promisedAtDefault}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="assignedTo">Assign Technician</Label>
        <Select name="assignedTo" defaultValue={defaultValues?.assignedTo ? String(defaultValues.assignedTo) : undefined}>
          <SelectTrigger id="assignedTo" className="w-full">
            <SelectValue placeholder="Unassigned" />
          </SelectTrigger>
          <SelectContent>
            {technicians.map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Internal Notes</Label>
        <Textarea id="notes" name="notes" rows={2} defaultValue={defaultValues?.notes ?? ""} />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton label={submitLabel} />
    </form>
  );
}
