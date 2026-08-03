"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useForm, type DefaultValues, type FieldValues, type Resolver } from "react-hook-form";
import { Turnstile } from "@marsidev/react-turnstile";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { Button, useFormDraft } from "@truelend/ui";
import type { TurnstileAction } from "@truelend/turnstile/actions";
import { submitLead } from "@/lib/lead-actions";
import {
  resolveAttribution,
  touchFromSearch,
  refFromSearch,
  type LeadAttribution,
} from "@/lib/attribution";
import { site } from "@/content/site";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const UTM_STORAGE_KEY = "tl-utm";

function readAttribution(): LeadAttribution {
  const params = new URLSearchParams(window.location.search);
  try {
    const resolved = resolveAttribution(
      window.localStorage.getItem(UTM_STORAGE_KEY),
      touchFromSearch(params),
      undefined,
      refFromSearch(params),
    );
    if (resolved.serialized) {
      window.localStorage.setItem(UTM_STORAGE_KEY, resolved.serialized);
    } else {
      window.localStorage.removeItem(UTM_STORAGE_KEY);
    }
    return resolved.fields;
  } catch {
    // Storage may be disabled by browser policy; current-page attribution still applies.
    return resolveAttribution(null, touchFromSearch(params), undefined, refFromSearch(params))
      .fields;
  }
}

function useAttribution() {
  useEffect(() => {
    // Capture the referral as soon as the page hydrates so it survives navigation.
    readAttribution();
  }, []);
  return readAttribution;
}

export function useLeadForm<T extends FieldValues>(
  resolver: Resolver<T>,
  defaultValues: DefaultValues<T>,
  draftName: string,
) {
  // shouldUnregister drops values for fields that are no longer rendered. The
  // enquiry form hides loanAmount/tenureMonths/preferredEmi for card products,
  // and react-hook-form otherwise keeps what was typed before the switch — a
  // credit-card enquiry would submit the loan amount from the earlier product.
  const form = useForm<T>({ resolver, defaultValues, shouldUnregister: true });
  const getAttribution = useAttribution();
  const [succeeded, setSucceeded] = useState(false);
  const [rootError, setRootError] = useState<string>();
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [turnstileToken, setTurnstileToken] = useState<string>();
  const [turnstileError, setTurnstileError] = useState<string>();
  const draft = useFormDraft({
    storageKey: `truelend:website:lead:${draftName}`,
    fields: Object.keys(defaultValues),
    error: rootError,
    success: succeeded,
    resultKey: rootError ?? succeeded,
    onRestore: (values) => {
      const restored: Record<string, unknown> = { ...defaultValues, ...values };
      // A blank slot in a stale draft must not clobber an explicit default —
      // otherwise an earlier visit erases the product from /enquiry?product=…
      // Strings only: a checkbox default must never override what the user chose.
      for (const [key, value] of Object.entries(defaultValues as Record<string, unknown>)) {
        if (typeof value === "string" && value && !restored[key]) restored[key] = value;
      }
      form.reset(restored as T);
    },
  });
  // No widget configured → always ready; otherwise wait for a solved token so
  // the user can't submit into a guaranteed "verification failed".
  const turnstileReady = !TURNSTILE_SITE_KEY || turnstileToken !== undefined;

  const submitForm = form.handleSubmit(async (values) => {
    setRootError(undefined);
    try {
      // Resolve again at submit time so a fast submission cannot race hydration
      // and lose the Referral Partner reference from the current URL.
      const result = await submitLead({ ...values, ...getAttribution(), turnstileToken });
      if (result.ok) {
        setSucceeded(true);
        return;
      }
      setRootError(result.error);
    } catch {
      setRootError("The request could not be sent. Check your connection and try again.");
    } finally {
      // Turnstile tokens are single-use — remount the widget for a fresh one.
      setTurnstileToken(undefined);
      setTurnstileError(undefined);
      setTurnstileKey((k) => k + 1);
    }
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    draft.onSubmit(event);
    return submitForm(event);
  };

  return {
    form,
    draftFormRef: draft.formRef,
    draftOnInput: draft.onInput,
    draftOnChange: draft.onChange,
    onSubmit,
    succeeded,
    rootError,
    turnstileKey,
    turnstileReady,
    turnstileError,
    setToken: (token: string) => {
      setTurnstileError(undefined);
      setTurnstileToken(token);
    },
    resetToken: () => setTurnstileToken(undefined),
    failTurnstile: () => {
      setRootError(undefined);
      setTurnstileToken(undefined);
      setTurnstileError("Human verification could not load. Refresh the page and try again.");
    },
  };
}

interface TurnstileFieldProps {
  resetKey: number;
  action: TurnstileAction;
  onToken: (token: string) => void;
  onExpire: () => void;
  onError: () => void;
}

export function TurnstileField({
  resetKey,
  action,
  onToken,
  onExpire,
  onError,
}: TurnstileFieldProps) {
  if (!TURNSTILE_SITE_KEY) return null;
  return (
    <Turnstile
      key={resetKey}
      siteKey={TURNSTILE_SITE_KEY}
      onSuccess={onToken}
      onExpire={onExpire}
      onTimeout={onExpire}
      onError={onError}
      options={{ theme: "light", action }}
    />
  );
}

interface TurnstilePendingHintProps {
  show: boolean;
}

export function TurnstilePendingHint({ show }: TurnstilePendingHintProps) {
  if (!show) return null;
  return (
    <p className="text-xs text-muted" aria-live="polite">
      Verifying you&rsquo;re human — one moment…
    </p>
  );
}

interface RootErrorProps {
  message?: string;
}

export function RootError({ message }: RootErrorProps) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {message}
    </p>
  );
}

export function NoScriptFallback() {
  return (
    <noscript>
      <div className="rounded-lg border border-hairline bg-paper p-4 text-sm text-navy-700">
        Online submission needs JavaScript. Call us at{" "}
        <a className="font-semibold underline" href={site.phoneHref}>
          {site.phone}
        </a>{" "}
        or email{" "}
        <a className="font-semibold underline" href={`mailto:${site.email}`}>
          {site.email}
        </a>
        .
      </div>
    </noscript>
  );
}

interface FormSuccessProps {
  title: string;
  sub: string;
  showWhatsApp?: boolean;
}

export function FormSuccess({ title, sub, showWhatsApp = true }: FormSuccessProps) {
  const successRef = useRef<HTMLDivElement>(null);
  useEffect(() => successRef.current?.focus(), []);
  return (
    <div
      ref={successRef}
      role="status"
      tabIndex={-1}
      className="flex flex-col items-center gap-4 p-6 text-center outline-none sm:p-10"
    >
      <CheckCircle2 className="h-12 w-12 text-red-600" aria-hidden />
      <h2 className="font-display text-2xl font-extrabold tracking-tight text-navy-950">{title}</h2>
      <p className="max-w-md text-navy-600">{sub}</p>
      {showWhatsApp && (
        <Button variant="outline" asChild className="mt-2">
          <a href={site.whatsappHref} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-4 w-4" aria-hidden />
            Chat with us on WhatsApp
          </a>
        </Button>
      )}
    </div>
  );
}
