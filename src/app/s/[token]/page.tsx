import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { getLogoUrl } from "@/lib/logo";
import { getCustomerLedger, getCustomerStatement, parseStatementPeriod } from "@/lib/statement";
import { AccountStatement } from "@/components/statement/account-statement";
import { PrintButton } from "@/components/invoices/print-button";
import { CheckCircle2, FileDown, IndianRupee, Phone } from "lucide-react";

// Public, read-only udhar statement opened from the WhatsApp reminder link.
// Access is by unguessable token only, so keep personal details minimal and
// never let search engines index it.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Account Statement",
  robots: { index: false, follow: false },
};

export default async function CustomerStatementPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { token } = await params;
  const period = parseStatementPeriod((await searchParams).period);
  if (!token || token.length < 16) notFound();

  const customer = await db.query.customers.findFirst({
    where: eq(customers.statementToken, token),
  });
  if (!customer) notFound();

  const [business, statement, ledger] = await Promise.all([
    db.query.businessSettings.findFirst(),
    getCustomerStatement(customer.id),
    getCustomerLedger(customer.id, period),
  ]);

  const businessName = business?.businessName ?? "Mobile Repair Shop";
  const logoUrl = getLogoUrl(business?.logoPath);
  const { pendingInvoices, outstanding } = statement;

  const upiLink =
    business?.upiId && outstanding > 0
      ? // `pa` stays unencoded: some UPI apps don't decode "%40" back to "@".
        // The UPI ID is validated in Settings, so it holds only safe characters.
        `upi://pay?pa=${business.upiId}&pn=${encodeURIComponent(businessName)}` +
        `&am=${outstanding.toFixed(2)}&cu=INR` +
        `&tn=${encodeURIComponent(`Udhar payment - ${customer.name}`)}`
      : null;

  return (
    <div className="min-h-full bg-muted/40">
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:py-10 print:max-w-none print:p-0">
        <header className="flex items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-10 w-10 rounded-md object-contain" />
          ) : null}
          <div className="min-w-0">
            <p className="truncate font-semibold">{businessName}</p>
            {business?.address && (
              <p className="truncate text-xs text-muted-foreground">{business.address}</p>
            )}
          </div>
        </header>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Account statement for</p>
              <h1 className="text-xl font-semibold">{customer.name}</h1>
              <p className="text-xs text-muted-foreground">As of {formatDate(new Date())}</p>
            </div>

            {outstanding > 0 ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
                <p className="text-sm text-muted-foreground">Total outstanding</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(outstanding)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {pendingInvoices.length} pending {pendingInvoices.length === 1 ? "bill" : "bills"}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                <p className="font-medium">All clear — nothing outstanding. Thank you!</p>
              </div>
            )}

            {(upiLink || business?.phone) && (
              <div className="flex flex-col gap-2 sm:flex-row print:hidden">
                {upiLink && (
                  <Button asChild className="flex-1">
                    <a href={upiLink}>
                      <IndianRupee className="h-4 w-4" />
                      Pay {formatCurrency(outstanding)} via UPI
                    </a>
                  </Button>
                )}
                {business?.phone && (
                  <Button asChild variant="outline" className="flex-1">
                    <a href={`tel:${business.phone}`}>
                      <Phone className="h-4 w-4" />
                      Call {business.phone}
                    </a>
                  </Button>
                )}
              </div>
            )}
            {upiLink && (
              <p className="text-xs text-muted-foreground print:hidden">
                UPI ID: <span className="font-mono">{business?.upiId}</span>. The UPI button opens
                your payment app on a phone. Your balance updates once the shop records the payment.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="print:border-none print:shadow-none">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Account statement</CardTitle>
            <div className="flex gap-2 print:hidden">
              <Button asChild size="sm" variant="outline">
                <a href={`/s/${token}/pdf${period === "all" ? "" : `?period=${period}`}`} target="_blank" rel="noreferrer">
                  <FileDown className="h-4 w-4" /> PDF
                </a>
              </Button>
              <PrintButton />
            </div>
          </CardHeader>
          <CardContent>
            <AccountStatement
              ledger={ledger}
              outstandingOnBills={outstanding}
              periodHref={(p) => (p === "all" ? `/s/${token}` : `/s/${token}?period=${p}`)}
            />
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Questions about this statement? Contact {businessName}
          {business?.phone ? ` on ${business.phone}` : ""}.
        </p>
      </div>
    </div>
  );
}
