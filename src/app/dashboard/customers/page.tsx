import Link from "next/link";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { getCustomerBalances } from "@/lib/balances";
import { desc, ilike, or, sql } from "drizzle-orm";
import { Pagination, PAGE_SIZE, parsePage } from "@/components/layout/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  const where = q
    ? or(
        ilike(customers.name, `%${q}%`),
        ilike(customers.phone, `%${q}%`),
        ilike(customers.email, `%${q}%`)
      )
    : sql`true`;

  const [rows, [{ count: total }]] = await Promise.all([
    db
      .select()
      .from(customers)
      .where(where)
      .orderBy(desc(customers.createdAt), desc(customers.id))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ count: sql<number>`count(*)::int` }).from(customers).where(where),
  ]);

  // Udhar for just the customers on this page — same rule as the customer
  // page and statement (billed − paid, see lib/balances).
  const balances = await getCustomerBalances(rows.map((c) => c.id));
  const udharByCustomer = new Map([...balances].map(([id, b]) => [id, b.udhar]));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">
            Manage customer accounts and contact details
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/customers/new">
            <Plus className="h-4 w-4" />
            New Customer
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form className="mb-4 flex gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                name="q"
                placeholder="Search by name, phone, or email..."
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
              <Users className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No customers found.</p>
              <Button asChild size="sm" variant="outline">
                <Link href="/dashboard/customers/new">Add your first customer</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden sm:table-cell">GSTIN</TableHead>
                    <TableHead>Udhar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((c) => {
                    const udhar = udharByCustomer.get(c.id) ?? 0;
                    return (
                      <TableRow key={c.id} className="cursor-pointer">
                        <TableCell>
                          <Link
                            href={`/dashboard/customers/${c.id}`}
                            className="font-medium hover:underline"
                          >
                            {c.name}
                          </Link>
                        </TableCell>
                        <TableCell>{c.phone}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {c.email || "—"}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {c.gstin ? (
                            <Badge variant="outline">{c.gstin}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {udhar > 0 ? (
                            <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
                              {formatCurrency(udhar)}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                              No Udhar
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <Pagination page={page} total={total} basePath="/dashboard/customers" params={{ q }} />
        </CardContent>
      </Card>
    </div>
  );
}
