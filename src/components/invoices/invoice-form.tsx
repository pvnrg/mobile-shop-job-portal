"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { CustomerCombobox, type CustomerOption } from "@/components/customers/customer-combobox";
import { computeInvoiceTotals, type GstType } from "@/lib/gst";
import { formatCurrency } from "@/lib/format";
import { paymentMethodLabels, paymentMethods } from "@/lib/status";
import type { FormState } from "@/lib/actions/invoices";

type LineItem = {
  description: string;
  hsnSac: string;
  quantity: number;
  unitPrice: number;
  taxRatePercent: number;
};

const emptyItem: LineItem = {
  description: "",
  hsnSac: "",
  quantity: 1,
  unitPrice: 0,
  taxRatePercent: 18,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      Create Invoice
    </Button>
  );
}

export function InvoiceForm({
  action,
  customers,
  defaultCustomerId,
  defaultJobId,
  defaultItems,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  customers: CustomerOption[];
  defaultCustomerId?: number;
  defaultJobId?: number;
  defaultItems?: LineItem[];
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  const [items, setItems] = useState<LineItem[]>(
    defaultItems && defaultItems.length > 0 ? defaultItems : [emptyItem]
  );
  const [gstType, setGstType] = useState<GstType>("intra");
  const [discount, setDiscount] = useState(0);
  const [amountPaid, setAmountPaid] = useState<number | "">("");

  const totals = useMemo(
    () => computeInvoiceTotals(items, discount, gstType),
    [items, discount, gstType]
  );

  function updateItem(index: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { ...emptyItem }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <form action={formAction} className="space-y-6">
      {defaultJobId && <input type="hidden" name="jobId" value={defaultJobId} />}
      <input type="hidden" name="items" value={JSON.stringify(items)} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Customer *</Label>
          <CustomerCombobox customers={customers} name="customerId" defaultValue={defaultCustomerId} />
          {state.fieldErrors?.customerId && (
            <p className="text-xs text-destructive">{state.fieldErrors.customerId[0]}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="placeOfSupply">Place of Supply</Label>
          <Input id="placeOfSupply" name="placeOfSupply" placeholder="e.g. Maharashtra" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>GST Type</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="gstType"
              value="intra"
              checked={gstType === "intra"}
              onChange={() => setGstType("intra")}
            />
            CGST + SGST (Intra-state)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="gstType"
              value="inter"
              checked={gstType === "inter"}
              onChange={() => setGstType("inter")}
            />
            IGST (Inter-state)
          </label>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Line Items</Label>
            <Button type="button" size="sm" variant="outline" onClick={addItem}>
              <Plus className="h-4 w-4" /> Add Item
            </Button>
          </div>
          <div className="space-y-3">
            {items.map((item, i) => (
              <div
                key={i}
                className="grid grid-cols-2 gap-2 rounded-lg border p-3 sm:grid-cols-12 sm:items-end"
              >
                <div className="col-span-2 space-y-1 sm:col-span-4">
                  <Label className="text-xs">Description</Label>
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(i, { description: e.target.value })}
                    placeholder="Screen replacement..."
                    required
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">HSN/SAC</Label>
                  <Input
                    value={item.hsnSac}
                    onChange={(e) => updateItem(i, { hsnSac: e.target.value })}
                    placeholder="9987"
                  />
                </div>
                <div className="space-y-1 sm:col-span-1">
                  <Label className="text-xs">Qty</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Unit Price (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(i, { unitPrice: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1 sm:col-span-1">
                  <Label className="text-xs">Tax %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={item.taxRatePercent}
                    onChange={(e) => updateItem(i, { taxRatePercent: Number(e.target.value) })}
                  />
                </div>
                <div className="flex items-center justify-between gap-2 sm:col-span-2">
                  <span className="text-sm font-medium">
                    {formatCurrency(item.quantity * item.unitPrice)}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={items.length === 1}
                    onClick={() => removeItem(i)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {state.fieldErrors?.items && (
            <p className="text-xs text-destructive">{state.fieldErrors.items[0]}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="discount">Discount (₹)</Label>
          <Input
            id="discount"
            name="discount"
            type="number"
            min="0"
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(Number(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueAt">Due Date</Label>
          <Input id="dueAt" name="dueAt" type="date" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>

      <Card className="bg-muted/40">
        <CardContent className="grid gap-1 pt-6 text-sm sm:max-w-xs sm:ml-auto">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Discount</span>
            <span>- {formatCurrency(discount)}</span>
          </div>
          {gstType === "intra" ? (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CGST</span>
                <span>{formatCurrency(totals.cgst)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">SGST</span>
                <span>{formatCurrency(totals.sgst)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between">
              <span className="text-muted-foreground">IGST</span>
              <span>{formatCurrency(totals.igst)}</span>
            </div>
          )}
          <div className="mt-1 flex justify-between border-t pt-1 text-base font-semibold">
            <span>Total</span>
            <span>{formatCurrency(totals.total)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <Label className="text-sm">Payment Received Now (optional)</Label>
            <p className="text-xs text-muted-foreground">
              If the customer is paying some or all of this invoice right away, record it here.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amountPaid">Amount (₹)</Label>
              <div className="flex gap-2">
                <Input
                  id="amountPaid"
                  name="amountPaid"
                  type="number"
                  min="0"
                  max={totals.total}
                  step="0.01"
                  value={amountPaid}
                  onChange={(e) =>
                    setAmountPaid(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="0.00"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setAmountPaid(totals.total)}
                >
                  Full Amount
                </Button>
              </div>
              {state.fieldErrors?.amountPaid && (
                <p className="text-xs text-destructive">{state.fieldErrors.amountPaid[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select name="paymentMethod" defaultValue="cash">
                <SelectTrigger id="paymentMethod" className="w-full">
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
              {state.fieldErrors?.paymentMethod && (
                <p className="text-xs text-destructive">{state.fieldErrors.paymentMethod[0]}</p>
              )}
            </div>
          </div>
          {typeof amountPaid === "number" && amountPaid > 0 && (
            <p className="text-xs text-muted-foreground">
              Balance due after this payment:{" "}
              <span className="font-medium text-foreground">
                {formatCurrency(Math.max(0, totals.total - amountPaid))}
              </span>
            </p>
          )}
        </CardContent>
      </Card>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
