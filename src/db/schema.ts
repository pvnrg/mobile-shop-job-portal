import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  numeric,
  integer,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", ["admin", "staff", "accountant"]);

export const jobStatusEnum = pgEnum("job_status", [
  "received",
  "diagnosing",
  "waiting_parts",
  "repairing",
  "ready",
  "delivered",
  "cancelled",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "upi",
  "card",
  "bank_transfer",
  "other",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "issued",
  "partially_paid",
  "paid",
  "cancelled",
]);

export const notificationEventEnum = pgEnum("notification_event", [
  "job_received",
  "job_diagnosing",
  "job_waiting_parts",
  "job_repairing",
  "job_ready",
  "job_delivered",
  "job_cancelled",
  "invoice_created",
]);

export const whatsappMessageStatusEnum = pgEnum("whatsapp_message_status", [
  "sent",
  "failed",
  "not_configured",
]);

// ---------- Users (staff / admin accounts) ----------
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 160 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("staff"),
  phone: varchar("phone", { length: 20 }),
  active: integer("active").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Customers ----------
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 160 }),
  address: text("address"),
  gstin: varchar("gstin", { length: 15 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- Repair Jobs ----------
export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  jobNumber: varchar("job_number", { length: 30 }).notNull().unique(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "restrict" }),
  deviceType: varchar("device_type", { length: 60 }).notNull(),
  brand: varchar("brand", { length: 60 }),
  model: varchar("model", { length: 100 }),
  serialNumber: varchar("serial_number", { length: 100 }),
  issueDescription: text("issue_description").notNull(),
  accessories: text("accessories"),
  passcode: varchar("passcode", { length: 60 }),
  status: jobStatusEnum("status").notNull().default("received"),
  priority: varchar("priority", { length: 20 }).notNull().default("normal"),
  estimatedCost: numeric("estimated_cost", { precision: 10, scale: 2 }),
  finalCost: numeric("final_cost", { precision: 10, scale: 2 }),
  assignedTo: integer("assigned_to").references(() => users.id, {
    onDelete: "set null",
  }),
  createdBy: integer("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  promisedAt: timestamp("promised_at"),
  deliveredAt: timestamp("delivered_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- Job status history (audit trail) ----------
export const jobStatusHistory = pgTable("job_status_history", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  status: jobStatusEnum("status").notNull(),
  note: text("note"),
  changedBy: integer("changed_by").references(() => users.id, {
    onDelete: "set null",
  }),
  changedAt: timestamp("changed_at").notNull().defaultNow(),
});

// ---------- Media uploads (device photos, ID proofs, etc.) ----------
export const media = pgTable("media", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  filePath: varchar("file_path", { length: 500 }).notNull(),
  fileType: varchar("file_type", { length: 100 }),
  fileSize: integer("file_size"),
  category: varchar("category", { length: 40 }).notNull().default("device_photo"),
  caption: text("caption"),
  uploadedBy: integer("uploaded_by").references(() => users.id, {
    onDelete: "set null",
  }),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

// ---------- GST Invoices ----------
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: varchar("invoice_number", { length: 30 }).notNull().unique(),
  jobId: integer("job_id").references(() => jobs.id, { onDelete: "set null" }),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "restrict" }),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 10, scale: 2 }).notNull().default("0"),
  cgstAmount: numeric("cgst_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  sgstAmount: numeric("sgst_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  igstAmount: numeric("igst_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull().default("0"),
  amountPaid: numeric("amount_paid", { precision: 10, scale: 2 }).notNull().default("0"),
  status: invoiceStatusEnum("status").notNull().default("draft"),
  placeOfSupply: varchar("place_of_supply", { length: 60 }),
  notes: text("notes"),
  issuedAt: timestamp("issued_at"),
  dueAt: timestamp("due_at"),
  createdBy: integer("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- Invoice line items ----------
export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  description: varchar("description", { length: 255 }).notNull(),
  hsnSac: varchar("hsn_sac", { length: 20 }),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull().default("0"),
  taxRatePercent: numeric("tax_rate_percent", { precision: 5, scale: 2 }).notNull().default("18"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull().default("0"),
});

// ---------- Payments ----------
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => invoices.id, {
    onDelete: "set null",
  }),
  jobId: integer("job_id").references(() => jobs.id, { onDelete: "set null" }),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "restrict" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  method: paymentMethodEnum("method").notNull().default("cash"),
  reference: varchar("reference", { length: 120 }),
  notes: text("notes"),
  recordedBy: integer("recorded_by").references(() => users.id, {
    onDelete: "set null",
  }),
  paidAt: timestamp("paid_at").notNull().defaultNow(),
});

// ---------- Business / GST settings (single row) ----------
export const businessSettings = pgTable("business_settings", {
  id: serial("id").primaryKey(),
  businessName: varchar("business_name", { length: 160 }).notNull().default("My Mobile Repair Shop"),
  logoPath: varchar("logo_path", { length: 500 }),
  gstin: varchar("gstin", { length: 15 }),
  address: text("address"),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 160 }),
  invoicePrefix: varchar("invoice_prefix", { length: 20 }).notNull().default("INV"),
  jobPrefix: varchar("job_prefix", { length: 20 }).notNull().default("JOB"),
  defaultCgstPercent: numeric("default_cgst_percent", { precision: 5, scale: 2 }).notNull().default("9"),
  defaultSgstPercent: numeric("default_sgst_percent", { precision: 5, scale: 2 }).notNull().default("9"),
  defaultIgstPercent: numeric("default_igst_percent", { precision: 5, scale: 2 }).notNull().default("18"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- Device master data (Device Type / Brand / Model) ----------
export const deviceTypes = pgTable("device_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 60 }).notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const brands = pgTable("brands", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 80 }).notNull().unique(),
});

export const brandDeviceTypes = pgTable(
  "brand_device_types",
  {
    id: serial("id").primaryKey(),
    brandId: integer("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    deviceTypeId: integer("device_type_id")
      .notNull()
      .references(() => deviceTypes.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex("brand_device_type_uniq").on(t.brandId, t.deviceTypeId)]
);

export const deviceModels = pgTable(
  "device_models",
  {
    id: serial("id").primaryKey(),
    brandId: integer("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    deviceTypeId: integer("device_type_id")
      .notNull()
      .references(() => deviceTypes.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
  },
  (t) => [uniqueIndex("device_model_uniq").on(t.brandId, t.deviceTypeId, t.name)]
);

// ---------- Spare parts / inventory ----------
export const parts = pgTable("parts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  sku: varchar("sku", { length: 60 }),
  category: varchar("category", { length: 80 }),
  unitCost: numeric("unit_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  sellingPrice: numeric("selling_price", { precision: 10, scale: 2 }).notNull().default("0"),
  quantityInStock: integer("quantity_in_stock").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
  notes: text("notes"),
  active: integer("active").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const jobParts = pgTable("job_parts", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  partId: integer("part_id")
    .notNull()
    .references(() => parts.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull().default(1),
  unitCostAtUse: numeric("unit_cost_at_use", { precision: 10, scale: 2 }).notNull(),
  unitPriceAtUse: numeric("unit_price_at_use", { precision: 10, scale: 2 }).notNull(),
  usedAt: timestamp("used_at").notNull().defaultNow(),
  recordedBy: integer("recorded_by").references(() => users.id, { onDelete: "set null" }),
});

export const partStockAdjustments = pgTable("part_stock_adjustments", {
  id: serial("id").primaryKey(),
  partId: integer("part_id")
    .notNull()
    .references(() => parts.id, { onDelete: "cascade" }),
  changeQuantity: integer("change_quantity").notNull(),
  reason: varchar("reason", { length: 120 }),
  note: text("note"),
  recordedBy: integer("recorded_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- WhatsApp notifications ----------
export const whatsappSettings = pgTable("whatsapp_settings", {
  id: serial("id").primaryKey(),
  enabled: integer("enabled").notNull().default(0),
  accessToken: text("access_token"),
  phoneNumberId: varchar("phone_number_id", { length: 60 }),
  businessAccountId: varchar("business_account_id", { length: 60 }),
  apiVersion: varchar("api_version", { length: 20 }).notNull().default("v22.0"),
  defaultCountryCode: varchar("default_country_code", { length: 5 }).notNull().default("91"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const whatsappTemplates = pgTable("whatsapp_templates", {
  id: serial("id").primaryKey(),
  event: notificationEventEnum("event").notNull().unique(),
  templateName: varchar("template_name", { length: 120 }),
  languageCode: varchar("language_code", { length: 20 }).notNull().default("en_US"),
  enabled: integer("enabled").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const whatsappMessages = pgTable("whatsapp_messages", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
  jobId: integer("job_id").references(() => jobs.id, { onDelete: "set null" }),
  invoiceId: integer("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
  event: notificationEventEnum("event").notNull(),
  phone: varchar("phone", { length: 30 }).notNull(),
  templateName: varchar("template_name", { length: 120 }),
  status: whatsappMessageStatusEnum("status").notNull(),
  providerMessageId: varchar("provider_message_id", { length: 120 }),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
});

// ---------- Relations ----------
export const customersRelations = relations(customers, ({ many }) => ({
  jobs: many(jobs),
  invoices: many(invoices),
  payments: many(payments),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  customer: one(customers, { fields: [jobs.customerId], references: [customers.id] }),
  assignee: one(users, { fields: [jobs.assignedTo], references: [users.id] }),
  creator: one(users, { fields: [jobs.createdBy], references: [users.id] }),
  statusHistory: many(jobStatusHistory),
  media: many(media),
  invoices: many(invoices),
  payments: many(payments),
  partsUsed: many(jobParts),
}));

export const jobStatusHistoryRelations = relations(jobStatusHistory, ({ one }) => ({
  job: one(jobs, { fields: [jobStatusHistory.jobId], references: [jobs.id] }),
  changedByUser: one(users, { fields: [jobStatusHistory.changedBy], references: [users.id] }),
}));

export const mediaRelations = relations(media, ({ one }) => ({
  job: one(jobs, { fields: [media.jobId], references: [jobs.id] }),
  uploadedByUser: one(users, { fields: [media.uploadedBy], references: [users.id] }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  job: one(jobs, { fields: [invoices.jobId], references: [jobs.id] }),
  customer: one(customers, { fields: [invoices.customerId], references: [customers.id] }),
  items: many(invoiceItems),
  payments: many(payments),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceItems.invoiceId], references: [invoices.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, { fields: [payments.invoiceId], references: [invoices.id] }),
  job: one(jobs, { fields: [payments.jobId], references: [jobs.id] }),
  customer: one(customers, { fields: [payments.customerId], references: [customers.id] }),
  recordedByUser: one(users, { fields: [payments.recordedBy], references: [users.id] }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  assignedJobs: many(jobs),
}));

export const deviceTypesRelations = relations(deviceTypes, ({ many }) => ({
  brandDeviceTypes: many(brandDeviceTypes),
  models: many(deviceModels),
}));

export const brandsRelations = relations(brands, ({ many }) => ({
  brandDeviceTypes: many(brandDeviceTypes),
  models: many(deviceModels),
}));

export const brandDeviceTypesRelations = relations(brandDeviceTypes, ({ one }) => ({
  brand: one(brands, { fields: [brandDeviceTypes.brandId], references: [brands.id] }),
  deviceType: one(deviceTypes, {
    fields: [brandDeviceTypes.deviceTypeId],
    references: [deviceTypes.id],
  }),
}));

export const deviceModelsRelations = relations(deviceModels, ({ one }) => ({
  brand: one(brands, { fields: [deviceModels.brandId], references: [brands.id] }),
  deviceType: one(deviceTypes, {
    fields: [deviceModels.deviceTypeId],
    references: [deviceTypes.id],
  }),
}));

export const whatsappMessagesRelations = relations(whatsappMessages, ({ one }) => ({
  customer: one(customers, { fields: [whatsappMessages.customerId], references: [customers.id] }),
  job: one(jobs, { fields: [whatsappMessages.jobId], references: [jobs.id] }),
  invoice: one(invoices, { fields: [whatsappMessages.invoiceId], references: [invoices.id] }),
}));

export const partsRelations = relations(parts, ({ many }) => ({
  jobUsages: many(jobParts),
  stockAdjustments: many(partStockAdjustments),
}));

export const jobPartsRelations = relations(jobParts, ({ one }) => ({
  job: one(jobs, { fields: [jobParts.jobId], references: [jobs.id] }),
  part: one(parts, { fields: [jobParts.partId], references: [parts.id] }),
  recordedByUser: one(users, { fields: [jobParts.recordedBy], references: [users.id] }),
}));

export const partStockAdjustmentsRelations = relations(partStockAdjustments, ({ one }) => ({
  part: one(parts, { fields: [partStockAdjustments.partId], references: [parts.id] }),
  recordedByUser: one(users, { fields: [partStockAdjustments.recordedBy], references: [users.id] }),
}));
