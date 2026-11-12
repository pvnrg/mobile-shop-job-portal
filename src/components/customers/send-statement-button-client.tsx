"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { sendAccountStatementAction } from "@/lib/actions/account";

export function SendStatementButtonClient({
  customerId,
  apiReady,
  waLink,
}: {
  customerId: number;
  /** WhatsApp Business template is set up: send directly from the server. */
  apiReady: boolean;
  /** Otherwise: open WhatsApp with the statement message already typed. */
  waLink: string | null;
}) {
  const [pending, startTransition] = useTransition();

  if (!apiReady) {
    if (!waLink) {
      return (
        <Button type="button" size="sm" variant="outline" disabled title="Customer phone number is not valid">
          <Send className="h-4 w-4" /> Send Statement
        </Button>
      );
    }
    return (
      <Button asChild size="sm" variant="outline">
        <a href={waLink} target="_blank" rel="noreferrer" title="Opens WhatsApp with the statement message ready to send">
          <Send className="h-4 w-4" /> Send Statement
        </a>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await sendAccountStatementAction(customerId);
          if (result.success) toast.success("Account statement sent on WhatsApp");
          else toast.error(result.error ?? "Could not send the statement");
        })
      }
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      Send Statement
    </Button>
  );
}
