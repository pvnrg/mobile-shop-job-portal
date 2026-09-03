import { db } from "@/db";
import { whatsappTemplates, whatsappMessages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatPhoneForWhatsapp, sendWhatsappTemplateMessage } from "./client";
import { notificationEvents, type NotificationEvent } from "./events";

export async function ensureWhatsappTemplateRows() {
  const existing = await db.select({ event: whatsappTemplates.event }).from(whatsappTemplates);
  const existingEvents = new Set(existing.map((r) => r.event));
  const missing = notificationEvents.filter((e) => !existingEvents.has(e));
  if (missing.length === 0) return;

  await db
    .insert(whatsappTemplates)
    .values(missing.map((event) => ({ event })))
    .onConflictDoNothing();
}

async function getConfig() {
  const settings = await db.query.whatsappSettings.findFirst();
  return settings ?? null;
}

async function logMessage(params: {
  customerId: number | null;
  jobId: number | null;
  jobDeviceId: number | null;
  invoiceId: number | null;
  event: NotificationEvent;
  phone: string;
  templateName: string | null;
  status: "sent" | "failed" | "not_configured";
  providerMessageId?: string;
  errorMessage?: string;
}) {
  await db.insert(whatsappMessages).values({
    customerId: params.customerId,
    jobId: params.jobId,
    jobDeviceId: params.jobDeviceId,
    invoiceId: params.invoiceId,
    event: params.event,
    phone: params.phone,
    templateName: params.templateName,
    status: params.status,
    providerMessageId: params.providerMessageId,
    errorMessage: params.errorMessage,
  });
}

type SendNotificationInput = {
  event: NotificationEvent;
  customerId: number;
  customerPhone: string;
  jobId?: number | null;
  jobDeviceId?: number | null;
  invoiceId?: number | null;
  bodyParams: string[];
};

export async function sendNotification(input: SendNotificationInput) {
  const settings = await getConfig();

  const template = await db.query.whatsappTemplates.findFirst({
    where: eq(whatsappTemplates.event, input.event),
  });

  const phone = formatPhoneForWhatsapp(
    input.customerPhone,
    settings?.defaultCountryCode ?? "91"
  );

  const notConfigured =
    !settings ||
    settings.enabled !== 1 ||
    !settings.accessToken ||
    !template ||
    template.enabled !== 1 ||
    !template.templateName ||
    !phone;

  if (notConfigured) {
    await logMessage({
      customerId: input.customerId,
      jobId: input.jobId ?? null,
      jobDeviceId: input.jobDeviceId ?? null,
      invoiceId: input.invoiceId ?? null,
      event: input.event,
      phone: phone ?? input.customerPhone,
      templateName: template?.templateName ?? null,
      status: "not_configured",
      errorMessage: !phone
        ? "Customer phone number could not be normalized."
        : "WhatsApp is not enabled or this event's template is not configured.",
    });
    return;
  }

  const result = await sendWhatsappTemplateMessage({
    accessToken: settings.accessToken!,
    to: phone,
    templateName: template.templateName!,
    languageCode: template.languageCode,
    bodyParams: input.bodyParams,
  });

  await logMessage({
    customerId: input.customerId,
    jobId: input.jobId ?? null,
    jobDeviceId: input.jobDeviceId ?? null,
    invoiceId: input.invoiceId ?? null,
    event: input.event,
    phone,
    templateName: template.templateName,
    status: result.success ? "sent" : "failed",
    providerMessageId: result.success ? result.messageId : undefined,
    errorMessage: result.success ? undefined : result.error,
  });
}
