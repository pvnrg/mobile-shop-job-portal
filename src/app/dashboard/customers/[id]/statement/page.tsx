import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { formatDate } from "@/lib/format";
import {
  getCustomerLedger,
  getCustomerStatement,
  parseStatementPeriod,
  statementPeriods,
} from "@/lib/statement";
import { AccountStatement } from "@/components/statement/account-statement";
import { PrintButton } from "@/components/invoices/print-button";
import { CopyStatementLinkButton } from "@/components/customers/copy-statement-link-button";
import { SendStatementButton } from "@/components/customers/send-statement-button";

export default async function CustomerStatementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { id } = await params;
  const customerId = Number(id);
  if (!Number.isFinite(customerId)) notFound();
  const period = parseStatementPeriod((await searchParams).period);

  const [customer, business, statement, ledger] = await Promise.all([
    db.query.customers.findFirst({ where: eq(customers.id, customerId) }),
    db.query.businessSettings.findFirst(),
    getCustomerStatement(customerId),
    getCustomerLedger(customerId, period),
  ]);
  if (!customer) notFound();

  const base = `/dashboard/customers/${customerId}/statement`;
  const periodLabel = statementPeriods.find((p) => p.value === period)?.label ?? "All time";

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/dashboard/customers/${customerId}`}>
            <ArrowLeft className="h-4 w-4" /> {customer.name}
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <SendStatementButton customerId={customerId} />
          <CopyStatementLinkButton customerId={customerId} />
          <PrintButton />
        </div>
      </div>

      <Card className="print:border-none print:shadow-none">
        <CardContent className="space-y-6 print:p-0">
          {/* Letterhead, like a bank statement */}
          <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:justify-between">
            <div>
              <p className="text-lg font-semibold">{business?.businessName ?? "Mobile Repair Shop"}</p>
              {business?.address && <p className="text-xs text-muted-foreground">{business.address}</p>}
              <p className="text-xs text-muted-foreground">
                {[business?.phone, business?.gstin ? `GSTIN ${business.gstin}` : null].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-sm font-semibold uppercase tracking-wide">Account Statement</p>
              <p className="text-xs text-muted-foreground">Period: {periodLabel}</p>
              <p className="text-xs text-muted-foreground">Generated {formatDate(new Date())}</p>
            </div>
          </div>

          <div className="text-sm">
            <p className="text-xs text-muted-foreground">Customer</p>
            <p className="font-semibold">{customer.name}</p>
            <p className="text-muted-foreground">{customer.phone}</p>
            {customer.address && <p className="text-muted-foreground">{customer.address}</p>}
            {customer.gstin && <p className="text-muted-foreground">GSTIN {customer.gstin}</p>}
          </div>

          <AccountStatement
            ledger={ledger}
            outstandingOnBills={statement.outstanding}
            periodHref={(p) => (p === "all" ? base : `${base}?period=${p}`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
