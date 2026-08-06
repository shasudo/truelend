"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Mail, Scale, Upload } from "lucide-react";
import { Button, Card, Checkbox, Field, Input, Select, Textarea, cx } from "@truelend/ui";
import {
  businessProducts,
  callStatusLabels,
  cardProducts,
  employeeCallStatusValues,
  employerTenureLabels,
  employmentTypes,
  experienceBands,
  isTerminalCallStatus,
  itrFiledOptions,
  loanPurposes,
  loanTenures,
  products,
  residenceTypes,
  securedProducts,
} from "@truelend/reference";
import { ActionFeedback } from "@/components/action-feedback";
import type { ActionResult } from "@/lib/action-result";
import {
  assignCallTasksAction,
  balanceCallQueueAction,
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

interface ConvertSectionProps {
  title: string;
  children: ReactNode;
}

function ConvertSection({ title, children }: ConvertSectionProps) {
  return (
    <fieldset className="space-y-4 border-t border-hairline pt-4 first:border-t-0 first:pt-0">
      <legend className="sr-only">{title}</legend>
      <p aria-hidden className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
        {title}
      </p>
      {children}
    </fieldset>
  );
}

/*
 * The same capture surface as the public /enquiry form, because the lead this
 * creates is read on the same admin page as one the customer filled in — a
 * caller who asked about income and existing EMIs on the call had nowhere to
 * put the answers before this, and the detail was simply lost.
 *
 * Requiredness deliberately does not match /enquiry: only name, phone and the
 * consent attestation are mandatory. A phone call produces whatever it
 * produces, and forcing twenty fields would push callers into inventing them.
 */
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
  const [product, setProduct] = useState(productSlug ?? "");
  const router = useRouter();

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  // Mirrors the public form's conditional fields, for the same reasons: a card
  // has no loan amount or tenure, only secured products have an asset behind
  // them, and turnover is a business question.
  const isCard = cardProducts.has(product);
  const showAsset = securedProducts.has(product);
  const showTurnover = businessProducts.has(product);

  return (
    <form action={action} className="mt-4 space-y-5">
      <input type="hidden" name="taskId" value={taskId} />

      <ConvertSection title="Contact">
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
          <Field label="PIN code" htmlFor="convert-pincode">
            <Input
              id="convert-pincode"
              name="pincode"
              inputMode="numeric"
              placeholder="e.g. 411001"
            />
          </Field>
          <Field label="Residence" htmlFor="convert-residence">
            <Select id="convert-residence" name="residenceType" defaultValue="">
              <option value="">Not asked</option>
              {residenceTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </ConvertSection>

      <ConvertSection title="Requirement">
        <div className="grid gap-4 min-[480px]:grid-cols-2">
          <Field label="Product" htmlFor="convert-product">
            <Select
              id="convert-product"
              name="productSlug"
              value={product}
              onChange={(event) => setProduct(event.target.value)}
            >
              <option value="">Not sure yet</option>
              {products.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </Select>
          </Field>
          {!isCard && (
            <Field label="Loan amount (₹)" htmlFor="convert-amount">
              <Input
                id="convert-amount"
                name="loanAmount"
                inputMode="numeric"
                placeholder="e.g. 500000"
              />
            </Field>
          )}
          <Field label="Purpose" htmlFor="convert-purpose">
            <Select id="convert-purpose" name="loanPurpose" defaultValue="">
              <option value="">Not asked</option>
              {loanPurposes.map((purpose) => (
                <option key={purpose} value={purpose}>
                  {purpose}
                </option>
              ))}
            </Select>
          </Field>
          {!isCard && (
            <Field label="Preferred tenure" htmlFor="convert-tenure">
              <Select id="convert-tenure" name="tenureMonths" defaultValue="">
                <option value="">No preference</option>
                {loanTenures.map((tenure) => (
                  <option key={tenure.value} value={tenure.value}>
                    {tenure.label}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {!isCard && (
            <Field label="Preferred EMI (₹)" htmlFor="convert-preferred-emi">
              <Input
                id="convert-preferred-emi"
                name="preferredEmi"
                inputMode="numeric"
                placeholder="e.g. 25000"
              />
            </Field>
          )}
          {showAsset && (
            <Field label="Asset / property value (₹)" htmlFor="convert-asset">
              <Input
                id="convert-asset"
                name="assetValue"
                inputMode="numeric"
                placeholder="e.g. 6000000"
              />
            </Field>
          )}
          {showTurnover && (
            <Field label="Annual turnover (₹)" htmlFor="convert-turnover">
              <Input
                id="convert-turnover"
                name="annualTurnover"
                inputMode="numeric"
                placeholder="e.g. 12000000"
              />
            </Field>
          )}
        </div>
      </ConvertSection>

      <ConvertSection title="Employment & income">
        <div className="grid gap-4 min-[480px]:grid-cols-2">
          <Field label="Employment type" htmlFor="convert-employment">
            <Select id="convert-employment" name="employmentType" defaultValue="">
              <option value="">Not asked</option>
              {employmentTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Employer / business" htmlFor="convert-employer">
            <Input id="convert-employer" name="employerName" maxLength={160} />
          </Field>
          <Field label="Monthly income (₹)" htmlFor="convert-income">
            <Input
              id="convert-income"
              name="monthlyIncome"
              inputMode="numeric"
              placeholder="e.g. 80000"
            />
          </Field>
          <Field label="Experience" htmlFor="convert-experience">
            <Select id="convert-experience" name="experienceYears" defaultValue="">
              <option value="">Not asked</option>
              {experienceBands.map((band) => (
                <option key={band.value} value={band.value}>
                  {band.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="With current employer" htmlFor="convert-employer-tenure">
            <Select id="convert-employer-tenure" name="existingWithEmployer" defaultValue="">
              <option value="">Not asked</option>
              {employerTenureLabels.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Files IT returns?" htmlFor="convert-itr">
            <Select id="convert-itr" name="itrFiled" defaultValue="">
              <option value="">Not asked</option>
              {itrFiledOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </ConvertSection>

      <ConvertSection title="Existing borrowings">
        <div className="grid gap-4 min-[480px]:grid-cols-2">
          <Field label="Current EMIs / month (₹)" htmlFor="convert-emi">
            <Input
              id="convert-emi"
              name="existingEmi"
              inputMode="numeric"
              placeholder="e.g. 25000"
            />
          </Field>
          <Field label="Outstanding loan (₹)" htmlFor="convert-outstanding">
            <Input
              id="convert-outstanding"
              name="outstandingLoanAmount"
              inputMode="numeric"
              placeholder="e.g. 1000000"
            />
          </Field>
          <Field label="Credit card outstanding (₹)" htmlFor="convert-cc">
            <Input
              id="convert-cc"
              name="creditCardOutstanding"
              inputMode="numeric"
              placeholder="e.g. 50000"
            />
          </Field>
        </div>
      </ConvertSection>

      <ConvertSection title="Notes and consent">
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
      </ConvertSection>

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
  const formRef = useRef<HTMLFormElement>(null);
  const [selected, setSelected] = useState(0);
  /** Index of the last row clicked, so shift-click can fill the range between. */
  const anchor = useRef<number | null>(null);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  const boxes = () =>
    Array.from(formRef.current?.querySelectorAll<HTMLInputElement>('input[name="taskIds"]') ?? []);

  function recount() {
    const all = boxes();
    const checked = all.filter((box) => box.checked).length;
    setSelected(checked);
    // Keep the header box honest about a selection made from the toolbar, by
    // shift-click, or one row at a time.
    const header = formRef.current?.querySelector<HTMLInputElement>('[data-select-all="taskIds"]');
    if (header) {
      header.checked = checked > 0 && checked === all.length;
      header.indeterminate = checked > 0 && checked < all.length;
    }
  }

  function selectAll(checked: boolean) {
    boxes().forEach((box) => {
      box.checked = checked;
    });
    anchor.current = null;
    recount();
  }

  /*
   * Shift-click fills every row between this one and the last one clicked —
   * the behaviour every mail client has, and the difference between assigning
   * a page of 20 in one gesture and in twenty. Only row boxes take part; the
   * header's select-all is not one of them.
   */
  function onRowClick(event: ReactMouseEvent<HTMLFormElement>) {
    const target = event.target as HTMLElement;
    if (!(target instanceof HTMLInputElement) || target.name !== "taskIds") return;
    const all = boxes();
    const index = all.indexOf(target);
    if (index < 0) return;
    if (event.shiftKey && anchor.current !== null && anchor.current !== index) {
      const to = Math.max(anchor.current, index);
      for (let i = Math.min(anchor.current, index); i <= to; i += 1) {
        const box = all[i];
        if (box) box.checked = target.checked;
      }
    }
    anchor.current = index;
    recount();
  }

  // The table shows each row's current assignee, but nothing stops a careless
  // multi-page selection from including tasks someone else is already
  // working. Confirm once, naming how many, before silently taking them.
  function confirmReassignment(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const targetId = new FormData(form).get("assignedTo");
    const targetName = employees.find((employee) => employee.id === targetId)?.name ?? "Unassigned";
    const stolen = Array.from(
      form.querySelectorAll<HTMLInputElement>('input[name="taskIds"]:checked'),
    ).filter((box) => {
      const current = box.dataset.assignee ?? "";
      return current !== "" && current !== targetName;
    });
    if (
      stolen.length > 0 &&
      !window.confirm(
        `${stolen.length} of the selected ${stolen.length === 1 ? "task is" : "tasks are"} already assigned to someone else. Reassign to ${targetName} anyway?`,
      )
    ) {
      event.preventDefault();
    }
  }

  return (
    // onChange catches the header select-all and keyboard toggles; onClick adds
    // shift-range selection on top of it. Both just recount off the DOM, so the
    // row checkboxes stay uncontrolled and the table stays server-rendered.
    <form
      ref={formRef}
      action={action}
      onSubmit={confirmReassignment}
      onChange={recount}
      onClick={onRowClick}
    >
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
        <Button type="submit" size="sm" disabled={pending || selected === 0}>
          {pending ? "Assigning…" : `Assign${selected > 0 ? ` ${selected}` : ""}`}
        </Button>
        <div className="flex items-center gap-3 pb-2 text-xs">
          <button
            type="button"
            className="font-semibold text-red-600 hover:underline"
            onClick={() => selectAll(true)}
          >
            Select all on this page
          </button>
          {selected > 0 && (
            <>
              <button
                type="button"
                className="font-semibold text-navy-500 hover:underline"
                onClick={() => selectAll(false)}
              >
                Clear
              </button>
              <span className="text-muted">{selected} selected · shift-click to pick a range</span>
            </>
          )}
        </div>
      </div>
      <ActionFeedback state={state} success="Call tasks assigned." />
      {children}
    </form>
  );
}

/* ---- balance the queue (admin only) ---- */

interface BalanceCallQueueFormProps {
  callers: Array<{ id: string; name: string; open: number }>;
  totalOpen: number;
  unassignedOpen: number;
}

export function BalanceCallQueueForm({
  callers,
  totalOpen,
  unassignedOpen,
}: BalanceCallQueueFormProps) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    balanceCallQueueAction,
    initialState,
  );
  const router = useRouter();

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  const formRef = useRef<HTMLFormElement>(null);
  const [max, setMax] = useState("");
  // Ticked callers, recounted off the DOM on every change so the even-split
  // hint below and the confirm text can never disagree with what is submitted.
  const [ticked, setTicked] = useState(callers.length);

  function recount() {
    setTicked(
      formRef.current?.querySelectorAll('input[name="employeeIds"]:checked').length ??
        callers.length,
    );
  }

  function tickAll(checked: boolean) {
    formRef.current
      ?.querySelectorAll<HTMLInputElement>('input[name="employeeIds"]')
      .forEach((box) => {
        box.checked = checked;
      });
    recount();
  }

  /*
   * One click moves other people's work, so it asks first — same reasoning as
   * confirmReassignment. Deliberately does NOT predict how many tasks will
   * move: that would mean a second copy of the balancing maths living in the
   * browser, free to drift from the real one on the server. The even split
   * shown below is arithmetic on two numbers already on screen, not a
   * prediction of the moves.
   */
  function confirmBalance(event: FormEvent<HTMLFormElement>) {
    const count = event.currentTarget.querySelectorAll('input[name="employeeIds"]:checked').length;
    if (count === 0) return; // the server refuses this too, with a message
    // A cap takes work off people rather than only withholding it, so it is
    // spelled out separately instead of tacked onto the general warning.
    const cap =
      Number(max) > 0
        ? ` Nobody will keep more than ${max} — everything above that is unassigned and goes back to the pool.`
        : "";
    if (
      !window.confirm(
        `Spread the ${totalOpen} open ${totalOpen === 1 ? "task" : "tasks"} evenly across ${count} ${count === 1 ? "caller" : "callers"}? Tasks already assigned to them may move to someone else. Scheduled callbacks stay put.${cap}`,
      )
    ) {
      event.preventDefault();
    }
  }

  const evenSplit = ticked > 0 ? Math.ceil(totalOpen / ticked) : 0;
  const capped = Number(max) > 0 && Number(max) < evenSplit;

  return (
    <Card className="mb-6 p-4">
      {/* onChange on the form: a caller box ticked by mouse or keyboard bubbles
          here, so nothing needs a per-checkbox handler. */}
      <form ref={formRef} action={action} onSubmit={confirmBalance} onChange={recount}>
        <div className="flex flex-wrap items-center gap-3">
          <Scale className="h-4 w-4 text-navy-500" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-navy-950">Balance the queue</p>
            <p className="text-xs text-muted">
              {totalOpen} open {totalOpen === 1 ? "task" : "tasks"} · {unassignedOpen} unassigned.
              Evens the load across the callers you tick. Scheduled callbacks never move, and anyone
              unticked keeps what they already have.
            </p>
          </div>
          <div className="w-36 shrink-0">
            <label className="mb-1 block text-xs font-semibold text-navy-700" htmlFor="balance-max">
              Max per caller
            </label>
            <Input
              id="balance-max"
              name="maxPerEmployee"
              type="number"
              min={1}
              max={20000}
              step={1}
              inputMode="numeric"
              placeholder="No limit"
              value={max}
              onChange={(event) => setMax(event.target.value)}
            />
          </div>
          <Button type="submit" size="sm" disabled={pending || ticked === 0}>
            {pending ? "Balancing…" : "Balance queue"}
          </Button>
        </div>
        {callers.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No active callers to balance across.</p>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-hairline pt-3 text-xs">
              <span className="font-semibold text-navy-700">
                {ticked} of {callers.length} selected
              </span>
              <button
                type="button"
                className="font-semibold text-red-600 hover:underline"
                onClick={() => tickAll(true)}
              >
                Select all
              </button>
              <button
                type="button"
                className="font-semibold text-navy-500 hover:underline"
                onClick={() => tickAll(false)}
              >
                Clear
              </button>
              {ticked > 0 && (
                <span className={capped ? "font-semibold text-sun-600" : "text-muted"}>
                  {capped
                    ? `${max} each — the other ~${totalOpen - Number(max) * ticked} go back to unassigned.`
                    : `≈ ${evenSplit} ${evenSplit === 1 ? "task" : "tasks"} each.`}
                </span>
              )}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
              {callers.map((caller) => (
                <li key={caller.id}>
                  <label className="flex items-center gap-2 text-sm text-navy-700">
                    <Checkbox
                      name="employeeIds"
                      value={caller.id}
                      defaultChecked
                      className="mt-0"
                    />
                    <span>
                      {caller.name}{" "}
                      <span className="tabular-nums text-muted">({caller.open} open)</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}
        <ActionFeedback state={state} success="Queue balanced." />
      </form>
    </Card>
  );
}

/* ---- CSV import (admin only) ---- */

interface ImportFailure {
  row: number;
  code: string;
}

// No duplicate entry: a repeated phone is skipped and counted, never a failure.
const failureCopy: Record<string, string> = {
  name_missing: "no name",
  phone_invalid: "phone is not a 10-digit Indian mobile",
  too_many_columns: "more columns than the header",
};

export function CallTaskImport() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [failures, setFailures] = useState<ImportFailure[]>([]);
  const [invalidTotal, setInvalidTotal] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function upload(file: File) {
    setBusy(true);
    setMessage(null);
    setFailures([]);
    setInvalidTotal(null);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/crm/import", { method: "POST", body });
      const result = (await response.json()) as {
        ok?: boolean;
        imported?: number;
        skipped?: number;
        error?: string;
        uncertain?: boolean;
        total?: number;
        invalid?: number;
        failures?: ImportFailure[];
      };
      if (result.uncertain) router.refresh();
      if (!result.ok) {
        const counts =
          typeof result.invalid === "number" && typeof result.total === "number"
            ? ` ${result.invalid} of ${result.total} rows failed.`
            : "";
        setMessage({ ok: false, text: `${result.error ?? "Import failed."}${counts}` });
        setFailures(result.failures ?? []);
        setInvalidTotal(result.invalid ?? null);
        return;
      }
      // The skipped count is always shown when non-zero: "imported 15988" on a
      // 16000-row file is otherwise a silent, unexplained shortfall.
      const skipped = result.skipped ?? 0;
      setMessage({
        ok: true,
        text:
          `Imported ${result.imported} call ${result.imported === 1 ? "task" : "tasks"}.` +
          (skipped > 0
            ? ` Skipped ${skipped} ${skipped === 1 ? "duplicate" : "duplicates"} — already in the queue, or repeated in the file.`
            : ""),
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
            CSV needs <code>name</code> and <code>phone</code>. Optional: <code>email</code>,{" "}
            <code>city</code>, <code>product</code>, <code>source</code>, <code>remark</code>. Up to
            20,000 rows, 4MB. Duplicate phones are skipped; any invalid row rejects the whole file.
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
        <>
          <ul className="mt-2 space-y-1 text-xs text-red-700">
            {failures.map((failure) => (
              <li key={`${failure.row}-${failure.code}`}>
                Record {failure.row}: {failureCopy[failure.code] ?? failure.code}
              </li>
            ))}
          </ul>
          {invalidTotal !== null && invalidTotal > failures.length && (
            <p className="mt-2 text-xs text-red-700">
              Showing the first {failures.length} of {invalidTotal} failing rows.
            </p>
          )}
        </>
      )}
    </Card>
  );
}
