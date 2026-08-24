"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { updateJobStatusAction, type FormState } from "@/lib/actions/jobs";
import { jobStatusLabels, jobStatuses, type JobStatus } from "@/lib/status";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      Update Status
    </Button>
  );
}

export function StatusUpdateForm({
  jobId,
  currentStatus,
}: {
  jobId: number;
  currentStatus: JobStatus;
}) {
  const action = updateJobStatusAction.bind(null, jobId);
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  const prevState = useRef(state);

  useEffect(() => {
    if (state !== prevState.current) {
      if (!state.error && !state.fieldErrors) {
        toast.success("Job status updated");
        formRef.current?.reset();
      }
      prevState.current = state;
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Select key={currentStatus} name="status" defaultValue={currentStatus}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {jobStatuses.map((s) => (
              <SelectItem key={s} value={s}>
                {jobStatusLabels[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <SubmitButton />
      </div>
      <Textarea name="note" placeholder="Add a note about this update (optional)..." rows={2} />
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
    </form>
  );
}
