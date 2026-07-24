"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cx } from "@truelend/ui";

/** Shows the Referral Partner's RP reference ID with a copy-to-clipboard button. */
export function PartnerIdChip({
  referenceId,
  className,
}: {
  referenceId: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(referenceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked (insecure context / denied permission). The id stays
      // visible, so the Referral Partner can still select and copy it manually.
    }
  }

  return (
    <div
      className={cx(
        "inline-flex items-center gap-2.5 rounded-xl border border-navy-800/15 bg-white px-3 py-2",
        className,
      )}
    >
      <div className="leading-tight">
        <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-muted">
          Your Referral Partner ID
        </p>
        <p className="font-display text-sm font-extrabold tracking-wide tabular-nums text-navy-950">
          {referenceId}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={copied ? "Referral Partner ID copied" : "Copy Referral Partner ID"}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-navy-500 transition-colors hover:bg-navy-800/[0.06] hover:text-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
      >
        {copied ? (
          <Check className="h-4 w-4 text-red-600" aria-hidden />
        ) : (
          <Copy className="h-4 w-4" aria-hidden />
        )}
      </button>
    </div>
  );
}
