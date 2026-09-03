"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { sendOutstandingReminderAction } from "@/lib/actions/account";

export function SendOutstandingReminderButton({
  customerId,
  totalUdhar,
}: {
  customerId: number;
  totalUdhar: number;
}) {
  const [pending, startTransition] = useTransition();

  if (totalUdhar <= 0) return null;

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await sendOutstandingReminderAction(customerId);
          if (result.success) {
            toast.success("Outstanding balance reminder sent");
          } else {
            toast.error(result.error ?? "Could not send the reminder");
          }
        })
      }
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
      Send Reminder
    </Button>
  );
}
