"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Card, Select, cx } from "@truelend/ui";

type Bank = "indusind" | "hdfc";

interface BankLeadCsvImportProps {
  defaultBank?: Bank;
}

export function BankLeadCsvImport({ defaultBank = "indusind" }: BankLeadCsvImportProps) {
  const [bank, setBank] = useState<Bank>(defaultBank);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function upload(file: File) {
    setBusy(true);
    setMessage(null);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("bank", bank);
      const response = await fetch("/api/bank-leads/import", { method: "POST", body });
      const result = (await response.json()) as {
        ok?: boolean;
        total?: number;
        matched?: number;
        created?: number;
        error?: string;
        uncertain?: boolean;
      };
      if (result.uncertain) router.refresh();
      if (!result.ok) {
        setMessage({ ok: false, text: result.error ?? "Import failed." });
        return;
      }
      setMessage({
        ok: true,
        text:
          bank === "hdfc"
            ? `Imported ${result.total} rows: ${result.created} new, ${result.matched} updated.`
            : `Matched ${result.matched} of ${result.total} rows. The rest belong to other agents or channels.`,
      });
      router.refresh();
    } catch {
      setMessage({
        ok: false,
        text: "We couldn't confirm this import. Reload the list before trying again.",
      });
      router.refresh();
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <Card className="mb-6 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Upload className="h-4 w-4 text-navy-500" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-navy-950">Import a bank status export</p>
          <p className="text-xs text-muted">
            {bank === "hdfc" ? (
              <>
                HDFC&rsquo;s weekly MIS report — save the .xlsx as .csv first, needs an{" "}
                <code>APPLICATION_REFERENCE_NUMBER</code> column. Every application updates or adds
                a row in the HDFC report; up to 20,000 rows, 5MB.
              </>
            ) : (
              <>
                The bank&rsquo;s periodic CSV — needs a <code>utm_content</code> column. Rows whose
                code doesn&rsquo;t match one we generated are simply skipped, not rejected. Up to
                20,000 rows, 5MB.
              </>
            )}
          </p>
        </div>
        <Select
          aria-label="Bank"
          value={bank}
          disabled={busy}
          onChange={(event) => setBank(event.target.value as Bank)}
          className="w-auto"
        >
          <option value="indusind">IndusInd</option>
          <option value="hdfc">HDFC</option>
        </Select>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          aria-label="CSV file"
          disabled={busy}
          className="text-sm file:mr-3 file:rounded-lg file:border file:border-hairline file:bg-paper file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-navy-900"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      </div>
      {busy && <p className="mt-3 text-sm text-muted">Importing…</p>}
      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={cx(
            "mt-3 rounded-lg px-3 py-2 text-sm",
            message.ok
              ? "border border-hairline bg-paper text-navy-700"
              : "border border-red-200 bg-red-50 text-red-700",
          )}
        >
          {message.text}
        </p>
      )}
    </Card>
  );
}
