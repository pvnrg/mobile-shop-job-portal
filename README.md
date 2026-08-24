# MobileFix Portal

A mobile repair shop management portal built with Next.js (App Router), PostgreSQL, and Drizzle ORM.

## Features

- **Job Management** — create and track repair jobs from intake to delivery, with a status timeline, technician assignment, and priority levels.
- **Customer Accounts** — customer directory with job history, invoices, and payment history per customer.
- **Payment Management** — record cash/UPI/card/bank-transfer payments against invoices, with automatic balance tracking.
- **GST Invoicing** — generate GST-compliant invoices (CGST+SGST or IGST) with line items, HSN/SAC codes, discounts, and a printable layout.
- **Media Uploads** — attach device photos, before/after repair photos, ID proofs, etc. to a job (stored on local disk).
- **Staff Accounts & Roles** — admin/staff/accountant roles, managed from Settings.

## Stack

- Next.js 16 (App Router, Server Actions)
- PostgreSQL + Drizzle ORM
- NextAuth (Auth.js) v5, credentials login
- Tailwind CSS + shadcn/ui

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and fill in your database URL and a random `AUTH_SECRET`.
3. Push the schema to your database:
   ```bash
   npm run db:push
   ```
4. Seed the default admin user and business settings:
   ```bash
   npm run db:seed
   ```
   This creates `admin@mobileshop.local` / `Admin@12345` — change the password after first login by adding a new admin in Settings → Staff and disabling the default one, or update it directly in the database.
5. Start the dev server:
   ```bash
   npm run dev
   ```

## Database scripts

- `npm run db:generate` — generate SQL migration files from schema changes
- `npm run db:push` — push the current schema directly to the database (used in dev)
- `npm run db:studio` — open Drizzle Studio to browse data
- `npm run db:seed` — seed the default admin user + business settings

## Notes

- Uploaded files are stored under `./uploads` (configurable via `UPLOAD_DIR`) and served through `/api/files/...`, which is protected by the same login as the rest of the portal.
- Job numbers and invoice numbers are auto-generated per year using the prefixes configured in Settings → Business & GST.
