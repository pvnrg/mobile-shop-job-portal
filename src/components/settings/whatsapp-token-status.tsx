"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { checkWhatsappTokenAction } from "@/lib/actions/whatsapp-settings";
import { formatDateTime } from "@/lib/format";
import { daysUntil } from "@/lib/whatsapp/token-expiry";
import type { WhatsappSettings } from "@/db/types";

export function WhatsappTokenStatus({ settings }: { settings: WhatsappSettings | undefined }) {
  const [pending, startTransition] = useTransition();

  if (!settings?.accessToken) return null;

  const status = settings.tokenStatus;
  const expiresInDays = status === "valid" ? daysUntil(settings.tokenExpiresAt) : null;
  const expiringSoon = expiresInDays !== null && expiresInDays <= 7;

  function handleCheck() {
    startTransition(async () => {
      const result = await checkWhatsappTokenAction();
      if (result.success) toast.success("Token is valid");
      if (result.error) toast.error(result.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
      <div className="flex items-center gap-2 text-sm">
        {status === "valid" && !expiringSoon && (
          <Badge variant="outline" className="flex items-center gap-1 border-emerald-200 bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-3 w-3" /> Token Valid
          </Badge>
        )}
        {status === "valid" && expiringSoon && (
          <Badge variant="outline" className="flex items-center gap-1 border-amber-200 bg-amber-100 text-amber-700">
            <XCircle className="h-3 w-3" /> Expires in {expiresInDays}d
          </Badge>
        )}
        {status === "invalid" && (
          <Badge variant="outline" className="flex items-center gap-1 border-red-200 bg-red-100 text-red-700">
            <XCircle className="h-3 w-3" /> Token Invalid
          </Badge>
        )}
        {!status && (
          <Badge variant="outline" className="flex items-center gap-1">
            <HelpCircle className="h-3 w-3" /> Not checked yet
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">
          {status === "valid" &&
            (settings.tokenExpiresAt
              ? `Expires ${formatDateTime(settings.tokenExpiresAt)}`
              : "Never expires")}
          {status === "invalid" && settings.tokenStatusDetail}
          {settings.tokenCheckedAt && ` · Checked ${formatDateTime(settings.tokenCheckedAt)}`}
        </span>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={handleCheck} disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Check Now
      </Button>
    </div>
  );
}
