import { auth } from "@/auth";
import { parseStatementPeriod } from "@/lib/statement";
import { renderStatementPdf } from "@/lib/statement-pdf";

export const dynamic = "force-dynamic";

// Staff download of a customer's statement PDF.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const customerId = Number((await params).id);
  if (!Number.isFinite(customerId)) return new Response("Not found", { status: 404 });

  const period = parseStatementPeriod(new URL(request.url).searchParams.get("period") ?? undefined);
  const pdf = await renderStatementPdf(customerId, period);
  if (!pdf) return new Response("Not found", { status: 404 });

  const download = new URL(request.url).searchParams.get("download") === "1";
  return new Response(new Uint8Array(pdf.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${pdf.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
