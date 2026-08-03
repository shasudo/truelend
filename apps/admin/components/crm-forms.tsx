"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Mail, Upload } from "lucide-react";
import { Button, Card, Field, Input, Select, Textarea, cx } from "@truelend/ui";
import {
  callStatusLabels,
  employeeCallStatusValues,
  products,
  isTerminalCallStatus,
} from "@truelend/reference";
import { ActionFeedback } from "@/components/action-feedback";
import type { ActionResult } from "@/lib/action-result";
import {
  assignCallTasksAction,
  convertCallTaskAction,
  emailEnquiryFormAction,
  updateCallTaskStatusAction,
} from "@/lib/crm-actions";

const initialState: ActionResult = {};

/* ---- call outcome ---- */

interface CallTaskStatusFormProps {
  taskId: string;
  status: string;
  callbackAt: Date | null;
}

/*
 * Formats for <input type="datetime-local">, which wants wall-clock time with no
 * zone. The action parses the value back as IST, so render it as IST too — using
 * the browser's own zone here would shift the value on every save/reload cycle
 * for anyone not sitting in India.
 */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function toLocalInput(value: Date | null): string {
  if (!value) return "";
  return new Date(value.getTime() + IST_OFFSET_MS).toISOString().slice(0, 16);
}

export function CallTaskStatusForm({ taskId, status, callbackAt }: CallTaskStatusFormProps) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    updateCallTaskStatusAction,
    initialState,
  );
  // Local state only so the callback field can appear when it is required; the
  // server re-checks the pairing regardless.
  const [selected, setSelected] = useState(status);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  if (isTerminalCallStatus(status)) {
    return (
      <p className="mt-4 text-sm text-muted">
        This task is closed as “{callStatusLabels[status] ?? status}”. No further outcome can be
        recorded.
      </p>
    );
  }

  return (
    <form ref={formRef} action={action} className="mt-4 space-y-4">
      <input type="hidden" name="taskId" value={taskId} />
      <Field label="Call outcome" htmlFor="call-status">
        <Select
          id="call-status"
          name="status"
          defaultValue={status}
          onChange={(event) => setSelected(event.target.value)}
        >
          {employeeCallStatusValues.map((value) => (
            <option key={value} value={value}>
              {callStatusLabels[value]}
            </option>
          ))}
        </Select>
      </Field>
      {selected === "callback_scheduled" && (
        <Field label="Call them back at" htmlFor="call-callback" required>
          <Input
            id="call-callback"
            name="callbackAt"
            type="datetime-local"
            defaultValue={toLocalInput(callbackAt)}
            required
          />
        </Field>
      )}
      <Field label="Note" htmlFor="call-note">
        <Textarea
          id="call-note"
          name="note"
          maxLength={4000}
          placeholder="What did they say?"
          className="min-h-20"
        />
      </Field>
      <ActionFeedback state={state} success="Call outcome saved." />
      <Button type="submit" size="sm" variant="secondary" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Save outcome"}
      </Button>
    </form>
  );
}

/* ---- send the prospect the form ---- */

interface EnquiryLinkActionsProps {
  taskId: string;
  url: string;
  hasEmail: boolean;
}

export function EnquiryLinkActions({ taskId, url, hasEmail }: EnquiryLinkActionsProps) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    emailEnquiryFormAction,
    initialState,
  );
  const [copied, setCopied] = useState(false);

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2">
        <Input readOnly value={url} aria-label="Enquiry form link" className="font-mono text-xs" />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => {
            void navigator.clipboard.writeText(url).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
        >
          {copied ? (
            <Check className="h-4 w-4" aria-hidden />
          ) : (
            <Copy className="h-4 w-4" aria-hidden />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="text-xs text-muted">Paste this into WhatsApp or SMS, or email it below.</p>
      <form action={action}>
        <input type="hidden" name="taskId" value={taskId} />
        <Button type="submit" size="sm" variant="outline" disabled={pending || !hasEmail}>
          <Mail className="h-4 w-4" aria-hidden />
          {pending ? "Sending…" : "Email the form"}
        </Button>
        {!hasEmail && (
          <p className="mt-2 text-xs text-muted">
            No email on file — copy the link and send it another way.
          </p>
        )}
        <ActionFeedback state={state} success="Form link sent." />
      </form>
    </div>
  );
}

/* ---- conversion ---- */

interface ConvertCallTaskFormProps {
  taskId: string;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  productSlug: string | null;
}

export function ConvertCallTaskForm({
  taskId,
  name,
  phone,
  email,
  city,
  productSlug,
}: ConvertCallTaskFormProps) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    convertCallTaskAction,
    initialState,
  );
  const router = useRouter();

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  return (
    <form action={action} className="mt-4 space-y-4">
      <input type="hidden" name="taskId" value={taskId} />
      <div className="grid gap-4 min-[480px]:grid-cols-2">
        <Field label="Name" htmlFor="convert-name" required>
          <Input id="convert-name" name="name" defaultValue={name} required maxLength={120} />
        </Field>
        <Field label="Phone" htmlFor="convert-phone" required>
          <Input id="convert-phone" name="phone" defaultValue={phone} required inputMode="tel" />
        </Field>
        <Field label="Email" htmlFor="convert-email">
          <Input id="convert-email" name="email" type="email" defaultValue={email ?? ""} />
        </Field>
        <Field label="City" htmlFor="convert-city">
          <Input id="convert-city" name="city" defaultValue={city ?? ""} maxLength={80} />
        </Field>
        <Field label="Product" htmlFor="convert-product">
          <Select id="convert-product" name="productSlug" defaultValue={productSlug ?? ""}>
            <option value="">Not sure yet</option>
            {products.map((product) => (
              <option key={product.slug} value={product.slug}>
                {product.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Loan amount (₹)" htmlFor="convert-amount">
          <Input
            id="convert-amount"
            name="loanAmount"
            inputMode="numeric"
            placeholder="e.g. 500000"
          />
        </Field>
      </div>
      <Field label="What did they tell you?" htmlFor="convert-message">
        <Textarea id="convert-message" name="message" maxLength={2000} className="min-h-20" />
      </Field>
      <label className="flex items-start gap-2 text-sm text-navy-700">
        <input type="checkbox" name="consent" value="on" required className="mt-1" />
        <span>
          They agreed on this call to be contacted about a loan. You are recording that consent on
          their behalf.
        </span>
      </label>
      <ActionFeedback state={state} success="Converted to a lead." />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Converting…" : "Convert to lead"}
      </Button>
    </form>
  );
}

/* ---- bulk assignment (admin only) ---- */

interface AssignCallTasksFormProps {
  employees: Array<{ id: string; name: string }>;
  /** The task table, rendered on the server, with a name="taskIds" checkbox per row. */
  children: ReactNode;
}

export function AssignCallTasksForm({ employees, children }: AssignCallTasksFormProps) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    assignCallTasksAction,
    initialState,
  );
  const router = useRouter();

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  return (
    <form action={action}>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <Field label="Assign selected to" htmlFor="assign-to" className="min-w-52">
          <Select id="assign-to" name="assignedTo" defaultValue="">
            <option value="">Unassigned</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Assigning…" : "Assign"}
        </Button>
      </div>
      <ActionFeedback state={state} success="Call tasks assigned." />
      {children}
    </form>
  );
}

/* ---- CSV import (admin only) ---- */

interface ImportFailure {
  row: number;
  code: string;
}

const failureCopy: Record<string, string> = {
  name_missing: "no name",
  phone_invalid: "phone is not a 10-digit Indian mobile",
  too_many_columns: "more columns than the header",
};

export function CallTaskImport() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [failures, setFailures] = useState<ImportFailure[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function upload(file: File) {
    setBusy(true);
    setMessage(null);
    setFailures([]);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/crm/import", { method: "POST", body });
      const result = (await response.json()) as {
        ok?: boolean;
        imported?: number;
        error?: string;
        uncertain?: boolean;
        invalid?: number;
        failures?: ImportFailure[];
      };
      if (result.uncertain) router.refresh();
      if (!result.ok) {
        setMessage({ ok: false, text: result.error ?? "Import failed." });
        setFailures(result.failures ?? []);
        return;
      }
      setMessage({
        ok: true,
        text: `Imported ${result.imported} call ${result.imported === 1 ? "task" : "tasks"}.`,
      });
      router.refresh();
    } catch {
      setMessage({
        ok: false,
        text: "We couldn't confirm this import. Reload the call queue before trying again.",
      });
      router.refresh();
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <Card className="mb-6 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Upload className="h-4 w-4 text-navy-500" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-navy-950">Import a call list</p>
          <p className="text-xs text-muted">
            CSV with <code>name</code> and <code>phone</code> columns. Up to 2000 rows, 512KB. Any
            invalid row rejects the whole file.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          aria-label="CSV file"
          disabled={busy}
          className="text-sm file:mr-3 file:rounded-lg file:border file:border-hairline file:bg-paper file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-navy-900"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      </div>
      {busy && <p className="mt-3 text-sm text-muted">Importing…</p>}
      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={cx(
            "mt-3 rounded-lg px-3 py-2 text-sm",
            message.ok
              ? "border border-hairline bg-paper text-navy-700"
              : "border border-red-200 bg-red-50 text-red-700",
          )}
        >
          {message.text}
        </p>
      )}
      {failures.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-red-700">
          {failures.map((failure) => (
            <li key={`${failure.row}-${failure.code}`}>
              Record {failure.row}: {failureCopy[failure.code] ?? failure.code}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
