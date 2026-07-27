"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Upload, Loader2, FileText } from "lucide-react";
import { Card, cx } from "@truelend/ui";
import { partnerDocTypes } from "@truelend/reference";

export function KycUpload({
  uploadedDocumentTypes,
  editable = true,
}: {
  uploadedDocumentTypes: readonly string[];
  editable?: boolean;
}) {
  const uploadedTypes = new Set(uploadedDocumentTypes);
  const allRequiredDone = partnerDocTypes.every((d) => uploadedTypes.has(d.type));

  return (
    <div className="space-y-3">
      {partnerDocTypes.map((doc) => (
        <DocRow
          key={doc.type}
          doc={doc}
          uploaded={uploadedTypes.has(doc.type)}
          editable={editable}
        />
      ))}
      {editable && (
        <p className="pt-1 text-sm text-navy-500">
          {allRequiredDone
            ? "All required documents uploaded — our team will review and verify your account shortly."
            : "Upload all required documents (JPG, PNG or PDF, up to 5MB each). Our team reviews within a working day."}
        </p>
      )}
    </div>
  );
}

function DocRow({
  doc,
  uploaded,
  editable,
}: {
  doc: { type: string; label: string };
  uploaded: boolean;
  editable: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(uploaded);

  useEffect(() => {
    setDone(uploaded);
  }, [uploaded]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(undefined);
    setBusy(true);
    const body = new FormData();
    body.set("docType", doc.type);
    body.set("file", file);
    try {
      const res = await fetch("/api/kyc/upload", { method: "POST", body });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        uncertain?: boolean;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Upload failed");
        if (data.uncertain) router.refresh();
      } else {
        setDone(true);
        router.refresh();
      }
    } catch {
      setError("Upload failed — please try again.");
      router.refresh();
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
            "flex h-9 w-9 items-center justify-center rounded-lg",
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
          <p className="break-words font-medium text-navy-950">{doc.label}</p>
          {error ? (
            <p role="alert" className="text-xs text-red-600">
              {error}
            </p>
          ) : (
            <p role="status" aria-live="polite" className="text-xs text-muted">
              {busy ? "Uploading…" : done ? "Uploaded" : "Not uploaded"}
            </p>
          )}
        </div>
      </div>

      {editable && (
        <label
          className={cx(
            "inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-navy-800/20 px-3.5 py-2 text-sm font-medium text-navy-800 transition-colors hover:border-navy-800/50 min-[420px]:w-auto",
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
            aria-label={`Upload ${doc.label}`}
            className="sr-only"
            onChange={onFile}
            disabled={busy}
          />
        </label>
      )}
    </Card>
  );
}
