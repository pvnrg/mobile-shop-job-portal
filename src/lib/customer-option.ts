import { db } from "@/db";
import { customers } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { CustomerOption } from "@/components/customers/customer-combobox";

// Loads just the one customer a picker should start with (e.g. from ?customerId=).
export async function getCustomerOption(id: number | null | undefined): Promise<CustomerOption | null> {
  if (!id || !Number.isFinite(id)) return null;
  const [row] = await db
    .select({ id: customers.id, name: customers.name, phone: customers.phone })
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1);
  return row ?? null;
}
