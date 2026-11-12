import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const PAGE_SIZE = 50;

export function parsePage(value: string | undefined) {
  const n = Number(value);
  return Number.isInteger(n) && n > 1 ? n : 1;
}

// Server-rendered prev/next pager that keeps the current filters in the URL.
export function Pagination({
  page,
  total,
  pageSize = PAGE_SIZE,
  basePath,
  params,
}: {
  page: number;
  total: number;
  pageSize?: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-2 border-t px-4 pt-4 text-sm">
      <p className="text-muted-foreground">
        {from}–{to} of {total}
      </p>
      {pageCount > 1 && (
        <div className="flex items-center gap-2">
          <Button asChild={page > 1} variant="outline" size="sm" disabled={page <= 1}>
            {page > 1 ? (
              <Link href={href(page - 1)} aria-label="Previous page">
                <ChevronLeft className="h-4 w-4" /> Prev
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1">
                <ChevronLeft className="h-4 w-4" /> Prev
              </span>
            )}
          </Button>
          <span className="text-muted-foreground">
            {page} / {pageCount}
          </span>
          <Button asChild={page < pageCount} variant="outline" size="sm" disabled={page >= pageCount}>
            {page < pageCount ? (
              <Link href={href(page + 1)} aria-label="Next page">
                Next <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1">
                Next <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
