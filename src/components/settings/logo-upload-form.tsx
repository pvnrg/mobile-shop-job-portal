"use client";

import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Smartphone, Trash2, Upload } from "lucide-react";
import { uploadLogoAction, removeLogoAction, type LogoFormState } from "@/lib/actions/logo";

function UploadButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
      Upload
    </Button>
  );
}

export function LogoUploadForm({ logoPath }: { logoPath: string | null | undefined }) {
  const [state, formAction] = useActionState<LogoFormState, FormData>(uploadLogoAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
        {logoPath ? (
          <Image src={logoPath} alt="Business logo" width={64} height={64} className="h-full w-full object-contain" unoptimized />
        ) : (
          <Smartphone className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <form
            ref={formRef}
            action={async (formData) => {
              await formAction(formData);
              formRef.current?.reset();
            }}
            className="flex flex-wrap items-center gap-2"
          >
            <Input name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="max-w-xs" required />
            <UploadButton />
          </form>
          {logoPath && (
            <form action={removeLogoAction}>
              <Button type="submit" size="sm" variant="outline">
                <Trash2 className="h-4 w-4" /> Remove
              </Button>
            </form>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          PNG, JPG, WEBP, or SVG — max 2MB. Shown in the sidebar, login page, and on invoices.
        </p>
        {state.error && <p className="text-xs text-destructive">{state.error}</p>}
      </div>
    </div>
  );
}
