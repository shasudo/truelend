"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, type DefaultValues, type FieldValues, type Resolver } from "react-hook-form";
import { Turnstile } from "@marsidev/react-turnstile";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { Button } from "@truelend/ui";
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

function useUtm(): LeadAttribution {
  const [utm, setUtm] = useState<LeadAttribution>({});
  useEffect(() => {
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
      setUtm(resolved.fields);
    } catch {
      // Storage may be disabled by browser policy; attribution stays optional.
      setUtm(
        resolveAttribution(null, touchFromSearch(params), undefined, refFromSearch(params)).fields,
      );
    }
  }, []);
  return utm;
}

export function useLeadForm<T extends FieldValues>(
  resolver: Resolver<T>,
  defaultValues: DefaultValues<T>,
) {
  const form = useForm<T>({ resolver, defaultValues });
  const utm = useUtm();
  const [succeeded, setSucceeded] = useState(false);
  const [rootError, setRootError] = useState<string>();
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [turnstileToken, setTurnstileToken] = useState<string>();
  const [turnstileError, setTurnstileError] = useState<string>();
  // No widget configured → always ready; otherwise wait for a solved token so
  // the user can't submit into a guaranteed "verification failed".
  const turnstileReady = !TURNSTILE_SITE_KEY || turnstileToken !== undefined;

  const onSubmit = form.handleSubmit(async (values) => {
    setRootError(undefined);
    try {
      const result = await submitLead({ ...values, ...utm, turnstileToken });
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

  return {
    form,
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
      setTurnstileToken(undefined);
      setTurnstileError("Human verification could not load. Refresh the page and try again.");
    },
  };
}

export function TurnstileField({
  resetKey,
  action,
  onToken,
  onExpire,
  onError,
}: {
  resetKey: number;
  action: TurnstileAction;
  onToken: (token: string) => void;
  onExpire: () => void;
  onError: () => void;
}) {
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

export function TurnstilePendingHint({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p className="text-xs text-muted" aria-live="polite">
      Verifying you&rsquo;re human — one moment…
    </p>
  );
}

export function RootError({ message }: { message?: string }) {
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

export function FormSuccess({
  title,
  sub,
  showWhatsApp = true,
}: {
  title: string;
  sub: string;
  showWhatsApp?: boolean;
}) {
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
