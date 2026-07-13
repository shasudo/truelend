"use client";

import { useActionState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@truelend/ui";
import { submitLeadsCsv, type CsvState } from "@/lib/lead-actions";

export function CsvLeadUpload() {
  const [state, action, pending] = useActionState<CsvState, FormData>(submitLeadsCsv, {});

  return (
    <form action={action} className="space-y-4">
      <p className="text-sm text-navy-600">
        Upload a CSV with columns <code className="rounded bg-navy-800/[0.06] px-1">name</code>,{" "}
        <code className="rounded bg-navy-800/[0.06] px-1">phone</code>, and optionally{" "}
        <code className="rounded bg-navy-800/[0.06] px-1">email</code>,{" "}
        <code className="rounded bg-navy-800/[0.06] px-1">city</code>,{" "}
        <code className="rounded bg-navy-800/[0.06] px-1">product</code>,{" "}
        <code className="rounded bg-navy-800/[0.06] px-1">message</code>.
      </p>

      <input
        type="file"
        name="file"
        accept=".csv,text/csv"
        required
        className="block w-full text-sm text-navy-700 file:mr-4 file:cursor-pointer file:rounded-lg file:border file:border-navy-800/20 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-navy-800 hover:file:border-navy-800/50"
      />

      {state.error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}
      {state.ok && (
        <p
          role="status"
          className="rounded-lg border border-navy-800/15 bg-navy-800/[0.05] px-4 py-3 text-sm text-navy-700"
        >
          Imported {state.inserted} lead{state.inserted === 1 ? "" : "s"}.
          {state.rowErrors &&
            state.rowErrors.length > 0 &&
            ` ${state.rowErrors.length} row(s) skipped.`}
        </p>
      )}
      {state.rowErrors && state.rowErrors.length > 0 && (
        <ul className="max-h-32 overflow-y-auto rounded-lg border border-hairline p-3 text-xs text-navy-500">
          {state.rowErrors.slice(0, 20).map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}

      <Button type="submit" variant="outline" disabled={pending}>
        <Upload className="h-4 w-4" aria-hidden />
        {pending ? "Importing…" : "Import CSV"}
      </Button>
    </form>
  );
}
