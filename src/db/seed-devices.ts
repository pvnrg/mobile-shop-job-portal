import { db } from "./index";
import { deviceTypes, brands, brandDeviceTypes, deviceModels } from "./schema";
import { eq } from "drizzle-orm";
import rawData from "./data/device-master-data.json";

type MasterData = {
  deviceTypes: string[];
  brands: { name: string; deviceTypes: string[] }[];
  models: { brand: string; deviceType: string; name: string }[];
};

const data = rawData as MasterData;

async function main() {
  const deviceTypeIdByName = new Map<string, number>();
  for (const [index, name] of data.deviceTypes.entries()) {
    const existing = await db.query.deviceTypes.findFirst({
      where: eq(deviceTypes.name, name),
    });
    if (existing) {
      deviceTypeIdByName.set(name, existing.id);
    } else {
      const [row] = await db
        .insert(deviceTypes)
        .values({ name, sortOrder: index })
        .returning({ id: deviceTypes.id });
      deviceTypeIdByName.set(name, row.id);
    }
  }
  console.log(`Device types: ${deviceTypeIdByName.size}`);

  const brandIdByName = new Map<string, number>();
  for (const brand of data.brands) {
    const existing = await db.query.brands.findFirst({
      where: eq(brands.name, brand.name),
    });
    let brandId: number;
    if (existing) {
      brandId = existing.id;
    } else {
      const [row] = await db
        .insert(brands)
        .values({ name: brand.name })
        .returning({ id: brands.id });
      brandId = row.id;
    }
    brandIdByName.set(brand.name, brandId);

    for (const dtName of brand.deviceTypes) {
      const deviceTypeId = deviceTypeIdByName.get(dtName);
      if (!deviceTypeId) continue;
      await db
        .insert(brandDeviceTypes)
        .values({ brandId, deviceTypeId })
        .onConflictDoNothing();
    }
  }
  console.log(`Brands: ${brandIdByName.size}`);

  let modelCount = 0;
  const BATCH_SIZE = 100;
  const rows = data.models
    .map((m) => {
      const brandId = brandIdByName.get(m.brand);
      const deviceTypeId = deviceTypeIdByName.get(m.deviceType);
      if (!brandId || !deviceTypeId) return null;
      return { brandId, deviceTypeId, name: m.name };
    })
    .filter((r): r is { brandId: number; deviceTypeId: number; name: string } => r !== null);

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await db.insert(deviceModels).values(batch).onConflictDoNothing();
    modelCount += batch.length;
  }
  console.log(`Models processed: ${modelCount}`);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
