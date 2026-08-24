"use client";

import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload } from "lucide-react";
import { uploadMediaAction, type MediaFormState } from "@/lib/actions/media";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="sm">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
      Upload
    </Button>
  );
}

export function MediaUploadForm({ jobId }: { jobId: number }) {
  const action = uploadMediaAction.bind(null, jobId);
  const [state, formAction] = useActionState<MediaFormState, FormData>(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
      }}
      className="space-y-3 rounded-lg border border-dashed p-4"
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="file" className="text-xs">
            File (image or PDF, max 15MB)
          </Label>
          <Input id="file" name="file" type="file" accept="image/*,.pdf" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="category" className="text-xs">
            Category
          </Label>
          <Select name="category" defaultValue="device_photo">
            <SelectTrigger id="category" className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="device_photo">Device Photo</SelectItem>
              <SelectItem value="before_repair">Before Repair</SelectItem>
              <SelectItem value="after_repair">After Repair</SelectItem>
              <SelectItem value="id_proof">ID Proof</SelectItem>
              <SelectItem value="invoice">Invoice / Receipt</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <SubmitButton />
      </div>
      <Input name="caption" placeholder="Optional caption..." className="text-sm" />
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
    </form>
  );
}
