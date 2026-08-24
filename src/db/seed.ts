import { db } from "./index";
import { users, businessSettings } from "./schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function main() {
  const adminEmail = "admin@mobileshop.local";
  const existing = await db.query.users.findFirst({
    where: eq(users.email, adminEmail),
  });

  if (!existing) {
    const passwordHash = await bcrypt.hash("Admin@12345", 10);
    await db.insert(users).values({
      name: "Shop Admin",
      email: adminEmail,
      passwordHash,
      role: "admin",
    });
    console.log(`Created admin user: ${adminEmail} / Admin@12345`);
  } else {
    console.log("Admin user already exists, skipping.");
  }

  const settings = await db.query.businessSettings.findFirst();
  if (!settings) {
    await db.insert(businessSettings).values({
      businessName: "My Mobile Repair Shop",
    });
    console.log("Created default business settings.");
  } else {
    console.log("Business settings already exist, skipping.");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
