import Image from "next/image";
import { Smartphone } from "lucide-react";
import { LoginForm } from "./login-form";
import { db } from "@/db";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const [{ callbackUrl }, settings] = await Promise.all([
    searchParams,
    db.query.businessSettings.findFirst(),
  ]);

  const businessName = settings?.businessName ?? "MobileFix Portal";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-muted/50 via-background to-muted/30 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          {settings?.logoPath ? (
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border bg-background">
              <Image
                src={settings.logoPath}
                alt=""
                width={48}
                height={48}
                className="h-full w-full object-contain"
                unoptimized
              />
            </div>
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Smartphone className="h-6 w-6" />
            </div>
          )}
          <h1 className="text-2xl font-semibold tracking-tight">{businessName}</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to manage jobs, customers, and payments
          </p>
        </div>
        <LoginForm callbackUrl={callbackUrl ?? "/dashboard"} />
        <p className="text-center text-xs text-muted-foreground">
          Default admin: admin@mobileshop.local / Admin@12345
        </p>
      </div>
    </div>
  );
}
