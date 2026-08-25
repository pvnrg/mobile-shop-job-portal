"use server";

import { db } from "@/db";
import { parts, partStockAdjustments, jobParts } from "@/db/schema";
import { partSchema, stockAdjustmentSchema, jobPartSchema } from "@/lib/validation/part";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function parsePartForm(formData: FormData) {
  return partSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku"),
    category: formData.get("category"),
    unitCost: formData.get("unitCost"),
    sellingPrice: formData.get("sellingPrice"),
    quantityInStock: formData.get("quantityInStock"),
    lowStockThreshold: formData.get("lowStockThreshold"),
    notes: formData.get("notes"),
  });
}

export async function createPartAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = parsePartForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const [part] = await db
    .insert(parts)
    .values({
      name: parsed.data.name,
      sku: parsed.data.sku || null,
      category: parsed.data.category || null,
      unitCost: String(parsed.data.unitCost),
      sellingPrice: String(parsed.data.sellingPrice),
      quantityInStock: parsed.data.quantityInStock,
      lowStockThreshold: parsed.data.lowStockThreshold,
      notes: parsed.data.notes || null,
    })
    .returning({ id: parts.id });

  revalidatePath("/dashboard/inventory");
  redirect(`/dashboard/inventory/${part.id}`);
}

export async function updatePartAction(
  partId: number,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = parsePartForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await db
    .update(parts)
    .set({
      name: parsed.data.name,
      sku: parsed.data.sku || null,
      category: parsed.data.category || null,
      unitCost: String(parsed.data.unitCost),
      sellingPrice: String(parsed.data.sellingPrice),
      lowStockThreshold: parsed.data.lowStockThreshold,
      notes: parsed.data.notes || null,
      updatedAt: new Date(),
    })
    .where(eq(parts.id, partId));

  revalidatePath("/dashboard/inventory");
  revalidatePath(`/dashboard/inventory/${partId}`);
  redirect(`/dashboard/inventory/${partId}`);
}

export async function toggleActivePartAction(partId: number, active: boolean) {
  await db
    .update(parts)
    .set({ active: active ? 1 : 0, updatedAt: new Date() })
    .where(eq(parts.id, partId));
  revalidatePath("/dashboard/inventory");
  revalidatePath(`/dashboard/inventory/${partId}`);
}

export type StockAdjustFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function adjustStockAction(
  partId: number,
  _prevState: StockAdjustFormState,
  formData: FormData
): Promise<StockAdjustFormState> {
  const parsed = stockAdjustmentSchema.safeParse({
    changeQuantity: formData.get("changeQuantity"),
    reason: formData.get("reason"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;

  await db.transaction(async (tx) => {
    const part = await tx.query.parts.findFirst({ where: eq(parts.id, partId) });
    if (!part) return;

    const newQty = part.quantityInStock + parsed.data.changeQuantity;
    if (newQty < 0) {
      throw new Error("Stock can't go below zero.");
    }

    await tx
      .update(parts)
      .set({ quantityInStock: newQty, updatedAt: new Date() })
      .where(eq(parts.id, partId));

    await tx.insert(partStockAdjustments).values({
      partId,
      changeQuantity: parsed.data.changeQuantity,
      reason: parsed.data.reason,
      note: parsed.data.note || null,
      recordedBy: userId,
    });
  });

  revalidatePath("/dashboard/inventory");
  revalidatePath(`/dashboard/inventory/${partId}`);
  return {};
}

export type JobPartFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function addJobPartAction(
  jobId: number,
  _prevState: JobPartFormState,
  formData: FormData
): Promise<JobPartFormState> {
  const parsed = jobPartSchema.safeParse({
    partId: formData.get("partId"),
    quantity: formData.get("quantity"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;

  try {
    await db.transaction(async (tx) => {
      const part = await tx.query.parts.findFirst({ where: eq(parts.id, parsed.data.partId) });
      if (!part) throw new Error("Part not found.");
      if (part.quantityInStock < parsed.data.quantity) {
        throw new Error(`Only ${part.quantityInStock} in stock.`);
      }

      await tx
        .update(parts)
        .set({ quantityInStock: part.quantityInStock - parsed.data.quantity, updatedAt: new Date() })
        .where(eq(parts.id, part.id));

      await tx.insert(jobParts).values({
        jobId,
        partId: part.id,
        quantity: parsed.data.quantity,
        unitCostAtUse: part.unitCost,
        unitPriceAtUse: part.sellingPrice,
        recordedBy: userId,
      });
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not add part." };
  }

  revalidatePath(`/dashboard/jobs/${jobId}`);
  revalidatePath("/dashboard/inventory");
  return {};
}

export async function removeJobPartAction(jobPartId: number, jobId: number) {
  await db.transaction(async (tx) => {
    const usage = await tx.query.jobParts.findFirst({ where: eq(jobParts.id, jobPartId) });
    if (!usage) return;

    const part = await tx.query.parts.findFirst({ where: eq(parts.id, usage.partId) });
    if (part) {
      await tx
        .update(parts)
        .set({ quantityInStock: part.quantityInStock + usage.quantity, updatedAt: new Date() })
        .where(eq(parts.id, part.id));
    }

    await tx.delete(jobParts).where(eq(jobParts.id, jobPartId));
  });

  revalidatePath(`/dashboard/jobs/${jobId}`);
  revalidatePath("/dashboard/inventory");
}
