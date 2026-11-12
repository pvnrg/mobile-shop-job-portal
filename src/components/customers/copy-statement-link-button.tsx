"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getStatementLinkAction } from "@/lib/actions/account";

export function CopyStatementLinkButton({ customerId }: { customerId: number }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await getStatementLinkAction(customerId);
          if (!result.success) {
            toast.error(result.error);
            return;
          }
          try {
            await navigator.clipboard.writeText(result.url);
            toast.success("Statement link copied", { description: result.url });
          } catch {
            toast.info("Statement link", { description: result.url, duration: 15000 });
          }
        })
      }
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
      Statement Link
    </Button>
  );
}
