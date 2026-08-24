"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { updateWhatsappTemplateAction, type FormState } from "@/lib/actions/whatsapp-settings";
import type { NotificationEvent } from "@/lib/whatsapp/events";
import type { WhatsappTemplate } from "@/db/types";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="outline" disabled={pending}>
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
      Save
    </Button>
  );
}

export function WhatsappTemplateRow({
  event,
  label,
  description,
  params,
  template,
}: {
  event: NotificationEvent;
  label: string;
  description: string;
  params: string[];
  template: WhatsappTemplate | undefined;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    updateWhatsappTemplateAction,
    {}
  );
  const prevState = useRef(state);

  useEffect(() => {
    if (state !== prevState.current && state.success) {
      toast.success(`Saved template for "${label}"`);
    }
    prevState.current = state;
  }, [state, label]);

  return (
    <form action={formAction} className="space-y-2 rounded-lg border p-3">
      <input type="hidden" name="event" value={event} />
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Sent parameters:{" "}
            {params.map((p, i) => (
              <span key={p}>
                <code className="rounded bg-muted px-1 py-0.5">
                  {`{{${i + 1}}}`}
                </code>{" "}
                {p}
                {i < params.length - 1 ? ", " : ""}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            name="enabled"
            defaultChecked={template?.enabled === 1}
            aria-label={`Enable ${label} notifications`}
          />
          <SubmitButton />
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          name="templateName"
          placeholder="Approved template name (e.g. job_status_update)"
          defaultValue={template?.templateName ?? ""}
        />
        <Input
          name="languageCode"
          placeholder="Language code"
          defaultValue={template?.languageCode ?? "en_US"}
        />
      </div>
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
    </form>
  );
}
