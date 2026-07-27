"use client";

import { useActionState, useRef, useEffect } from "react";
import { Button, Field, Input, Select } from "@truelend/ui";
import { recordPayoutAction, type PayoutResult } from "@/lib/partner-actions";

// Client form so the server's balance-guard rejection ("exceeds outstanding")
// is shown instead of silently swallowed. Resets after a successful entry.
export function PayoutForm({ partnerId, noun }: { partnerId: string; noun: string }) {
  const [state, action, pending] = useActionState<PayoutResult, FormData>(recordPayoutAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="mt-5 space-y-3 border-t border-hairline pt-5">
      <input type="hidden" name="partnerId" value={partnerId} />
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
        <Field label="Entry" htmlFor="kind">
          <Select id="kind" name="kind" defaultValue="earned">
            <option value="earned">Earned</option>
            <option value="paid">Paid</option>
          </Select>
        </Field>
        <Field label="Amount (₹)" htmlFor="amount">
          <Input
            id="amount"
            name="amount"
            type="number"
            required
            min="1"
            step="1"
            inputMode="numeric"
            placeholder="0"
          />
        </Field>
      </div>
      <Field label="Note" htmlFor="note">
        <Input id="note" name="note" placeholder="e.g. Case #… disbursed" />
      </Field>

      {state.error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}

      <Button type="submit" size="sm" variant="secondary" className="w-full" disabled={pending}>
        {pending ? "Recording…" : `Record ${noun.toLowerCase()}`}
      </Button>
    </form>
  );
}
