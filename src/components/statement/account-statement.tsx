import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/format";
import { paymentMethodLabels, type PaymentMethod } from "@/lib/status";
import { statementPeriods, type LedgerEntry, type getCustomerLedger } from "@/lib/statement";

type Ledger = Awaited<ReturnType<typeof getCustomerLedger>>;

// Positive = customer owes the shop (udhar); negative = advance with the shop.
function Balance({ value, className }: { value: number; className?: string }) {
  const rounded = Math.round(value * 100) / 100;
  if (rounded === 0) return <span className={cn("text-muted-foreground", className)}>{formatCurrency(0)}</span>;
  return (
    <span className={cn(rounded > 0 ? "text-red-600 dark:text-red-400" : "text-green-700 dark:text-green-400", className)}>
      {formatCurrency(Math.abs(rounded))}
      <span className="ml-1 text-[10px] font-medium uppercase">{rounded > 0 ? "Due" : "Adv"}</span>
    </span>
  );
}

function BillStatus({ entry }: { entry: Extract<LedgerEntry, { kind: "bill" }> }) {
  if (entry.billDue <= 0) {
    return (
      <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400">
        Paid
      </Badge>
    );
  }
  if (entry.billPaid > 0) {
    return (
      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
        Part paid · {formatCurrency(entry.billDue)} udhar
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400">
      Udhar · {formatCurrency(entry.billDue)}
    </Badge>
  );
}

function Particulars({ entry }: { entry: LedgerEntry }) {
  if (entry.kind === "bill") {
    return (
      <div className="min-w-0 space-y-1">
        <p className="font-medium">Bill {entry.invoiceNumber}</p>
        {(entry.device || entry.jobNumber) && (
          <p className="text-xs text-muted-foreground">
            {[entry.device, entry.jobNumber].filter(Boolean).join(" · ")}
          </p>
        )}
        <BillStatus entry={entry} />
      </div>
    );
  }
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="font-medium">
        Payment received · {paymentMethodLabels[entry.method as PaymentMethod] ?? entry.method}
      </p>
      <p className="text-xs text-muted-foreground">
        {[entry.invoiceNumber ? `For ${entry.invoiceNumber}` : "Not linked to a bill", entry.reference ? `Ref ${entry.reference}` : null]
          .filter(Boolean)
          .join(" · ")}
      </p>
    </div>
  );
}

export function AccountStatement({
  ledger,
  outstandingOnBills,
  periodHref,
}: {
  ledger: Ledger;
  /** Sum of unpaid bill balances, to explain when it differs from the closing balance. */
  outstandingOnBills: number;
  /** Builds the link for a period chip, e.g. (p) => `/s/abc?period=${p}`. */
  periodHref: (period: string) => string;
}) {
  const { entries, openingBalance, closingBalance, totalBilled, totalPaid, from } = ledger;
  const showOpening = from !== null;
  // Payments not linked to a bill lower the running balance but not the bill-wise udhar.
  const mismatch = from === null && Math.abs(Math.max(0, closingBalance) - outstandingOnBills) >= 0.01;

  const summary = [
    ...(showOpening ? [{ label: "Opening balance", node: <Balance value={openingBalance} /> }] : []),
    { label: "Total billed", node: <span>{formatCurrency(totalBilled)}</span> },
    { label: "Total paid", node: <span className="text-green-700 dark:text-green-400">{formatCurrency(totalPaid)}</span> },
    { label: "Closing balance", node: <Balance value={closingBalance} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 print:hidden">
        {statementPeriods.map((p) => (
          <Link key={p.value} href={periodHref(p.value)} scroll={false}>
            <Badge
              variant="outline"
              className={cn("cursor-pointer px-3 py-1", ledger.period === p.value && "bg-primary text-primary-foreground")}
            >
              {p.label}
            </Badge>
          </Link>
        ))}
      </div>

      <div className={cn("grid gap-2", showOpening ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3")}>
        {summary.map((s) => (
          <div key={s.label} className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-base font-semibold sm:text-lg">{s.node}</p>
          </div>
        ))}
      </div>

      {entries.length === 0 && !showOpening ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No bills or payments yet.</p>
      ) : (
        <>
          {/* Phone: passbook-style list */}
          <div className="divide-y rounded-lg border sm:hidden print:hidden">
            {showOpening && (
              <div className="flex items-center justify-between bg-muted/40 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Opening balance · {formatDate(from)}</span>
                <Balance value={openingBalance} className="font-medium" />
              </div>
            )}
            {entries.map((e) => (
              <div key={e.id} className="flex gap-3 px-3 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">{formatDate(e.date)}</p>
                  <Particulars entry={e} />
                </div>
                <div className="shrink-0 text-right">
                  <p className={cn("font-semibold", e.kind === "payment" && "text-green-700 dark:text-green-400")}>
                    {e.kind === "bill" ? "+ " : "− "}
                    {formatCurrency(e.kind === "bill" ? e.debit : e.credit)}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Balance</p>
                  <Balance value={e.balance} className="text-xs" />
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between bg-muted/40 px-3 py-2 text-sm font-medium">
              <span>Closing balance</span>
              <Balance value={closingBalance} />
            </div>
          </div>

          {/* Tablet/desktop and print: statement table */}
          <div className="hidden overflow-x-auto rounded-lg border sm:block print:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-left font-medium">Particulars</th>
                  <th className="px-3 py-2 text-right font-medium">Bill (Dr)</th>
                  <th className="px-3 py-2 text-right font-medium">Paid (Cr)</th>
                  <th className="px-3 py-2 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {showOpening && (
                  <tr className="bg-muted/30">
                    <td className="px-3 py-2 whitespace-nowrap">{formatDate(from)}</td>
                    <td className="px-3 py-2 text-muted-foreground" colSpan={3}>
                      Opening balance (brought forward)
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <Balance value={openingBalance} />
                    </td>
                  </tr>
                )}
                {entries.map((e) => (
                  <tr key={e.id} className="align-top">
                    <td className="px-3 py-3 whitespace-nowrap">{formatDate(e.date)}</td>
                    <td className="px-3 py-3">
                      <Particulars entry={e} />
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      {e.kind === "bill" ? formatCurrency(e.debit) : ""}
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap text-green-700 dark:text-green-400">
                      {e.kind === "payment" ? formatCurrency(e.credit) : ""}
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap font-medium">
                      <Balance value={e.balance} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t bg-muted/50 font-semibold">
                <tr>
                  <td className="px-3 py-2" colSpan={2}>
                    Totals &amp; closing balance
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">{formatCurrency(totalBilled)}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap text-green-700 dark:text-green-400">
                    {formatCurrency(totalPaid)}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <Balance value={closingBalance} />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {mismatch && (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          Unpaid bills add up to {formatCurrency(outstandingOnBills)}, but some payments are not linked to a
          specific bill, so the balance owed is the closing balance above.
        </p>
      )}
    </div>
  );
}
