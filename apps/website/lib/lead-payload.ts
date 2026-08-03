import type { DefaultValues, FieldValues } from "react-hook-form";
import type { LeadAttribution } from "./attribution";

/**
 * Payload for the submitLead server action.
 *
 * useLeadForm runs react-hook-form with shouldUnregister: true, which drops
 * every default that has no rendered input. `kind` has none — it is the server
 * union's discriminator, not a field — so it is re-attached from the defaults
 * here. Without it leadSchema rejects the payload on every lead form.
 */
export function leadPayload<T extends FieldValues & { kind: string }>(
  defaultValues: DefaultValues<T>,
  // Omit is what shouldUnregister actually hands back: react-hook-form types
  // `kind` as present because it is in defaultValues, but never yields it.
  values: Omit<T, "kind">,
  attribution: LeadAttribution,
  turnstileToken: string | undefined,
) {
  return { ...values, ...attribution, turnstileToken, kind: defaultValues.kind };
}
