"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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
import { Loader2 } from "lucide-react";
import { updateJobStatusAction, type FormState } from "@/lib/actions/jobs";
import {
  jobStatusLabels,
  jobStatuses,
  paymentMethodLabels,
  paymentMethods,
  type JobStatus,
} from "@/lib/status";
import { toast } from "sonner";

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
  const [selectedStatus, setSelectedStatus] = useState<JobStatus>(currentStatus);
  const [prevCurrentStatus, setPrevCurrentStatus] = useState(currentStatus);
  const formRef = useRef<HTMLFormElement>(null);
  const prevState = useRef(state);

  // currentStatus only changes once the server confirms the update (after
  // revalidation) — syncing selectedStatus to it here, during render, keeps
  // the payment-fields visibility correct without a setState-in-effect.
  if (currentStatus !== prevCurrentStatus) {
    setPrevCurrentStatus(currentStatus);
    setSelectedStatus(currentStatus);
  }

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
        <Select
          key={currentStatus}
          name="status"
          defaultValue={currentStatus}
          onValueChange={(value) => setSelectedStatus(value as JobStatus)}
        >
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

      {selectedStatus === "delivered" && (
        <div className="space-y-2 rounded-lg border border-dashed p-3">
          <Label className="text-xs">Amount Paid by Customer (optional)</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              name="amountPaid"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="text-sm"
            />
            <Select name="paymentMethod" defaultValue="cash">
              <SelectTrigger className="w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((m) => (
                  <SelectItem key={m} value={m}>
                    {paymentMethodLabels[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {state.fieldErrors?.paymentMethod && (
            <p className="text-xs text-destructive">{state.fieldErrors.paymentMethod[0]}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Links to this job&apos;s invoice automatically if one exists.
          </p>
        </div>
      )}

      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
    </form>
  );
}
