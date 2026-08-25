"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { adjustStockAction, type StockAdjustFormState } from "@/lib/actions/parts";

const reasons = ["Restock", "Correction", "Damaged / Written Off", "Returned by Customer", "Other"];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      Save Adjustment
    </Button>
  );
}

export function AdjustStockDialog({ partId, currentStock }: { partId: number; currentStock: number }) {
  const [open, setOpen] = useState(false);
  const action = adjustStockAction.bind(null, partId);
  const [state, formAction] = useActionState<StockAdjustFormState, FormData>(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  const [initialState] = useState(state);
  const [prevState, setPrevState] = useState(state);

  if (state !== prevState) {
    setPrevState(state);
    if (state !== initialState && !state.error && !state.fieldErrors) {
      setOpen(false);
    }
  }

  useEffect(() => {
    if (state !== initialState && !state.error && !state.fieldErrors) {
      toast.success("Stock adjusted");
      formRef.current?.reset();
    }
  }, [state, initialState]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <PackagePlus className="h-4 w-4" /> Adjust Stock
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Current stock: <span className="font-medium text-foreground">{currentStock}</span>
        </p>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="changeQuantity">Change Quantity</Label>
            <Input
              id="changeQuantity"
              name="changeQuantity"
              type="number"
              step="1"
              placeholder="e.g. 10 to add, -2 to remove"
              required
            />
            <p className="text-xs text-muted-foreground">
              Positive to add stock (e.g. new delivery), negative to remove (e.g. damaged).
            </p>
            {state.fieldErrors?.changeQuantity && (
              <p className="text-xs text-destructive">{state.fieldErrors.changeQuantity[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Select name="reason" defaultValue="Restock">
              <SelectTrigger id="reason" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea id="note" name="note" rows={2} />
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <SubmitButton />
        </form>
      </DialogContent>
    </Dialog>
  );
}
