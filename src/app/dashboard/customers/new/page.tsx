import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerForm } from "@/components/customers/customer-form";
import { createCustomerAction } from "@/lib/actions/customers";

export default function NewCustomerPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Customer</h1>
        <p className="text-sm text-muted-foreground">
          Add a customer account to the portal
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer Details</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerForm action={createCustomerAction} submitLabel="Create Customer" />
        </CardContent>
      </Card>
    </div>
  );
}
