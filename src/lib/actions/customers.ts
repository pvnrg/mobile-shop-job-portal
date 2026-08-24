"use server";

import { db } from "@/db";
import { customers } from "@/db/schema";
import { customerSchema } from "@/lib/validation/customer";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function parseForm(formData: FormData) {
  return customerSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
    gstin: formData.get("gstin")
      ? String(formData.get("gstin")).toUpperCase()
      : "",
    notes: formData.get("notes"),
  });
}

export async function createCustomerAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const [customer] = await db
    .insert(customers)
    .values({
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      gstin: parsed.data.gstin || null,
      notes: parsed.data.notes || null,
    })
    .returning({ id: customers.id });

  revalidatePath("/dashboard/customers");
  redirect(`/dashboard/customers/${customer.id}`);
}

export async function updateCustomerAction(
  id: number,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await db
    .update(customers)
    .set({
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      gstin: parsed.data.gstin || null,
      notes: parsed.data.notes || null,
      updatedAt: new Date(),
    })
    .where(eq(customers.id, id));

  revalidatePath("/dashboard/customers");
  revalidatePath(`/dashboard/customers/${id}`);
  redirect(`/dashboard/customers/${id}`);
}
