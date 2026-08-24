"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateBusinessSettingsAction, type FormState } from "@/lib/actions/settings";
import type { BusinessSettings } from "@/db/types";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      Save Settings
    </Button>
  );
}

export function BusinessSettingsForm({ settings }: { settings: BusinessSettings | undefined }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    updateBusinessSettingsAction,
    {}
  );
  const prevState = useRef(state);

  useEffect(() => {
    if (state !== prevState.current && state.success) {
      toast.success("Business settings saved");
    }
    prevState.current = state;
  }, [state]);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="businessName">Business Name *</Label>
          <Input id="businessName" name="businessName" defaultValue={settings?.businessName} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gstin">GSTIN</Label>
          <Input
            id="gstin"
            name="gstin"
            className="uppercase"
            defaultValue={settings?.gstin ?? ""}
            placeholder="22AAAAA0000A1Z5"
          />
          {state.fieldErrors?.gstin && (
            <p className="text-xs text-destructive">{state.fieldErrors.gstin[0]}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={settings?.phone ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={settings?.email ?? ""} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Business Address</Label>
        <Textarea id="address" name="address" rows={2} defaultValue={settings?.address ?? ""} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="jobPrefix">Job Number Prefix</Label>
          <Input id="jobPrefix" name="jobPrefix" defaultValue={settings?.jobPrefix ?? "JOB"} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invoicePrefix">Invoice Number Prefix</Label>
          <Input
            id="invoicePrefix"
            name="invoicePrefix"
            defaultValue={settings?.invoicePrefix ?? "INV"}
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="defaultCgstPercent">Default CGST %</Label>
          <Input
            id="defaultCgstPercent"
            name="defaultCgstPercent"
            type="number"
            step="0.01"
            defaultValue={settings?.defaultCgstPercent ?? "9"}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultSgstPercent">Default SGST %</Label>
          <Input
            id="defaultSgstPercent"
            name="defaultSgstPercent"
            type="number"
            step="0.01"
            defaultValue={settings?.defaultSgstPercent ?? "9"}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultIgstPercent">Default IGST %</Label>
          <Input
            id="defaultIgstPercent"
            name="defaultIgstPercent"
            type="number"
            step="0.01"
            defaultValue={settings?.defaultIgstPercent ?? "18"}
          />
        </div>
      </div>

      <SubmitButton />
    </form>
  );
}
