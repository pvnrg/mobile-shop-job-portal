"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SidebarNav } from "./sidebar-nav";
import { BrandMark } from "./brand-mark";

export function MobileNav({
  logoPath,
  businessName,
}: {
  logoPath?: string | null;
  businessName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b px-4 py-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <BrandMark logoPath={logoPath} />
            <span className="truncate">{businessName}</span>
          </SheetTitle>
        </SheetHeader>
        <div className="p-3">
          <SidebarNav onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
