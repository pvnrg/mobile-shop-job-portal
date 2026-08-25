"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, ChevronsUpDown, Loader2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/format";
import { addJobPartAction, removeJobPartAction, type JobPartFormState } from "@/lib/actions/parts";

export type PartOption = {
  id: number;
  name: string;
  sku: string | null;
  quantityInStock: number;
  sellingPrice: string;
};

export type JobPartUsage = {
  id: number;
  partId: number;
  partName: string;
  quantity: number;
  unitCostAtUse: string;
  unitPriceAtUse: string;
  usedAt: Date;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      Add
    </Button>
  );
}

function RemovePartButton({ jobPartId, jobId }: { jobPartId: number; jobId: number }) {
  return (
    <form action={removeJobPartAction.bind(null, jobPartId, jobId)}>
      <Button type="submit" size="icon" variant="ghost" className="h-7 w-7">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </form>
  );
}

export function JobPartsSection({
  jobId,
  parts,
  usages,
}: {
  jobId: number;
  parts: PartOption[];
  usages: JobPartUsage[];
}) {
  const action = addJobPartAction.bind(null, jobId);
  const [state, formAction] = useActionState<JobPartFormState, FormData>(action, {});
  const [open, setOpen] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState<number | undefined>();
  const formRef = useRef<HTMLFormElement>(null);
  const [initialState] = useState(state);
  const [prevState, setPrevState] = useState(state);

  if (state !== prevState) {
    setPrevState(state);
    if (state !== initialState && !state.error && !state.fieldErrors) {
      setSelectedPartId(undefined);
    }
  }

  useEffect(() => {
    if (state !== initialState && !state.error && !state.fieldErrors) {
      toast.success("Part added to job");
      formRef.current?.reset();
    }
  }, [state, initialState]);

  const selectedPart = useMemo(
    () => parts.find((p) => p.id === selectedPartId),
    [parts, selectedPartId]
  );

  const totalPartsCost = usages.reduce(
    (sum, u) => sum + Number(u.unitPriceAtUse) * u.quantity,
    0
  );

  return (
    <div className="space-y-4">
      {usages.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead className="hidden sm:table-cell">Price</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {usages.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.partName}</TableCell>
                  <TableCell>{u.quantity}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {formatCurrency(Number(u.unitPriceAtUse) * u.quantity)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {formatDate(u.usedAt)}
                  </TableCell>
                  <TableCell>
                    <RemovePartButton jobPartId={u.id} jobId={jobId} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-2 text-right text-sm text-muted-foreground">
            Parts total: <span className="font-medium text-foreground">{formatCurrency(totalPartsCost)}</span>
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No parts used on this job yet.</p>
      )}

      <form
        ref={formRef}
        action={formAction}
        className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed p-3"
      >
        <input type="hidden" name="partId" value={selectedPartId ?? ""} />
        <div className="min-w-48 flex-1 space-y-1.5">
          <Label className="text-xs">Part</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                className="w-full justify-between font-normal"
              >
                <span className={cn("truncate", !selectedPart && "text-muted-foreground")}>
                  {selectedPart
                    ? `${selectedPart.name} (${selectedPart.quantityInStock} in stock)`
                    : "Select part..."}
                </span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search parts..." />
                <CommandList>
                  <CommandEmpty>No parts found.</CommandEmpty>
                  <CommandGroup>
                    {parts.map((p) => (
                      <CommandItem
                        key={p.id}
                        value={`${p.name} ${p.sku ?? ""}`}
                        onSelect={() => {
                          setSelectedPartId(p.id);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "h-4 w-4",
                            selectedPartId === p.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex-1">
                          <div>{p.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(p.sellingPrice)} · {p.quantityInStock} in stock
                          </div>
                        </div>
                        {p.quantityInStock <= 0 && (
                          <Badge variant="outline" className="text-[10px]">
                            Out of stock
                          </Badge>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="w-20 space-y-1.5">
          <Label className="text-xs">Qty</Label>
          <Input name="quantity" type="number" min="1" step="1" defaultValue={1} />
        </div>
        <SubmitButton />
      </form>
      {(state.error || state.fieldErrors?.partId || state.fieldErrors?.quantity) && (
        <p className="text-xs text-destructive">
          {state.error || state.fieldErrors?.partId?.[0] || state.fieldErrors?.quantity?.[0]}
        </p>
      )}
    </div>
  );
}
