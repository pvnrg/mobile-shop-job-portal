"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { createServiceAction, type FormState } from "@/lib/actions/site";
import { SiteServiceRow } from "@/components/site/site-service-row";
import type { SiteService } from "@/db/types";

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      Add Service
    </Button>
  );
}

export function SiteServicesManager({ services }: { services: SiteService[] }) {
  const [state, formAction] = useActionState<FormState, FormData>(createServiceAction, {});
  const [initialState] = useState(state);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state !== initialState && state.success) {
      toast.success("Service added");
      formRef.current?.reset();
    }
  }, [state, initialState]);

  return (
    <div className="space-y-4">
      <form
        ref={formRef}
        action={formAction}
        className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed p-3"
      >
        <div className="min-w-40 flex-1 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Title</label>
          <Input name="title" placeholder="e.g. Screen Repair" required />
        </div>
        <div className="min-w-48 flex-[2] space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Description</label>
          <Textarea name="description" placeholder="Short description" rows={1} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Image</label>
          <Input name="image" type="file" accept="image/jpeg,image/png,image/webp" className="max-w-48" />
        </div>
        <AddButton />
      </form>
      {(state.error || state.fieldErrors?.title) && (
        <p className="text-xs text-destructive">
          {state.error || state.fieldErrors?.title?.[0]}
        </p>
      )}

      {services.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No services added yet — add your first one above.
        </p>
      ) : (
        <div className="space-y-3">
          {services.map((service) => (
            <SiteServiceRow key={service.id} service={service} />
          ))}
        </div>
      )}
    </div>
  );
}
