import { db } from "@/db";
import { deviceTypes, brands, brandDeviceTypes, deviceModels } from "@/db/schema";
import { asc } from "drizzle-orm";

export type DeviceMasterData = {
  deviceTypes: { id: number; name: string }[];
  brands: { id: number; name: string; deviceTypeIds: number[] }[];
  models: { id: number; name: string; brandId: number; deviceTypeId: number }[];
};

export async function getDeviceMasterData(): Promise<DeviceMasterData> {
  const [typesRows, brandRows, linkRows, modelRows] = await Promise.all([
    db.select().from(deviceTypes).orderBy(asc(deviceTypes.sortOrder), asc(deviceTypes.name)),
    db.select().from(brands).orderBy(asc(brands.name)),
    db.select().from(brandDeviceTypes),
    db.select().from(deviceModels).orderBy(asc(deviceModels.name)),
  ]);

  const deviceTypeIdsByBrand = new Map<number, number[]>();
  for (const link of linkRows) {
    const list = deviceTypeIdsByBrand.get(link.brandId) ?? [];
    list.push(link.deviceTypeId);
    deviceTypeIdsByBrand.set(link.brandId, list);
  }

  return {
    deviceTypes: typesRows.map((t) => ({ id: t.id, name: t.name })),
    brands: brandRows.map((b) => ({
      id: b.id,
      name: b.name,
      deviceTypeIds: deviceTypeIdsByBrand.get(b.id) ?? [],
    })),
    models: modelRows.map((m) => ({
      id: m.id,
      name: m.name,
      brandId: m.brandId,
      deviceTypeId: m.deviceTypeId,
    })),
  };
}
