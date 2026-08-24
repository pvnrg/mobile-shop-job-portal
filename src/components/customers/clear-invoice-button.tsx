"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { clearInvoiceAction } from "@/lib/actions/account";

export function ClearInvoiceButton({ invoiceId }: { invoiceId: number }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="h-6 px-2 text-xs"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await clearInvoiceAction(invoiceId);
          toast.success("Invoice cleared — no udhar remaining");
        })
      }
    >
      {pending && <Loader2 className="h-3 w-3 animate-spin" />}
      Clear
    </Button>
  );
}
