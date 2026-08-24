"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { sendInvoiceWhatsappAction } from "@/lib/actions/invoices";

export function SendWhatsappButton({ invoiceId }: { invoiceId: number }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await sendInvoiceWhatsappAction(invoiceId);
          toast.success("Invoice notification queued — check the WhatsApp log in Settings for delivery status");
        })
      }
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
      Send via WhatsApp
    </Button>
  );
}
