"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import {
  updateServiceAction,
  toggleServiceActiveAction,
  deleteServiceAction,
  type FormState,
} from "@/lib/actions/site";
import { getSiteMediaUrl } from "@/lib/site-media";
import type { SiteService } from "@/db/types";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="outline" disabled={pending}>
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
      Save
    </Button>
  );
}

export function SiteServiceRow({ service }: { service: SiteService }) {
  const action = updateServiceAction.bind(null, service.id);
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  const [prevState, setPrevState] = useState(state);
  const [active, setActive] = useState(service.active === 1);
  const formRef = useRef<HTMLFormElement>(null);
  const imageUrl = getSiteMediaUrl(service.imagePath);

  if (state !== prevState) {
    setPrevState(state);
    if (state.success) toast.success(`Saved "${service.title}"`);
  }

  function handleActiveChange(checked: boolean) {
    setActive(checked);
    toggleServiceActiveAction(service.id, checked);
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-3 rounded-lg border p-3">
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={service.title} className="h-full w-full object-cover" />
          ) : (
            <Wrench className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <Input name="title" defaultValue={service.title} placeholder="Service title" required />
          <Textarea
            name="description"
            defaultValue={service.description ?? ""}
            placeholder="Short description"
            rows={2}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Input name="image" type="file" accept="image/jpeg,image/png,image/webp" className="max-w-56" />
        <Label className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Order</span>
          <Input
            name="displayOrder"
            type="number"
            defaultValue={service.displayOrder}
            className="w-16"
          />
        </Label>
        <div className="ml-auto flex items-center gap-2">
          <Switch checked={active} onCheckedChange={handleActiveChange} aria-label="Active" />
          <SaveButton />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => deleteServiceAction(service.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {(state.error || state.fieldErrors?.title) && (
        <p className="text-xs text-destructive">
          {state.error || state.fieldErrors?.title?.[0]}
        </p>
      )}
    </form>
  );
}
