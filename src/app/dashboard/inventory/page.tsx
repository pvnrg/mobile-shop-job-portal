import Link from "next/link";
import { db } from "@/db";
import { parts } from "@/db/schema";
import { asc, ilike, or, sql } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Boxes, Plus, Search } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const rows = await db
    .select()
    .from(parts)
    .where(
      q
        ? or(
            ilike(parts.name, `%${q}%`),
            ilike(parts.sku, `%${q}%`),
            ilike(parts.category, `%${q}%`)
          )
        : sql`true`
    )
    .orderBy(asc(parts.name))
    .limit(300);

  const lowStockCount = rows.filter(
    (p) => p.active === 1 && p.quantityInStock <= p.lowStockThreshold
  ).length;
  const totalStockValue = rows.reduce(
    (sum, p) => sum + Number(p.unitCost) * p.quantityInStock,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground">
            Track spare parts stock, costs, and usage
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/inventory/new">
            <Plus className="h-4 w-4" />
            Add Part
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Parts</div>
            <div className="text-2xl font-semibold">{rows.length}</div>
          </CardContent>
        </Card>
        <Card className={lowStockCount > 0 ? "border-red-200" : undefined}>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Low Stock Items</div>
            <div className={`text-2xl font-semibold ${lowStockCount > 0 ? "text-red-600" : ""}`}>
              {lowStockCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Stock Value (Cost)</div>
            <div className="text-2xl font-semibold">{formatCurrency(totalStockValue)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form className="mb-4 flex gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                name="q"
                placeholder="Search by name, SKU, or category..."
                defaultValue={q}
                className="pl-8"
              />
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>

          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <Boxes className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No parts in inventory yet.</p>
              <Button asChild size="sm" variant="outline">
                <Link href="/dashboard/inventory/new">Add your first part</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part</TableHead>
                    <TableHead className="hidden sm:table-cell">Category</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead className="hidden md:table-cell">Unit Cost</TableHead>
                    <TableHead className="hidden md:table-cell">Selling Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((p) => {
                    const isLow = p.quantityInStock <= p.lowStockThreshold;
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <Link
                            href={`/dashboard/inventory/${p.id}`}
                            className="font-medium hover:underline"
                          >
                            {p.name}
                          </Link>
                          {p.sku && (
                            <div className="text-xs text-muted-foreground">{p.sku}</div>
                          )}
                          {p.active !== 1 && (
                            <Badge variant="outline" className="mt-1 text-[10px]">
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {p.category || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              isLow
                                ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30"
                                : "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30"
                            }
                          >
                            {p.quantityInStock} in stock
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {formatCurrency(p.unitCost)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {formatCurrency(p.sellingPrice)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
