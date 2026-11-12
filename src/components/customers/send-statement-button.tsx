import { getStatementShare } from "@/lib/statement";
import { isWhatsappEventReady } from "@/lib/whatsapp/notify";
import { SendStatementButtonClient } from "./send-statement-button-client";

// One-click "Send Statement": sends through the WhatsApp Business API when the
// "Account Statement" template is enabled in Settings, otherwise opens WhatsApp
// (app or web) with the statement message and link already filled in.
export async function SendStatementButton({ customerId }: { customerId: number }) {
  const apiReady = await isWhatsappEventReady("account_statement");
  const share = apiReady ? null : await getStatementShare(customerId);
  return <SendStatementButtonClient customerId={customerId} apiReady={apiReady} waLink={share?.waLink ?? null} />;
}
