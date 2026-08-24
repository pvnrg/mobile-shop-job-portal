"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import {
  sendTestMessageAction,
  type TestMessageState,
} from "@/lib/actions/whatsapp-settings";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      Send Test
    </Button>
  );
}

export function WhatsappTestMessage() {
  const [state, formAction] = useActionState<TestMessageState, FormData>(
    sendTestMessageAction,
    {}
  );
  const prevState = useRef(state);

  useEffect(() => {
    if (state !== prevState.current) {
      if (state.success) toast.success("Test message sent successfully");
      if (state.error) toast.error(state.error);
    }
    prevState.current = state;
  }, [state]);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <div className="flex-1 min-w-48 space-y-1.5">
        <label htmlFor="test-phone" className="text-xs font-medium text-muted-foreground">
          Test Phone Number
        </label>
        <Input id="test-phone" name="phone" placeholder="9876543210" />
      </div>
      <SubmitButton />
    </form>
  );
}
