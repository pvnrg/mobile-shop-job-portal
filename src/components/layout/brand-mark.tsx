import Image from "next/image";
import { Smartphone } from "lucide-react";
import { getLogoUrl } from "@/lib/logo";

export function BrandMark({ logoPath }: { logoPath: string | null | undefined }) {
  const logoUrl = getLogoUrl(logoPath);

  if (logoUrl) {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-background">
        <Image src={logoUrl} alt="" width={32} height={32} className="h-full w-full object-contain" unoptimized />
      </div>
    );
  }

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
      <Smartphone className="h-4 w-4" />
    </div>
  );
}
