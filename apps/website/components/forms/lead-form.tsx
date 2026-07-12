"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, type DefaultValues, type FieldValues, type Resolver } from "react-hook-form";
import { Turnstile } from "@marsidev/react-turnstile";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { Button, Card } from "@truelend/ui";
import { submitLead } from "@/lib/actions";
import { site } from "@/content/site";

/* Shared submit pipeline for all four lead forms: RHF + zod client-side,
 * UTM first-touch capture, env-gated Turnstile, typed server action. */

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const UTM_STORAGE_KEY = "tl-utm";

interface Utm {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

function useUtm(): Utm {
  const [utm, setUtm] = useState<Utm>({});
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const current: Utm = {
      utmSource: params.get("utm_source") ?? undefined,
      utmMedium: params.get("utm_medium") ?? undefined,
      utmCampaign: params.get("utm_campaign") ?? undefined,
    };
    if (current.utmSource || current.utmMedium || current.utmCampaign) {
      // First touch wins — don't let a later plain visit overwrite it.
      if (!localStorage.getItem(UTM_STORAGE_KEY)) {
        localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(current));
      }
      setUtm(current);
    } else {
      try {
        setUtm(JSON.parse(localStorage.getItem(UTM_STORAGE_KEY) ?? "{}") as Utm);
      } catch {
        // ignore corrupt storage
      }
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
  const token = useRef<string>(undefined);

  const onSubmit = form.handleSubmit(async (values) => {
    setRootError(undefined);
    const result = await submitLead({ ...values, ...utm, turnstileToken: token.current });
    if (result.ok) {
      setSucceeded(true);
    } else {
      setRootError(result.error);
      // Turnstile tokens are single-use — remount the widget for a fresh one.
      token.current = undefined;
      setTurnstileKey((k) => k + 1);
    }
  });

  const setToken = (t: string) => {
    token.current = t;
  };

  return { form, onSubmit, succeeded, rootError, turnstileKey, setToken };
}

export function TurnstileField({
  resetKey,
  onToken,
}: {
  resetKey: number;
  onToken: (token: string) => void;
}) {
  if (!TURNSTILE_SITE_KEY) return null;
  return (
    <Turnstile
      key={resetKey}
      siteKey={TURNSTILE_SITE_KEY}
      onSuccess={onToken}
      options={{ theme: "light" }}
    />
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

export function FormSuccess({ title, sub }: { title: string; sub: string }) {
  return (
    <Card className="flex flex-col items-center gap-4 p-10 text-center">
      <CheckCircle2 className="h-12 w-12 text-red-600" aria-hidden />
      <h2 className="font-display text-2xl font-extrabold tracking-tight text-navy-950">{title}</h2>
      <p className="max-w-md text-navy-600">{sub}</p>
      <Button variant="outline" asChild className="mt-2">
        <a href={site.whatsappHref} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="h-4 w-4" aria-hidden />
          Chat with us on WhatsApp
        </a>
      </Button>
    </Card>
  );
}
