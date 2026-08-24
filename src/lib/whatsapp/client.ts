export function formatPhoneForWhatsapp(phone: string, defaultCountryCode: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.length === 10) return `${defaultCountryCode}${digits}`;
  if (digits.startsWith("0") && digits.length === 11) {
    return `${defaultCountryCode}${digits.slice(1)}`;
  }
  return digits;
}

export type SendTemplateMessageInput = {
  accessToken: string;
  phoneNumberId: string;
  apiVersion: string;
  to: string;
  templateName: string;
  languageCode: string;
  bodyParams: string[];
};

export type SendTemplateMessageResult =
  | { success: true; messageId: string }
  | { success: false; error: string };

export async function sendWhatsappTemplateMessage(
  input: SendTemplateMessageInput
): Promise<SendTemplateMessageResult> {
  const url = `https://graph.facebook.com/${input.apiVersion}/${input.phoneNumberId}/messages`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: input.to,
        type: "template",
        template: {
          name: input.templateName,
          language: { code: input.languageCode },
          components:
            input.bodyParams.length > 0
              ? [
                  {
                    type: "body",
                    parameters: input.bodyParams.map((text) => ({ type: "text", text })),
                  },
                ]
              : undefined,
        },
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        data?.error?.message || `WhatsApp API request failed with status ${response.status}`;
      return { success: false, error: message };
    }

    const messageId = data?.messages?.[0]?.id;
    if (!messageId) {
      return { success: false, error: "WhatsApp API returned no message id." };
    }

    return { success: true, messageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown network error";
    return { success: false, error: message };
  }
}
