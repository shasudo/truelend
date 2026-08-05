"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download } from "lucide-react";
import { Card } from "@truelend/ui";
import { appUrls } from "@truelend/reference";

interface ReferralQrCardProps {
  referenceId: string;
}

export function ReferralQrCard({ referenceId }: ReferralQrCardProps) {
  const link = `${appUrls.website}/apply?ref=${referenceId}`;
  const [dataUrl, setDataUrl] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(link, { width: 480, margin: 2 })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        // Generation failed client-side — the link text below still works without it.
      });
    return () => {
      cancelled = true;
    };
  }, [link]);

  return (
    <Card className="p-5 sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-600">Refer &amp; earn</p>
      <h2 className="mt-1 font-display text-lg font-bold text-navy-950">Share by QR code</h2>
      <p className="mt-1.5 text-sm text-navy-600">
        Print or display this QR code. Anyone who scans it enters their number, picks a card and
        applies directly on the bank&rsquo;s site — credited to you (ID {referenceId}).
      </p>

      <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-hairline bg-paper p-5">
        {dataUrl ? (
          // A generated data: URL, not an optimizable asset — next/image can't serve this.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt={`QR code for ${link}`} className="h-48 w-48" />
        ) : (
          <div className="h-48 w-48 animate-pulse rounded-lg bg-navy-800/10" aria-hidden />
        )}
        <span className="max-w-full truncate text-xs text-navy-600">{link}</span>
      </div>

      {dataUrl && (
        <a
          href={dataUrl}
          download={`truelend-referral-${referenceId}.png`}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-hairline px-3 py-2 text-sm font-semibold text-navy-800 transition-colors hover:border-navy-800/30 hover:bg-navy-800/[0.04]"
        >
          <Download className="h-3.5 w-3.5 text-red-600" aria-hidden />
          Download QR
        </a>
      )}
    </Card>
  );
}
