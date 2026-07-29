"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, FileText, Loader2, Upload } from "lucide-react";
import { Card, cx } from "@truelend/ui";
import { partnerDocTypes } from "@truelend/reference";

interface PartnerDocumentUploadProps {
  partnerId: string;
  uploadedDocumentTypes: readonly string[];
}

export function PartnerDocumentUpload({
  partnerId,
  uploadedDocumentTypes,
}: PartnerDocumentUploadProps) {
  const uploaded = new Set(uploadedDocumentTypes);
  return (
    <div className="space-y-3">
      {partnerDocTypes.map((document) => (
        <DocumentRow
          key={document.type}
          partnerId={partnerId}
          document={document}
          uploaded={uploaded.has(document.type)}
        />
      ))}
      <p className="text-sm text-muted">
        JPG, PNG, or PDF files only; maximum size 5MB per document.
      </p>
    </div>
  );
}

interface DocumentRowProps {
  partnerId: string;
  document: { type: string; label: string };
  uploaded: boolean;
}

function DocumentRow({ partnerId, document, uploaded }: DocumentRowProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(uploaded);
  const [error, setError] = useState<string>();

  useEffect(() => {
    setDone(uploaded);
  }, [uploaded]);

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(undefined);
    const body = new FormData();
    body.set("partnerId", partnerId);
    body.set("docType", document.type);
    body.set("file", file);
    try {
      const response = await fetch("/api/kyc/upload", { method: "POST", body });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        uncertain?: boolean;
      };
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Upload failed.");
        if (data.uncertain) router.refresh();
      } else {
        setDone(true);
        router.refresh();
      }
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <Card
      aria-busy={busy}
      className="flex flex-col items-stretch justify-between gap-4 p-4 min-[420px]:flex-row min-[420px]:items-center"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cx(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            done ? "bg-navy-800 text-white" : "bg-navy-800/[0.06] text-navy-500",
          )}
        >
          {done ? (
            <Check className="h-5 w-5" aria-hidden />
          ) : (
            <FileText className="h-5 w-5" aria-hidden />
          )}
        </span>
        <div className="min-w-0">
          <p className="break-words font-medium text-navy-950">{document.label}</p>
          {error ? (
            <p role="alert" className="text-xs text-red-700">
              {error}
            </p>
          ) : (
            <p role="status" className="text-xs text-muted">
              {busy ? "Uploading…" : done ? "Uploaded" : "Not uploaded"}
            </p>
          )}
        </div>
      </div>
      <label
        className={cx(
          "inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-navy-800/20 px-3.5 py-2 text-sm font-medium text-navy-800 transition-colors hover:border-navy-800/50 min-[420px]:w-auto",
          "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-red-600",
          busy && "pointer-events-none opacity-60",
        )}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Upload className="h-4 w-4" aria-hidden />
        )}
        {done ? "Replace" : "Upload"}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          aria-label={`Upload ${document.label}`}
          className="sr-only"
          onChange={upload}
          disabled={busy}
        />
      </label>
    </Card>
  );
}
