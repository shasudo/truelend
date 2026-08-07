import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone, Mail, MapPin, AlertTriangle } from "lucide-react";
import { Button, Card } from "@truelend/ui";
import {
  appUrls,
  callStatusLabels,
  formatDateTime,
  isTerminalCallStatus,
  isUnansweredCallStatus,
  MAX_CALL_ATTEMPTS,
  productName,
} from "@truelend/reference";
import { PageTitle } from "@/components/page-title";
import { StatusBadge } from "@/components/status-badge";
import {
  CallTaskStatusForm,
  ConvertCallTaskForm,
  EnquiryLinkActions,
} from "@/components/crm-forms";
import { getAuthContext, requireStaff, scopeFor } from "@/lib/auth";
import { getCallTask } from "@/lib/crm-queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Call task" };

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

export default async function CallTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireStaff();
  const { db } = getAuthContext();
  // A task that is not this employee's simply does not resolve, so a guessed id
  // is a 404 rather than a 403 that confirms the row exists.
  const data = await getCallTask(db, scopeFor(session), id);
  if (!data) notFound();
  const { task, duplicateLead, duplicateTask, history } = data;

  /*
   * The attempt record Harsha asked for: every logged outcome, numbered in the
   * order it was dialled. The query returns newest-first (it is capped at 50, so
   * the cap has to keep the RECENT rows), which is the wrong end to number from —
   * attempt 1 is the first call ever made, so the list is reversed here.
   */
  const attempts = history.filter((entry) => entry.action === "call_task.status_update").reverse();
  const otherEvents = history.filter((entry) => entry.action !== "call_task.status_update");
  // Only unanswered outcomes (attempted/busy) count towards MAX_CALL_ATTEMPTS —
  // see updateCallTaskStatusAction — so the header count must match, not the
  // total row count below it, or it misstates how close the number is to closing.
  const unansweredAttempts = attempts.filter((entry) =>
    isUnansweredCallStatus(entry.after?.status ?? ""),
  ).length;

  const enquiryUrl = `${appUrls.website}/enquiry${
    task.productSlug ? `?product=${encodeURIComponent(task.productSlug)}` : ""
  }`;

  return (
    <>
      <Link
        href="/crm"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-navy-500 hover:text-navy-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to call queue
      </Link>

      <PageTitle
        title={task.name}
        subtitle={task.source ? `Call queue · ${task.source}` : "Call queue"}
        actions={<StatusBadge status={task.status} kind="call" />}
      />

      {(duplicateLead || duplicateTask) && (
        <Card className="mb-6 border-sun-400/40 bg-sun-50 p-4">
          <p className="flex flex-wrap items-center gap-2 text-sm text-sun-600">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            {duplicateLead ? (
              <>
                A lead already exists with this phone number.{" "}
                <Link href={`/leads/${duplicateLead.id}`} className="font-semibold underline">
                  Open it
                </Link>{" "}
                — converting will link to it rather than create a second lead.
              </>
            ) : (
              <>
                Another call task has this same phone number
                {duplicateTask!.assigneeName
                  ? `, assigned to ${duplicateTask!.assigneeName}`
                  : ""}.{" "}
                <Link href={`/crm/${duplicateTask!.id}`} className="font-semibold underline">
                  Open it
                </Link>{" "}
                before calling — someone may already be working this prospect.
              </>
            )}
          </p>
        </Card>
      )}

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <Card className="p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold text-navy-950">Contact</h2>
            <dl className="mt-5 grid grid-cols-1 gap-5 min-[480px]:grid-cols-2">
              <Detail label="Phone" value={task.phone} />
              <Detail label="Email" value={task.email} />
              <Detail label="City" value={task.city} />
              <Detail label="Product" value={productName(task.productSlug)} />
            </dl>
            {task.notes && (
              <div className="mt-5 border-t border-hairline pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Remark
                </p>
                <p className="mt-1 break-words leading-relaxed text-navy-700">{task.notes}</p>
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-2 border-t border-hairline pt-4">
              <Button variant="outline" size="sm" asChild>
                <a href={`tel:${task.phone}`}>
                  <Phone className="h-4 w-4" aria-hidden /> Call
                </a>
              </Button>
              {task.email && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`mailto:${task.email}`}>
                    <Mail className="h-4 w-4" aria-hidden /> Email
                  </a>
                </Button>
              )}
              {task.city && (
                <span className="inline-flex items-center gap-1.5 px-2 text-sm text-muted">
                  <MapPin className="h-4 w-4" aria-hidden /> {task.city}
                </span>
              )}
            </div>
          </Card>

          {task.leadId ? (
            <Card className="p-5 sm:p-6">
              <h2 className="font-display text-lg font-bold text-navy-950">Converted</h2>
              <p className="mt-2 text-sm text-navy-700">
                This task became a lead.{" "}
                <Link
                  href={`/leads/${task.leadId}`}
                  className="font-semibold text-red-600 hover:text-red-700"
                >
                  Open the lead
                </Link>
                .
              </p>
            </Card>
          ) : isTerminalCallStatus(task.status) ? (
            <Card className="p-5 sm:p-6">
              <h2 className="font-display text-lg font-bold text-navy-950">Closed</h2>
              <p className="mt-2 text-sm text-muted">
                This task was closed as “{callStatusLabels[task.status] ?? task.status}”, so it
                can&apos;t be converted. Import the prospect again to reopen them.
              </p>
            </Card>
          ) : (
            <Card className="p-5 sm:p-6">
              <h2 className="font-display text-lg font-bold text-navy-950">Convert to a lead</h2>
              <p className="mt-1 text-sm text-muted">
                Fill this in for them, or send them the form and convert once they reply.
              </p>
              <ConvertCallTaskForm
                taskId={task.id}
                name={task.name}
                phone={task.phone}
                email={task.email}
                city={task.city}
                productSlug={task.productSlug}
              />
            </Card>
          )}

          <Card className="max-w-full overscroll-x-contain overflow-x-auto p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-navy-950">Call attempts</h2>
              <p className="text-sm text-muted">
                {unansweredAttempts} of {MAX_CALL_ATTEMPTS} unanswered before the number is closed
              </p>
            </div>
            {attempts.length === 0 ? (
              <p className="mt-4 text-sm text-muted">Nothing recorded yet.</p>
            ) : (
              <table className="mt-4 w-full text-left text-sm" style={{ minWidth: "620px" }}>
                <thead>
                  <tr className="border-b border-hairline text-xs font-semibold uppercase tracking-[0.1em] text-navy-500">
                    <th className="py-2 pr-3">#</th>
                    <th className="py-2 pr-3">When</th>
                    <th className="py-2 pr-3">Caller</th>
                    <th className="py-2 pr-3">Outcome</th>
                    <th className="py-2 pr-3">Next callback</th>
                    <th className="py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((entry, index) => (
                    <tr
                      key={`${entry.createdAt.toISOString()}-${index}`}
                      className="border-b border-hairline align-top last:border-b-0"
                    >
                      <td className="py-2.5 pr-3 tabular-nums font-semibold text-navy-900">
                        {index + 1}
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap tabular-nums text-navy-700">
                        {formatDateTime(entry.createdAt)}
                      </td>
                      <td className="py-2.5 pr-3 break-all text-navy-700">
                        {entry.actorEmail ?? "Unknown"}
                      </td>
                      <td className="py-2.5 pr-3 text-navy-900">
                        {callStatusLabels[entry.after?.status ?? ""] ?? entry.after?.status}
                        {entry.after?.closed === "exhausted" && (
                          <span className="mt-0.5 block text-xs text-red-600">
                            Attempt limit reached — closed
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap tabular-nums text-navy-700">
                        {entry.after?.callbackAt
                          ? formatDateTime(new Date(entry.after.callbackAt))
                          : "—"}
                      </td>
                      <td className="py-2.5 break-words text-navy-700">
                        {entry.after?.note || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Assignments, conversions and emailed forms are things done TO the
                task rather than dials on it, so they sit below the attempt
                record instead of being numbered alongside it. */}
            {otherEvents.length > 0 && (
              <ul className="mt-5 space-y-2 border-t border-hairline pt-4">
                {otherEvents.map((entry, index) => (
                  <li
                    key={`${entry.createdAt.toISOString()}-${index}`}
                    className="text-xs text-muted"
                  >
                    {entry.action.replace("call_task.", "").replace(/_/g, " ")} ·{" "}
                    {entry.actorEmail ?? "Unknown"} · {formatDateTime(entry.createdAt)}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card className="p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold text-navy-950">Outcome</h2>
            <CallTaskStatusForm
              taskId={task.id}
              status={task.status}
              callbackAt={task.callbackAt}
            />
            <p className="mt-5 border-t border-hairline pt-4 text-xs text-muted">
              Added {formatDateTime(task.createdAt)}
            </p>
          </Card>

          {!isTerminalCallStatus(task.status) && (
            <Card className="p-5 sm:p-6">
              <h2 className="font-display text-lg font-bold text-navy-950">Send them the form</h2>
              <EnquiryLinkActions
                taskId={task.id}
                url={enquiryUrl}
                hasEmail={Boolean(task.email)}
              />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
