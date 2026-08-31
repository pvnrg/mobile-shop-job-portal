import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { WhatsappSettings } from "@/db/types";
import { daysUntil } from "@/lib/whatsapp/token-expiry";

export function WhatsappTokenBanner({ settings }: { settings: WhatsappSettings | undefined | null }) {
  if (!settings || settings.enabled !== 1 || !settings.accessToken) return null;

  const expiresInDays = daysUntil(settings.tokenExpiresAt);
  const expiringSoon = expiresInDays !== null && expiresInDays <= 7;

  if (settings.tokenStatus !== "invalid" && !expiringSoon) return null;

  const message =
    settings.tokenStatus === "invalid"
      ? "Your WhatsApp access token is invalid — customer notifications are not being sent."
      : `Your WhatsApp access token expires in ${expiresInDays} day${expiresInDays === 1 ? "" : "s"} — generate a new one to avoid an interruption.`;

  return (
    <Link
      href="/dashboard/settings?tab=whatsapp"
      className="flex items-center gap-2 border-b bg-red-50 px-4 py-2 text-sm text-red-700 transition-colors hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300"
    >
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="truncate">{message}</span>
      <span className="ml-auto shrink-0 underline">Fix in Settings</span>
    </Link>
  );
}
