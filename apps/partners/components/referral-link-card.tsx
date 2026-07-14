"use client";

import { useEffect, useState } from "react";
import { Check, Copy, MessageCircle, Share2 } from "lucide-react";
import { Card } from "@truelend/ui";

// Canonical public site (mirrors apps/website/content/site.ts). Partners share
// the production link regardless of which environment they view the dashboard in.
const REFERRAL_BASE = "https://truelend.in/enquiry";

export function ReferralLinkCard({ referenceId }: { referenceId: string }) {
  const link = `${REFERRAL_BASE}?ref=${referenceId}`;
  const message = `Looking for a loan? Apply through TrueLend with my referral link and I'll help you through it: ${link}`;
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked — the link stays visible to select and copy manually.
    }
  }

  async function share() {
    try {
      await navigator.share({ title: "TrueLend referral", text: message, url: link });
    } catch {
      // User dismissed the share sheet, or it failed — nothing to recover.
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-600">Refer &amp; earn</p>
      <h2 className="mt-1 font-display text-lg font-bold text-navy-950">Your referral link</h2>
      <p className="mt-1.5 text-sm text-navy-600">
        Share this link. Anyone who applies through it is credited to you (ID {referenceId}) — track
        them in your pipeline and earnings.
      </p>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-hairline bg-paper px-3 py-2.5">
        <span className="min-w-0 flex-1 truncate text-sm text-navy-800">{link}</span>
        <button
          type="button"
          onClick={() => void copy()}
          aria-label={copied ? "Referral link copied" : "Copy referral link"}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-navy-800 px-3 text-xs font-semibold text-white transition-colors hover:bg-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-hairline px-3 py-2 text-sm font-semibold text-navy-800 transition-colors hover:border-navy-800/30 hover:bg-navy-800/[0.04]"
        >
          <MessageCircle className="h-4 w-4 text-red-600" aria-hidden />
          Share on WhatsApp
        </a>
        {canShare && (
          <button
            type="button"
            onClick={() => void share()}
            className="inline-flex items-center gap-2 rounded-lg border border-hairline px-3 py-2 text-sm font-semibold text-navy-800 transition-colors hover:border-navy-800/30 hover:bg-navy-800/[0.04]"
          >
            <Share2 className="h-4 w-4 text-red-600" aria-hidden />
            Share&hellip;
          </button>
        )}
      </div>
    </Card>
  );
}
