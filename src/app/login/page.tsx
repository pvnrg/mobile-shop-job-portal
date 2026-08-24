import { LoginForm } from "./login-form";
import { Smartphone } from "lucide-react";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-muted/50 via-background to-muted/30 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Smartphone className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">MobileFix Portal</h1>
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
