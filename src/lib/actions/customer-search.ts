"use server";

import { db } from "@/db";
import { customers } from "@/db/schema";
import { auth } from "@/auth";
import { desc, ilike, or } from "drizzle-orm";
import type { CustomerOption } from "@/components/customers/customer-combobox";

const RESULT_LIMIT = 20;

// Backs the customer picker: it searches on the server as you type instead of
// shipping the whole customer list to the browser on every form/page load.
export async function searchCustomersAction(query: string): Promise<CustomerOption[]> {
  const session = await auth();
  if (!session?.user) return [];

  const q = query.trim().slice(0, 100);
  const columns = { id: customers.id, name: customers.name, phone: customers.phone };

  if (!q) {
    // Empty search: most recently added customers first.
    return db.select(columns).from(customers).orderBy(desc(customers.createdAt)).limit(RESULT_LIMIT);
  }

  const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  return db
    .select(columns)
    .from(customers)
    .where(or(ilike(customers.name, pattern), ilike(customers.phone, pattern)))
    .orderBy(customers.name)
    .limit(RESULT_LIMIT);
}
