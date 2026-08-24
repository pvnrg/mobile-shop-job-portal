"use server";

import { db } from "@/db";
import { whatsappSettings, whatsappTemplates } from "@/db/schema";
import {
  whatsappConnectionSchema,
  whatsappTemplateSchema,
  sendTestMessageSchema,
} from "@/lib/validation/whatsapp";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { formatPhoneForWhatsapp, sendWhatsappTemplateMessage } from "@/lib/whatsapp/client";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

export async function updateWhatsappConnectionAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = whatsappConnectionSchema.safeParse({
    enabled: formData.get("enabled") === "on",
    accessToken: formData.get("accessToken") ?? "",
    phoneNumberId: formData.get("phoneNumberId") ?? "",
    businessAccountId: formData.get("businessAccountId") ?? "",
    apiVersion: formData.get("apiVersion") || "v22.0",
    defaultCountryCode: formData.get("defaultCountryCode") || "91",
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const existing = await db.query.whatsappSettings.findFirst();

  const values = {
    enabled: parsed.data.enabled ? 1 : 0,
    phoneNumberId: parsed.data.phoneNumberId || null,
    businessAccountId: parsed.data.businessAccountId || null,
    apiVersion: parsed.data.apiVersion,
    defaultCountryCode: parsed.data.defaultCountryCode,
    updatedAt: new Date(),
  };

  // Leave the token untouched if the field was left blank (it's never echoed back to the client).
  const accessToken =
    parsed.data.accessToken && parsed.data.accessToken.length > 0
      ? parsed.data.accessToken
      : undefined;

  if (existing) {
    await db
      .update(whatsappSettings)
      .set({ ...values, ...(accessToken ? { accessToken } : {}) })
      .where(eq(whatsappSettings.id, existing.id));
  } else {
    await db.insert(whatsappSettings).values({ ...values, accessToken: accessToken ?? null });
  }

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function updateWhatsappTemplateAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = whatsappTemplateSchema.safeParse({
    event: formData.get("event"),
    templateName: formData.get("templateName") ?? "",
    languageCode: formData.get("languageCode") || "en_US",
    enabled: formData.get("enabled") === "on",
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await db
    .update(whatsappTemplates)
    .set({
      templateName: parsed.data.templateName || null,
      languageCode: parsed.data.languageCode,
      enabled: parsed.data.enabled ? 1 : 0,
      updatedAt: new Date(),
    })
    .where(eq(whatsappTemplates.event, parsed.data.event));

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export type TestMessageState = {
  error?: string;
  success?: boolean;
};

export async function sendTestMessageAction(
  _prevState: TestMessageState,
  formData: FormData
): Promise<TestMessageState> {
  const parsed = sendTestMessageSchema.safeParse({ phone: formData.get("phone") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid phone number." };
  }

  const settings = await db.query.whatsappSettings.findFirst();
  if (!settings || settings.enabled !== 1 || !settings.accessToken || !settings.phoneNumberId) {
    return { error: "WhatsApp is not enabled, or Access Token / Phone Number ID is missing." };
  }

  const template = await db.query.whatsappTemplates.findFirst({
    where: eq(whatsappTemplates.event, "job_received"),
  });
  if (!template?.templateName || template.enabled !== 1) {
    return {
      error:
        "No enabled template configured for the \"Job Received\" event — configure one below to send a test.",
    };
  }

  const phone = formatPhoneForWhatsapp(parsed.data.phone, settings.defaultCountryCode);
  if (!phone) {
    return { error: "Could not normalize that phone number." };
  }

  const result = await sendWhatsappTemplateMessage({
    accessToken: settings.accessToken,
    phoneNumberId: settings.phoneNumberId,
    apiVersion: settings.apiVersion,
    to: phone,
    templateName: template.templateName,
    languageCode: template.languageCode,
    bodyParams: ["Test Customer", "JOB-TEST-0000", "Test Device", "Received"],
  });

  if (!result.success) {
    return { error: result.error };
  }

  return { success: true };
}
