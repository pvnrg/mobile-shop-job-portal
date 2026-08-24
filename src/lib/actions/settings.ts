"use server";

import { db } from "@/db";
import { businessSettings, users } from "@/db/schema";
import { businessSettingsSchema, staffSchema } from "@/lib/validation/settings";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

export async function updateBusinessSettingsAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = businessSettingsSchema.safeParse({
    businessName: formData.get("businessName"),
    gstin: formData.get("gstin") ? String(formData.get("gstin")).toUpperCase() : "",
    address: formData.get("address"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    invoicePrefix: formData.get("invoicePrefix"),
    jobPrefix: formData.get("jobPrefix"),
    defaultCgstPercent: formData.get("defaultCgstPercent"),
    defaultSgstPercent: formData.get("defaultSgstPercent"),
    defaultIgstPercent: formData.get("defaultIgstPercent"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const existing = await db.query.businessSettings.findFirst();

  const values = {
    businessName: parsed.data.businessName,
    gstin: parsed.data.gstin || null,
    address: parsed.data.address || null,
    phone: parsed.data.phone || null,
    email: parsed.data.email || null,
    invoicePrefix: parsed.data.invoicePrefix,
    jobPrefix: parsed.data.jobPrefix,
    defaultCgstPercent: String(parsed.data.defaultCgstPercent),
    defaultSgstPercent: String(parsed.data.defaultSgstPercent),
    defaultIgstPercent: String(parsed.data.defaultIgstPercent),
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(businessSettings).set(values).where(eq(businessSettings.id, existing.id));
  } else {
    await db.insert(businessSettings).values(values);
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/invoices");
  return { success: true };
}

export async function createStaffAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = staffSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.email.toLowerCase()),
  });
  if (existing) {
    return { fieldErrors: { email: ["A user with this email already exists."] } };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await db.insert(users).values({
    name: parsed.data.name,
    email: parsed.data.email.toLowerCase(),
    passwordHash,
    role: parsed.data.role,
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function toggleStaffActiveAction(userId: number, active: boolean) {
  await db
    .update(users)
    .set({ active: active ? 1 : 0 })
    .where(eq(users.id, userId));
  revalidatePath("/dashboard/settings");
}
