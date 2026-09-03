"use client";

import { useActionState, useState } from "react";
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
import { Loader2, Plus, X } from "lucide-react";
import { CustomerCombobox, type CustomerOption } from "@/components/customers/customer-combobox";
import { DevicePicker } from "@/components/devices/device-picker";
import type { FormState } from "@/lib/actions/jobs";
import type { Job, JobDevice } from "@/db/types";
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

type DeviceRow = {
  rowId: string;
  existingId?: number;
  device?: Partial<JobDevice>;
};

function newRow(): DeviceRow {
  return { rowId: crypto.randomUUID() };
}

export function JobForm({
  action,
  customers,
  technicians,
  deviceMasterData,
  defaultValues,
  defaultDevices,
  defaultCustomerId,
  submitLabel = "Create Job",
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  customers: CustomerOption[];
  technicians: { id: number; name: string }[];
  deviceMasterData: DeviceMasterData;
  defaultValues?: Partial<Job>;
  defaultDevices?: JobDevice[];
  defaultCustomerId?: number;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});

  const [deviceRows, setDeviceRows] = useState<DeviceRow[]>(() =>
    defaultDevices && defaultDevices.length > 0
      ? defaultDevices.map((d) => ({
          rowId: crypto.randomUUID(),
          existingId: d.id,
          device: d,
        }))
      : [newRow()]
  );

  function addDevice() {
    setDeviceRows((rows) => [...rows, newRow()]);
  }

  function removeDevice(rowId: string) {
    setDeviceRows((rows) => (rows.length > 1 ? rows.filter((r) => r.rowId !== rowId) : rows));
  }

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

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base">Devices *</Label>
          <Button type="button" variant="outline" size="sm" onClick={addDevice}>
            <Plus className="h-4 w-4" /> Add Device
          </Button>
        </div>
        {state.fieldErrors?.devices && (
          <p className="text-xs text-destructive">{state.fieldErrors.devices[0]}</p>
        )}

        {deviceRows.map((row, index) => (
          <div key={row.rowId} className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Device {index + 1}</h3>
              {deviceRows.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeDevice(row.rowId)}
                >
                  <X className="h-4 w-4" /> Remove
                </Button>
              )}
            </div>

            {row.existingId && (
              <input type="hidden" name={`devices[${index}].id`} value={row.existingId} />
            )}

            <DevicePicker
              masterData={deviceMasterData}
              namePrefix={`devices[${index}].`}
              defaultDeviceType={row.device?.deviceType}
              defaultBrand={row.device?.brand ?? ""}
              defaultModel={row.device?.model ?? ""}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`devices[${index}].serialNumber`}>Serial / IMEI Number</Label>
                <Input
                  id={`devices[${index}].serialNumber`}
                  name={`devices[${index}].serialNumber`}
                  defaultValue={row.device?.serialNumber ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`devices[${index}].passcode`}>Device Passcode (optional)</Label>
                <Input
                  id={`devices[${index}].passcode`}
                  name={`devices[${index}].passcode`}
                  defaultValue={row.device?.passcode ?? ""}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`devices[${index}].issueDescription`}>Issue Description *</Label>
              <Textarea
                id={`devices[${index}].issueDescription`}
                name={`devices[${index}].issueDescription`}
                rows={3}
                placeholder="Describe the reported issue..."
                defaultValue={row.device?.issueDescription}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`devices[${index}].accessories`}>Accessories Received</Label>
              <Input
                id={`devices[${index}].accessories`}
                name={`devices[${index}].accessories`}
                placeholder="Charger, case, SIM card..."
                defaultValue={row.device?.accessories ?? ""}
              />
            </div>
          </div>
        ))}
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
