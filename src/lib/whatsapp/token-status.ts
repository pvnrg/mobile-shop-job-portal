import { db } from "@/db";
import { whatsappSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

const RECHECK_INTERVAL_MS = 12 * 60 * 60 * 1000;

type TokenCheckResult =
  | { valid: true; expiresAt: Date | null }
  | { valid: false; detail: string };

async function debugWhatsappToken(accessToken: string, apiVersion: string): Promise<TokenCheckResult> {
  const url = `https://graph.facebook.com/${apiVersion}/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(accessToken)}`;

  try {
    const response = await fetch(url, { cache: "no-store" });
    const json = await response.json().catch(() => null);

    if (!response.ok || json?.error) {
      return { valid: false, detail: json?.error?.message || `Request failed with status ${response.status}` };
    }

    const data = json?.data;
    if (!data) {
      return { valid: false, detail: "Unexpected response from Meta while checking the token." };
    }
    if (data.error) {
      return { valid: false, detail: data.error.message || "Token is invalid." };
    }
    if (!data.is_valid) {
      return { valid: false, detail: "Token is no longer valid." };
    }

    const expiresAt = data.expires_at && data.expires_at > 0 ? new Date(data.expires_at * 1000) : null;
    return { valid: true, expiresAt };
  } catch (err) {
    return {
      valid: false,
      detail: err instanceof Error ? err.message : "Network error while checking the token.",
    };
  }
}

async function persistCheck(settingsId: number, result: TokenCheckResult) {
  const updates = result.valid
    ? {
        tokenStatus: "valid",
        tokenStatusDetail: null,
        tokenExpiresAt: result.expiresAt,
        tokenCheckedAt: new Date(),
      }
    : {
        tokenStatus: "invalid",
        tokenStatusDetail: result.detail,
        tokenExpiresAt: null,
        tokenCheckedAt: new Date(),
      };

  await db.update(whatsappSettings).set(updates).where(eq(whatsappSettings.id, settingsId));
  return updates;
}

/**
 * Checks the WhatsApp access token's validity/expiry with Meta and caches the
 * result on whatsapp_settings. Only hits the Graph API when the last check is
 * stale (or `force` is set), so this is cheap to call on every dashboard load.
 */
export async function ensureWhatsappTokenChecked(force = false) {
  const settings = await db.query.whatsappSettings.findFirst();
  if (!settings || settings.enabled !== 1 || !settings.accessToken) return settings ?? null;

  const isStale =
    force || !settings.tokenCheckedAt || Date.now() - settings.tokenCheckedAt.getTime() > RECHECK_INTERVAL_MS;
  if (!isStale) return settings;

  const result = await debugWhatsappToken(settings.accessToken, settings.apiVersion);
  const updates = await persistCheck(settings.id, result);
  return { ...settings, ...updates };
}

export async function checkWhatsappTokenNow() {
  const settings = await db.query.whatsappSettings.findFirst();
  if (!settings?.accessToken) {
    return { error: "No access token saved yet." };
  }

  const result = await debugWhatsappToken(settings.accessToken, settings.apiVersion);
  await persistCheck(settings.id, result);
  return result.valid ? { success: true as const } : { error: result.detail };
}
