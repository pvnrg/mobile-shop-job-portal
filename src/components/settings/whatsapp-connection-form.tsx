"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateWhatsappConnectionAction, type FormState } from "@/lib/actions/whatsapp-settings";
import type { WhatsappSettings } from "@/db/types";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      Save Connection
    </Button>
  );
}

export function WhatsappConnectionForm({ settings }: { settings: WhatsappSettings | undefined }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    updateWhatsappConnectionAction,
    {}
  );
  const [enabled, setEnabled] = useState(settings?.enabled === 1);
  const prevState = useRef(state);

  useEffect(() => {
    if (state !== prevState.current && state.success) {
      toast.success("WhatsApp connection settings saved");
    }
    prevState.current = state;
  }, [state]);

  const hasToken = !!settings?.accessToken;

  return (
    <form action={formAction} className="space-y-5">
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <Label htmlFor="whatsapp-enabled" className="text-sm font-medium">
            Enable WhatsApp Notifications
          </Label>
          <p className="text-xs text-muted-foreground">
            Master switch — when off, no messages are sent regardless of template settings.
          </p>
        </div>
        <Switch
          id="whatsapp-enabled"
          name="enabled"
          checked={enabled}
          onCheckedChange={setEnabled}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="accessToken">Access Token</Label>
          <Input
            id="accessToken"
            name="accessToken"
            type="password"
            placeholder={hasToken ? "•••••••••••••••• (saved — leave blank to keep)" : "Paste your Meta permanent access token"}
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            From your Meta for Developers app → WhatsApp → API Setup. Never shown again once
            saved — leave blank to keep the current token.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="phoneNumberId">Phone Number ID</Label>
          <Input
            id="phoneNumberId"
            name="phoneNumberId"
            defaultValue={settings?.phoneNumberId ?? ""}
            placeholder="e.g. 109876543210123"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="businessAccountId">Business Account ID (optional)</Label>
          <Input
            id="businessAccountId"
            name="businessAccountId"
            defaultValue={settings?.businessAccountId ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="apiVersion">Graph API Version</Label>
          <Input
            id="apiVersion"
            name="apiVersion"
            defaultValue={settings?.apiVersion ?? "v22.0"}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultCountryCode">Default Country Code</Label>
          <Input
            id="defaultCountryCode"
            name="defaultCountryCode"
            defaultValue={settings?.defaultCountryCode ?? "91"}
            placeholder="91"
          />
          <p className="text-xs text-muted-foreground">
            Used when a customer&apos;s saved phone number is a plain 10-digit number.
          </p>
        </div>
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
