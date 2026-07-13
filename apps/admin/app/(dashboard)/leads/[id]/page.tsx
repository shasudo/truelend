import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus, Phone, Mail, MapPin } from "lucide-react";
import { Button, Card, Field, Select, Textarea, SubmitButton } from "@truelend/ui";
import {
  leadKindLabels,
  leadStatusLabels,
  productName,
  bankName,
  channelForKind,
  formatDateTime,
  formatPaise,
} from "@truelend/reference";
import { schema } from "@truelend/db";
import { PageTitle } from "@/components/page-title";
import { StatusBadge } from "@/components/status-badge";
import { getAuthContext } from "@/lib/auth";
import { getLead, listEmployees } from "@/lib/queries";
import { updateLeadPipelineAction, addLeadNoteAction } from "@/lib/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lead details" };

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{label}</dt>
      <dd className="mt-0.5 text-navy-900">{value || "—"}</dd>
    </div>
  );
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = getAuthContext();
  const [data, employees] = await Promise.all([getLead(db, id), listEmployees(db)]);
  if (!data) notFound();
  const { lead, notes, cases } = data;

  return (
    <>
      <Link
        href="/leads"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-navy-500 hover:text-navy-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to leads
      </Link>

      <PageTitle
        title={lead.name ?? "Unnamed lead"}
        subtitle={`${leadKindLabels[lead.kind]} · ${channelForKind(lead.kind)}`}
        actions={<StatusBadge status={lead.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="font-display text-lg font-bold text-navy-950">Contact & enquiry</h2>
            <dl className="mt-5 grid grid-cols-2 gap-5">
              <Detail label="Phone" value={lead.phone} />
              <Detail label="Email" value={lead.email} />
              <Detail label="City" value={lead.city} />
              <Detail label="Product" value={productName(lead.productSlug)} />
              {lead.referrerName && <Detail label="Referred by" value={lead.referrerName} />}
              {lead.referrerPhone && <Detail label="Referrer phone" value={lead.referrerPhone} />}
            </dl>
            {lead.message && (
              <div className="mt-5 border-t border-hairline pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Message
                </p>
                <p className="mt-1 leading-relaxed text-navy-700">{lead.message}</p>
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-2 border-t border-hairline pt-4">
              {lead.phone && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`tel:${lead.phone}`}>
                    <Phone className="h-4 w-4" aria-hidden /> Call
                  </a>
                </Button>
              )}
              {lead.email && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`mailto:${lead.email}`}>
                    <Mail className="h-4 w-4" aria-hidden /> Email
                  </a>
                </Button>
              )}
              {lead.city && (
                <span className="inline-flex items-center gap-1.5 px-2 text-sm text-muted">
                  <MapPin className="h-4 w-4" aria-hidden /> {lead.city}
                </span>
              )}
            </div>
            {(lead.utmSource || lead.utmMedium || lead.utmCampaign) && (
              <p className="mt-4 text-xs text-muted">
                Attribution:{" "}
                {[lead.utmSource, lead.utmMedium, lead.utmCampaign].filter(Boolean).join(" / ")}
              </p>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="font-display text-lg font-bold text-navy-950">Notes</h2>
            <form action={addLeadNoteAction} className="mt-4 space-y-3">
              <input type="hidden" name="leadId" value={lead.id} />
              <Field label="Note" htmlFor="lead-note" required>
                <Textarea
                  id="lead-note"
                  name="body"
                  required
                  maxLength={4000}
                  placeholder="Log a call, note next steps…"
                  className="min-h-20"
                />
              </Field>
              <SubmitButton size="sm" pendingText="Adding…">
                Add note
              </SubmitButton>
            </form>
            <ul className="mt-6 space-y-4">
              {notes.length === 0 && <li className="text-sm text-muted">No notes yet.</li>}
              {notes.map(({ note, authorName }) => (
                <li key={note.id} className="border-l-2 border-hairline pl-4">
                  <p className="leading-relaxed text-navy-800">{note.body}</p>
                  <p className="mt-1 text-xs text-muted">
                    {authorName ?? "Unknown"} · {formatDateTime(note.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="font-display text-lg font-bold text-navy-950">Pipeline</h2>

            <form action={updateLeadPipelineAction} className="mt-4 space-y-4">
              <input type="hidden" name="leadId" value={lead.id} />
              <Field label="Status" htmlFor="status">
                <Select id="status" name="status" defaultValue={lead.status}>
                  {schema.leadStatus.enumValues.map((s) => (
                    <option key={s} value={s}>
                      {leadStatusLabels[s]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Assigned to" htmlFor="assignedTo">
                <Select id="assignedTo" name="assignedTo" defaultValue={lead.assignedTo ?? ""}>
                  <option value="">Unassigned</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <SubmitButton size="sm" variant="secondary" className="w-full" pendingText="Saving…">
                Save
              </SubmitButton>
            </form>

            <p className="mt-5 border-t border-hairline pt-4 text-xs text-muted">
              Created {formatDateTime(lead.createdAt)}
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-navy-950">Loan cases</h2>
              <Button size="sm" asChild>
                <Link href={`/loan-cases/new?lead=${lead.id}`}>
                  <Plus className="h-4 w-4" aria-hidden /> Add
                </Link>
              </Button>
            </div>
            <ul className="mt-4 space-y-3">
              {cases.length === 0 && <li className="text-sm text-muted">No loan cases yet.</li>}
              {cases.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/loan-cases/${c.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-hairline p-3 transition-colors hover:border-navy-800/30 hover:bg-paper"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-navy-950">
                        {bankName(c.lenderSlug)}
                      </p>
                      <p className="truncate text-xs text-navy-500">{productName(c.productSlug)}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <StatusBadge status={c.status} kind="case" />
                      <span className="text-xs tabular-nums text-navy-500">
                        {formatPaise(c.disbursedAmountPaise ?? c.sanctionedAmountPaise)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
