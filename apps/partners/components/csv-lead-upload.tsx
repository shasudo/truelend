"use client";

import { useActionState } from "react";
import { Upload, Download } from "lucide-react";
import { Button } from "@truelend/ui";
import { products } from "@truelend/reference";
import { submitLeadsCsv, type CsvState } from "@/lib/lead-actions";

// Fixed column order the parser expects; sample row uses a real product slug.
const TEMPLATE_CSV = `name,phone,email,city,product,message
Ravi Kumar,9876543210,ravi@example.com,Mumbai,${products[0]?.slug ?? ""},Looking for a personal loan
Priya Shah,9812345678,,Pune,,Call back after 6pm
`;

function downloadTemplate() {
  const url = URL.createObjectURL(new Blob([TEMPLATE_CSV], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "truelend-leads-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function CsvLeadUpload() {
  const [state, action, pending] = useActionState<CsvState, FormData>(submitLeadsCsv, {});

  return (
    <form action={action} className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-md text-sm text-navy-600">
          Upload a CSV with columns <code className="rounded bg-navy-800/[0.06] px-1">name</code>,{" "}
          <code className="rounded bg-navy-800/[0.06] px-1">phone</code>, and optionally{" "}
          <code className="rounded bg-navy-800/[0.06] px-1">email</code>,{" "}
          <code className="rounded bg-navy-800/[0.06] px-1">city</code>,{" "}
          <code className="rounded bg-navy-800/[0.06] px-1">product</code>,{" "}
          <code className="rounded bg-navy-800/[0.06] px-1">message</code>.
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={downloadTemplate}>
          <Download className="h-4 w-4" aria-hidden />
          Template
        </Button>
      </div>

      <input
        type="file"
        name="file"
        accept=".csv,text/csv"
        required
        className="block w-full text-sm text-navy-700 file:mr-4 file:cursor-pointer file:rounded-lg file:border file:border-navy-800/20 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-navy-800 hover:file:border-navy-800/50"
      />

      <label className="flex items-start gap-3 text-sm leading-relaxed text-navy-600">
        <input
          type="checkbox"
          name="consent"
          required
          className="mt-1 h-4 w-4 shrink-0 accent-navy-800"
        />
        <span>
          I confirm that every person in this file authorized sharing their details with TrueLend
          and agreed to be contacted about lending products.
        </span>
      </label>

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
