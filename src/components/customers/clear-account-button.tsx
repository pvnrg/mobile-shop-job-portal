"use client";

import { useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { clearCustomerAccountAction } from "@/lib/actions/account";
import { formatCurrency } from "@/lib/format";
import { paymentMethodLabels, paymentMethods, type PaymentMethod } from "@/lib/status";

export function ClearAccountButton({
  customerId,
  totalUdhar,
}: {
  customerId: number;
  totalUdhar: number;
}) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [pending, startTransition] = useTransition();

  if (totalUdhar <= 0) return null;

  function handleConfirm() {
    startTransition(async () => {
      await clearCustomerAccountAction(customerId, method);
      toast.success("Account cleared — all udhar settled");
      setOpen(false);
    });
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Wallet className="h-4 w-4" /> Clear Account
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear udhar account?</AlertDialogTitle>
            <AlertDialogDescription>
              This records a payment of {formatCurrency(totalUdhar)} covering every outstanding
              invoice for this customer and marks their account fully cleared (no udhar
              remaining).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="clear-account-method">Payment Method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger id="clear-account-method" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((m) => (
                  <SelectItem key={m} value={m}>
                    {paymentMethodLabels[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button onClick={handleConfirm} disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm — {formatCurrency(totalUdhar)}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
