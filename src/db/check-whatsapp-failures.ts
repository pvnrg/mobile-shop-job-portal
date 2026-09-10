// Run on a cron schedule (see DEPLOYMENT.md) to email an alert whenever a
// WhatsApp message fails to send. Tracks the highest whatsapp_messages.id
// already alerted on in a local state file so each failure is emailed
// exactly once, regardless of the cron interval.
import { db } from "./index";
import { whatsappMessages } from "./schema";
import { gt, eq, and, desc } from "drizzle-orm";
import { sendAlertEmail } from "../lib/email";
import fs from "node:fs";
import path from "node:path";

const STATE_FILE = path.join(process.cwd(), ".whatsapp-alert-state.json");

function readLastAlertedId(): number {
  try {
    const raw = fs.readFileSync(STATE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as { lastAlertedId?: number };
    return parsed.lastAlertedId ?? 0;
  } catch {
    return 0;
  }
}

function writeLastAlertedId(id: number) {
  fs.writeFileSync(STATE_FILE, JSON.stringify({ lastAlertedId: id }, null, 2));
}

async function main() {
  const lastAlertedId = readLastAlertedId();

  const failures = await db
    .select()
    .from(whatsappMessages)
    .where(and(eq(whatsappMessages.status, "failed"), gt(whatsappMessages.id, lastAlertedId)))
    .orderBy(desc(whatsappMessages.id));

  if (failures.length === 0) {
    console.log("No new WhatsApp failures.");
    process.exit(0);
  }

  const maxId = Math.max(...failures.map((f) => f.id));

  const lines = failures
    .slice()
    .reverse()
    .map(
      (f) =>
        `- [${f.sentAt.toISOString()}] event=${f.event} phone=${f.phone}\n  error: ${f.errorMessage ?? "(no message)"}`
    );

  const subject = `[Sai Mobile] ${failures.length} WhatsApp message${failures.length > 1 ? "s" : ""} failed to send`;
  const text = `${failures.length} WhatsApp message(s) failed to send:\n\n${lines.join("\n\n")}\n\nCheck Settings → WhatsApp in the app for connection/template status.`;

  await sendAlertEmail(subject, text);
  writeLastAlertedId(maxId);

  console.log(`Alerted on ${failures.length} failure(s), up to id ${maxId}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[check-whatsapp-failures] failed", err);
  process.exit(1);
});
