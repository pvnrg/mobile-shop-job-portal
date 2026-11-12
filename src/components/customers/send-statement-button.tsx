import { getStatementShare } from "@/lib/statement";
import { isWhatsappEventReady } from "@/lib/whatsapp/notify";
import { SendStatementButtonClient } from "./send-statement-button-client";

// One-click "Send Statement": sends through the WhatsApp Business API when the
// "Account Statement (PDF)" or "Account Statement" template is enabled in
// Settings (the PDF one attaches the statement as a PDF), otherwise opens
// WhatsApp (app or web) with the message, statement link and PDF link filled in.
export async function SendStatementButton({ customerId }: { customerId: number }) {
  const [pdfReady, linkReady] = await Promise.all([
    isWhatsappEventReady("account_statement_pdf"),
    isWhatsappEventReady("account_statement"),
  ]);
  const apiReady = pdfReady || linkReady;
  const share = apiReady ? null : await getStatementShare(customerId);
  return <SendStatementButtonClient customerId={customerId} apiReady={apiReady} waLink={share?.waLink ?? null} />;
}
