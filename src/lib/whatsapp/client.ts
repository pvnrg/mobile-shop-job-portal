// The public docs site (richautomate.in) is marketing/dashboard only — the actual
// API backend lives on a separate subdomain, confirmed against a real send.
const RICHAUTOMATE_BASE_URL = "https://whatsappbe.richdaddy.in/api/v1";

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
  const url = `${RICHAUTOMATE_BASE_URL}/send-template`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        phone: input.to,
        template: input.templateName,
        language: input.languageCode,
        // RichAutomate expects variables keyed by position ("1", "2", ...),
        // not a plain array — confirmed against a real send.
        variables: Object.fromEntries(input.bodyParams.map((v, i) => [String(i + 1), v])),
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        data?.message || data?.error || `RichAutomate API request failed with status ${response.status}`;
      return { success: false, error: message };
    }

    const messageId = data?.message_id || data?.id || data?.data?.message_id || data?.data?.id;
    if (!messageId) {
      // RichAutomate can return HTTP 200 with an error-shaped body (e.g. { message: "..." })
      // instead of a non-2xx status — don't treat that as success just because the status is ok.
      const message = data?.message || data?.error || "RichAutomate did not confirm the message was sent.";
      return { success: false, error: message };
    }

    return { success: true, messageId: String(messageId) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown network error";
    return { success: false, error: message };
  }
}
