"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const options = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function ThemeSettingsForm() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Deferring to a client-only render avoids a hydration mismatch, since the
  // server can't know the user's resolved theme ahead of time.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = mounted && theme === opt.value;
        return (
          <Button
            key={opt.value}
            type="button"
            variant="outline"
            className={cn(
              "gap-2",
              active && "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
            )}
            onClick={() => setTheme(opt.value)}
          >
            <Icon className="h-4 w-4" />
            {opt.label}
          </Button>
        );
      })}
    </div>
  );
}
