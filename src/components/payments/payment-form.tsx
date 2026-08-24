"use client";

import { useActionState } from "react";
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
import { Loader2 } from "lucide-react";
import { CustomerCombobox, type CustomerOption } from "@/components/customers/customer-combobox";
import { createPaymentAction, type FormState } from "@/lib/actions/payments";
import { paymentMethodLabels, paymentMethods } from "@/lib/status";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      Record Payment
    </Button>
  );
}

export function PaymentForm({
  customers,
  defaultCustomerId,
  defaultInvoiceId,
  suggestedAmount,
}: {
  customers: CustomerOption[];
  defaultCustomerId?: number;
  defaultInvoiceId?: number;
  suggestedAmount?: number;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(createPaymentAction, {});

  return (
    <form action={formAction} className="space-y-5">
      {defaultInvoiceId && <input type="hidden" name="invoiceId" value={defaultInvoiceId} />}
      <div className="space-y-2">
        <Label>Customer *</Label>
        <CustomerCombobox customers={customers} name="customerId" defaultValue={defaultCustomerId} />
        {state.fieldErrors?.customerId && (
          <p className="text-xs text-destructive">{state.fieldErrors.customerId[0]}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount (₹) *</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={suggestedAmount}
            required
          />
          {state.fieldErrors?.amount && (
            <p className="text-xs text-destructive">{state.fieldErrors.amount[0]}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="method">Method *</Label>
          <Select name="method" defaultValue="cash">
            <SelectTrigger id="method" className="w-full">
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="reference">Reference (transaction ID, cheque #...)</Label>
        <Input id="reference" name="reference" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
