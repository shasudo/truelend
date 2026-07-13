import { Field, Input, Select } from "@truelend/ui";
import { banks, products, loanCaseStatusLabels, paiseToRupeesInput } from "@truelend/reference";
import { schema, type LoanCase } from "@truelend/db";

interface Defaults {
  lenderSlug?: string;
  productSlug?: string;
  status?: LoanCase["status"];
  requestedAmountPaise?: number | null;
  sanctionedAmountPaise?: number | null;
  disbursedAmountPaise?: number | null;
  revenuePaise?: number | null;
  payoutPaise?: number | null;
}

/** Shared inputs for the create and edit loan-case forms. */
export function LoanCaseFields({ defaults }: { defaults?: Defaults }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Lender" htmlFor="lenderSlug" required>
        <Select
          id="lenderSlug"
          name="lenderSlug"
          defaultValue={defaults?.lenderSlug ?? ""}
          required
        >
          <option value="" disabled>
            Select a lender
          </option>
          {banks.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Product" htmlFor="productSlug" required>
        <Select
          id="productSlug"
          name="productSlug"
          defaultValue={defaults?.productSlug ?? ""}
          required
        >
          <option value="" disabled>
            Select a product
          </option>
          {products.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Status" htmlFor="status">
        <Select id="status" name="status" defaultValue={defaults?.status ?? "logged_in"}>
          {schema.loanCaseStatus.enumValues.map((s) => (
            <option key={s} value={s}>
              {loanCaseStatusLabels[s]}
            </option>
          ))}
        </Select>
      </Field>

      <div className="hidden sm:block" aria-hidden />

      <AmountField
        label="Requested amount (₹)"
        name="requestedAmount"
        value={defaults?.requestedAmountPaise}
      />
      <AmountField
        label="Sanctioned amount (₹)"
        name="sanctionedAmount"
        value={defaults?.sanctionedAmountPaise}
      />
      <AmountField
        label="Disbursed amount (₹)"
        name="disbursedAmount"
        value={defaults?.disbursedAmountPaise}
      />
      <div className="hidden sm:block" aria-hidden />
      <AmountField label="Revenue earned (₹)" name="revenue" value={defaults?.revenuePaise} />
      <AmountField label="Payout paid (₹)" name="payout" value={defaults?.payoutPaise} />
    </div>
  );
}

function AmountField({
  label,
  name,
  value,
}: {
  label: string;
  name: string;
  value?: number | null;
}) {
  return (
    <Field label={label} htmlFor={name}>
      <Input
        id={name}
        name={name}
        type="number"
        min="0"
        step="1"
        inputMode="numeric"
        placeholder="0"
        defaultValue={paiseToRupeesInput(value)}
      />
    </Field>
  );
}
