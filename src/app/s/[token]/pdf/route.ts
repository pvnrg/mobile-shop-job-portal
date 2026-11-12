import { db } from "@/db";
import { customers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseStatementPeriod } from "@/lib/statement";
import { renderStatementPdf } from "@/lib/statement-pdf";

// Public PDF of the customer's statement, by unguessable token — the same
// access rule as /s/<token>. WhatsApp (Meta) downloads this URL to attach the
// PDF to the Send Statement message, so it must not require a login.
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length < 16) return new Response("Not found", { status: 404 });

  const customer = await db.query.customers.findFirst({ where: eq(customers.statementToken, token) });
  if (!customer) return new Response("Not found", { status: 404 });

  const period = parseStatementPeriod(new URL(request.url).searchParams.get("period") ?? undefined);
  const pdf = await renderStatementPdf(customer.id, period);
  if (!pdf) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(pdf.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pdf.filename}"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
