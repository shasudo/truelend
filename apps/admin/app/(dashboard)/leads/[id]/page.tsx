import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus, Phone, Mail, MapPin } from "lucide-react";
import { Button, Card } from "@truelend/ui";
import {
  leadKindLabels,
  productName,
  bankName,
  channelForKind,
  formatDateTime,
  formatPaise,
  tenureLabel,
  employmentTypeLabels,
  residenceTypeLabels,
} from "@truelend/reference";
import { LeadNoteForm, LeadPipelineForm } from "@/components/lead-action-forms";
import { PageTitle } from "@/components/page-title";
import { StatusBadge } from "@/components/status-badge";
import { getAuthContext, requireStaff, scopeFor } from "@/lib/auth";
import { getLead, listEmployees } from "@/lib/lead-queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Lead details" };

interface DetailProps {
  label: string;
  value: string | null | undefined;
}

function Detail({ label, value }: DetailProps) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-navy-900">{value || "—"}</dd>
    </div>
  );
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireStaff();
  const scopeUserId = scopeFor(session);
  const isAdmin = scopeUserId === null;
  const { db } = getAuthContext();
  const [data, employees] = await Promise.all([getLead(db, scopeUserId, id), listEmployees(db)]);
  if (!data) notFound();
  const { lead, isPartnerLead, partnerReferenceId, attemptedRef, notes, cases } = data;
  // Show the code that credited the lead; when nothing was credited but the
  // submission carried one, show that instead so a dead link is visible.
  const refLabel = partnerReferenceId ?? (attemptedRef && `${attemptedRef} · unresolved`);

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
        subtitle={`${leadKindLabels[lead.kind]} · ${channelForKind(lead.kind, isPartnerLead)}`}
        actions={<StatusBadge status={lead.status} />}
      />

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <Card className="p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold text-navy-950">Contact & enquiry</h2>
            <dl className="mt-5 grid grid-cols-1 gap-5 min-[480px]:grid-cols-2">
              <Detail label="Phone" value={lead.phone} />
              <Detail label="Email" value={lead.email} />
              <Detail label="City" value={lead.city} />
              <Detail label="Product" value={productName(lead.productSlug)} />
              {lead.referrerName && <Detail label="Referred by" value={lead.referrerName} />}
              {lead.referrerPhone && <Detail label="Referrer phone" value={lead.referrerPhone} />}
              {refLabel && <Detail label="Referral Partner ref" value={refLabel} />}
            </dl>
            {lead.message && (
              <div className="mt-5 border-t border-hairline pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Message
                </p>
                <p className="mt-1 break-words leading-relaxed text-navy-700">{lead.message}</p>
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
              <p className="mt-4 break-words text-xs text-muted">
                Attribution:{" "}
                {[lead.utmSource, lead.utmMedium, lead.utmCampaign].filter(Boolean).join(" / ")}
              </p>
            )}
          </Card>

          {(lead.loanAmountPaise != null ||
            lead.monthlyIncomePaise != null ||
            lead.employmentType ||
            lead.pincode) && (
            <Card className="p-5 sm:p-6">
              <h2 className="font-display text-lg font-bold text-navy-950">Loan application</h2>
              <dl className="mt-5 grid grid-cols-1 gap-5 min-[480px]:grid-cols-2">
                <Detail
                  label="Loan amount"
                  value={lead.loanAmountPaise != null ? formatPaise(lead.loanAmountPaise) : null}
                />
                <Detail
                  label="Tenure"
                  value={lead.tenureMonths != null ? tenureLabel(lead.tenureMonths) : null}
                />
                <Detail label="Purpose" value={lead.loanPurpose} />
                <Detail label="PIN code" value={lead.pincode} />
                <Detail
                  label="Residence"
                  value={lead.residenceType ? residenceTypeLabels[lead.residenceType] : null}
                />
                <Detail
                  label="Employment"
                  value={lead.employmentType ? employmentTypeLabels[lead.employmentType] : null}
                />
                <Detail
                  label="Monthly income"
                  value={
                    lead.monthlyIncomePaise != null ? formatPaise(lead.monthlyIncomePaise) : null
                  }
                />
                <Detail label="Employer / business" value={lead.employerName} />
                <Detail
                  label="Experience (yrs)"
                  value={lead.experienceYears != null ? String(lead.experienceYears) : null}
                />
                <Detail
                  label="Preferred EMI"
                  value={
                    lead.preferredEmiPaise != null ? formatPaise(lead.preferredEmiPaise) : null
                  }
                />
                <Detail label="Existing with employer" value={lead.existingWithEmployer} />
                <Detail
                  label="Current EMIs / mo"
                  value={lead.existingEmiPaise != null ? formatPaise(lead.existingEmiPaise) : null}
                />
                <Detail
                  label="Outstanding loan"
                  value={
                    lead.outstandingLoanAmountPaise != null
                      ? formatPaise(lead.outstandingLoanAmountPaise)
                      : null
                  }
                />
                <Detail
                  label="Credit card outstanding"
                  value={
                    lead.creditCardOutstandingPaise != null
                      ? formatPaise(lead.creditCardOutstandingPaise)
                      : null
                  }
                />
                <Detail
                  label="Asset value"
                  value={lead.assetValuePaise != null ? formatPaise(lead.assetValuePaise) : null}
                />
                <Detail
                  label="Annual turnover"
                  value={
                    lead.annualTurnoverPaise != null ? formatPaise(lead.annualTurnoverPaise) : null
                  }
                />
              </dl>
            </Card>
          )}

          <Card className="p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold text-navy-950">Notes</h2>
            <LeadNoteForm leadId={lead.id} />
            <ul className="mt-6 space-y-4">
              {notes.length === 0 && <li className="text-sm text-muted">No notes yet.</li>}
              {notes.map(({ note, authorName }) => (
                <li key={note.id} className="border-l-2 border-hairline pl-4">
                  <p className="break-words leading-relaxed text-navy-800">{note.body}</p>
                  <p className="mt-1 text-xs text-muted">
                    {authorName ?? "Unknown"} · {formatDateTime(note.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card className="p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold text-navy-950">Pipeline</h2>

            <LeadPipelineForm
              leadId={lead.id}
              status={lead.status}
              assignedTo={lead.assignedTo}
              assigneeName={employees.find((e) => e.id === lead.assignedTo)?.name ?? null}
              // The roster only feeds the assignee control, which employees do
              // not get — so it never needs to reach their browser.
              employees={isAdmin ? employees : []}
              caseStatuses={cases.map((loanCase) => loanCase.status)}
              canAssign={isAdmin}
            />

            <p className="mt-5 border-t border-hairline pt-4 text-xs text-muted">
              Created {formatDateTime(lead.createdAt)}
            </p>
          </Card>

          <Card className="p-5 sm:p-6">
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
                    className="flex flex-col items-start justify-between gap-3 rounded-lg border border-hairline p-3 transition-colors hover:border-navy-800/30 hover:bg-paper min-[420px]:flex-row min-[420px]:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-navy-950">
                        {bankName(c.lenderSlug)}
                      </p>
                      <p className="truncate text-xs text-navy-500">{productName(c.productSlug)}</p>
                    </div>
                    <div className="flex w-full flex-row flex-wrap items-center justify-between gap-2 min-[420px]:w-auto min-[420px]:shrink-0 min-[420px]:flex-col min-[420px]:items-end min-[420px]:gap-1">
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
