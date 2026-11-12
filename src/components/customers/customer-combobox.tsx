"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Link from "next/link";
import { searchCustomersAction } from "@/lib/actions/customer-search";

export type CustomerOption = {
  id: number;
  name: string;
  phone: string;
};

const SEARCH_DEBOUNCE_MS = 250;

// Searches customers on the server as you type. Only the currently selected
// customer (if any) is passed in from the page.
export function CustomerCombobox({
  name,
  defaultCustomer,
}: {
  name: string;
  defaultCustomer?: CustomerOption | null;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CustomerOption | null>(defaultCustomer ?? null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerOption[] | null>(null);
  const [searching, startSearch] = useTransition();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      startSearch(async () => {
        const rows = await searchCustomersAction(query);
        if (!cancelled) setResults(rows);
      });
    }, query ? SEARCH_DEBOUNCE_MS : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, query]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">
            {selected ? `${selected.name} — ${selected.phone}` : "Select customer..."}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search customer by name or phone..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {results === null || (searching && results.length === 0) ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching...
              </div>
            ) : (
              <>
                <CommandEmpty>
                  <div className="flex flex-col items-center gap-2 py-4 text-sm">
                    No customer found.
                    <Button asChild size="sm" variant="outline">
                      <Link href="/dashboard/customers/new">
                        <Plus className="h-4 w-4" /> Add new customer
                      </Link>
                    </Button>
                  </div>
                </CommandEmpty>
                <CommandGroup heading={query ? undefined : "Recent customers"}>
                  {results.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={String(c.id)}
                      onSelect={() => {
                        setSelected(c);
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      <Check
                        className={cn("h-4 w-4", selected?.id === c.id ? "opacity-100" : "opacity-0")}
                      />
                      <div>
                        <div>{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.phone}</div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
