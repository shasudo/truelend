"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download } from "lucide-react";
import { Card } from "@truelend/ui";
import { appUrls } from "@truelend/reference";

interface ReferralQrCardProps {
  referenceId: string;
}

// The mark from app/icon.svg, colours baked in (currentColor can't reach a
// canvas image) and sized so Safari rasterises the data URL.
const LOGO_SRC = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">' +
    '<path d="M50 6 88.1 28 88.1 72 50 94 11.9 72 11.9 28Z" fill="#faf8f3" stroke="#14204a" stroke-width="6" stroke-linejoin="round"/>' +
    '<polygon points="35.5,72.4 37,72.4 53.2,55.8 56.6,58.8 57.6,71.9 68.4,72.4 69.9,70.9 69.9,55.3 45.8,31.1 30.6,31.1 28.6,33.2 29.1,42.7 41.9,43.2 45.3,46.7 28.6,64.3" fill="#ce0e17" stroke="#ce0e17" stroke-width="3.2" stroke-linejoin="round"/>' +
    '<polygon points="69.9,46.7 69.9,31.1 54.7,31.1" fill="#14204a" stroke="#14204a" stroke-width="3.2" stroke-linejoin="round"/>' +
    "</svg>",
)}`;

/**
 * QR with the TrueLend mark punched into the middle. Error correction "H"
 * recovers 30% of the modules, so the ~5% of area the logo covers still scans.
 */
async function renderQrWithLogo(link: string) {
  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, link, { width: 480, margin: 2, errorCorrectionLevel: "H" });
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas.toDataURL("image/png");

  const logo = new Image();
  logo.src = LOGO_SRC;
  await logo.decode();

  const size = canvas.width * 0.22;
  const offset = (canvas.width - size) / 2;
  const pad = size * 0.12;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(offset - pad, offset - pad, size + pad * 2, size + pad * 2);
  ctx.drawImage(logo, offset, offset, size, size);
  return canvas.toDataURL("image/png");
}

export function ReferralQrCard({ referenceId }: ReferralQrCardProps) {
  const link = `${appUrls.website}/apply?ref=${referenceId}`;
  const [dataUrl, setDataUrl] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    renderQrWithLogo(link)
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
