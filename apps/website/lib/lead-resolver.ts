import type { DefaultValues, FieldValues, Resolver } from "react-hook-form";

/**
 * Puts the lead `kind` back before the schema sees the form values.
 *
 * useLeadForm runs react-hook-form with shouldUnregister: true, so the values
 * only ever carry fields with a rendered input. No form renders one for `kind`
 * — it is the schema's discriminator, not a field — so validation fails on it
 * every time, and since nothing displays that error the form silently refuses
 * to submit. react-hook-form submits what the resolver returns, so restoring it
 * here also carries `kind` through to the server payload.
 */
export function withLeadKind<T extends FieldValues & { kind: string }>(
  resolver: Resolver<T>,
  defaultValues: DefaultValues<T>,
): Resolver<T> {
  return (values, context, options) =>
    resolver({ ...values, kind: defaultValues.kind }, context, options);
}
