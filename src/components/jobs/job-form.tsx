"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarClock, Loader2, Plus, Smartphone, StickyNote, User as UserIcon, X } from "lucide-react";
import { CustomerCombobox, type CustomerOption } from "@/components/customers/customer-combobox";
import { DevicePicker } from "@/components/devices/device-picker";
import type { FormState } from "@/lib/actions/jobs";
import type { Job, JobDevice } from "@/db/types";
import type { DeviceMasterData } from "@/lib/device-master";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {label}
    </Button>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

type DeviceRow = {
  rowId: string;
  existingId?: number;
  device?: Partial<JobDevice>;
};

// A simple incrementing counter, not crypto.randomUUID() — these ids only
// need to be locally unique for React's `key` prop within one form session,
// and randomUUID() is unavailable in insecure (plain HTTP, non-localhost)
// contexts, which crashed this form in production.
let rowIdCounter = 0;
function nextRowId(): string {
  rowIdCounter += 1;
  return `row-${rowIdCounter}`;
}
function newRow(): DeviceRow {
  return { rowId: nextRowId() };
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
          rowId: nextRowId(),
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
    <form action={formAction} className="space-y-8">
      <div className="space-y-4">
        <SectionHeading icon={UserIcon} title="Customer" />
        <div className="space-y-2">
          <CustomerCombobox
            customers={customers}
            name="customerId"
            defaultValue={defaultValues?.customerId ?? defaultCustomerId}
          />
          {state.fieldErrors?.customerId && (
            <p className="text-xs text-destructive">{state.fieldErrors.customerId[0]}</p>
          )}
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <SectionHeading
            icon={Smartphone}
            title="Devices"
            description="Add every device the customer is dropping off in this visit."
          />
          <Button type="button" variant="outline" size="sm" onClick={addDevice} className="shrink-0">
            <Plus className="h-4 w-4" /> Add Device
          </Button>
        </div>
        {state.fieldErrors?.devices && (
          <p className="text-xs text-destructive">{state.fieldErrors.devices[0]}</p>
        )}

        <div className="space-y-4">
          {deviceRows.map((row, index) => (
            <div key={row.rowId} className="space-y-4 rounded-xl border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium">Device {index + 1}</span>
                </div>
                {deviceRows.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDevice(row.rowId)}
                    className="text-muted-foreground hover:text-destructive"
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

        <Button type="button" variant="ghost" size="sm" onClick={addDevice} className="w-full border border-dashed">
          <Plus className="h-4 w-4" /> Add Another Device
        </Button>
      </div>

      <Separator />

      <div className="space-y-4">
        <SectionHeading icon={CalendarClock} title="Scheduling & Assignment" />

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
      </div>

      <Separator />

      <div className="space-y-4">
        <SectionHeading icon={StickyNote} title="Internal Notes" />
        <Textarea name="notes" rows={2} defaultValue={defaultValues?.notes ?? ""} />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton label={submitLabel} />
    </form>
  );
}
