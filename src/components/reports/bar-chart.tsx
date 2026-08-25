import { formatCurrency } from "@/lib/format";

export type BarChartDatum = {
  label: string;
  value: number;
};

export function BarChart({ data }: { data: BarChartDatum[] }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No data for this period.</p>;
  }

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex items-end gap-1.5 overflow-x-auto pb-2" style={{ minHeight: 180 }}>
      {data.map((d, i) => {
        const heightPercent = Math.max(2, (d.value / max) * 100);
        return (
          <div key={i} className="flex min-w-8 flex-1 flex-col items-center gap-1.5">
            <div className="flex h-36 w-full items-end">
              <div
                className="w-full rounded-t bg-primary/80 transition-all hover:bg-primary"
                style={{ height: `${heightPercent}%` }}
                title={`${d.label}: ${formatCurrency(d.value)}`}
              />
            </div>
            <span className="whitespace-nowrap text-[10px] text-muted-foreground">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
