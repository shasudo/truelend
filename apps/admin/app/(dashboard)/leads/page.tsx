import Link from "next/link";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button, Card, Input, Select, cx } from "@truelend/ui";
import {
  products,
  leadKindLabels,
  leadStatusLabels,
  productName,
  formatDate,
} from "@truelend/reference";
import { schema } from "@truelend/db";
import { PageTitle } from "@/components/page-title";
import { StatusBadge } from "@/components/status-badge";
import { getAuthContext } from "@/lib/auth";
import {
  listLeads,
  listEmployees,
  type LeadFilters,
  type LeadStatus,
  type LeadKind,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

function str(sp: SP, key: string): string | undefined {
  const v = sp[key];
  return typeof v === "string" && v !== "" ? v : undefined;
}

function parseFilters(sp: SP): LeadFilters {
  const status = str(sp, "status");
  const kind = str(sp, "kind");
  return {
    status: (schema.leadStatus.enumValues as readonly string[]).includes(status ?? "")
      ? (status as LeadStatus)
      : undefined,
    kind: (schema.leadKind.enumValues as readonly string[]).includes(kind ?? "")
      ? (kind as LeadKind)
      : undefined,
    product: str(sp, "product"),
    assignee: str(sp, "assignee"),
    q: str(sp, "q"),
    page: Math.max(1, Number(str(sp, "page")) || 1),
  };
}

function queryString(f: LeadFilters, page: number): string {
  const p = new URLSearchParams();
  if (f.status) p.set("status", f.status);
  if (f.kind) p.set("kind", f.kind);
  if (f.product) p.set("product", f.product);
  if (f.assignee) p.set("assignee", f.assignee);
  if (f.q) p.set("q", f.q);
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export default async function LeadsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const hasFilters = Boolean(
    filters.status || filters.kind || filters.product || filters.assignee || filters.q,
  );
  const { db } = getAuthContext();
  const [{ rows, total, page, pageCount }, employees] = await Promise.all([
    listLeads(db, filters),
    listEmployees(db),
  ]);

  return (
    <>
      <PageTitle
        title="Leads"
        subtitle={`${total} ${total === 1 ? "lead" : "leads"} from the website`}
      />

      <Card className="mb-6 p-4">
        <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative lg:col-span-2">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <Input
              name="q"
              defaultValue={filters.q ?? ""}
              placeholder="Name, phone or email"
              className="pl-9"
              aria-label="Search"
            />
          </div>
          <Select name="status" defaultValue={filters.status ?? ""} aria-label="Status">
            <option value="">Any status</option>
            {schema.leadStatus.enumValues.map((s) => (
              <option key={s} value={s}>
                {leadStatusLabels[s]}
              </option>
            ))}
          </Select>
          <Select name="kind" defaultValue={filters.kind ?? ""} aria-label="Channel">
            <option value="">Any channel</option>
            {schema.leadKind.enumValues.map((k) => (
              <option key={k} value={k}>
                {leadKindLabels[k]}
              </option>
            ))}
          </Select>
          <Select name="product" defaultValue={filters.product ?? ""} aria-label="Product">
            <option value="">Any product</option>
            {products.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </Select>
          <Select name="assignee" defaultValue={filters.assignee ?? ""} aria-label="Assignee">
            <option value="">Any assignee</option>
            <option value="unassigned">Unassigned</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </Select>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-6">
            <Button type="submit" size="sm">
              Apply filters
            </Button>
            <Button type="button" variant="ghost" size="sm" asChild>
              <Link href="/leads">Clear</Link>
            </Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-hairline text-xs font-semibold uppercase tracking-[0.1em] text-navy-500">
              <th className="px-5 py-3 font-semibold">Name</th>
              <th className="px-5 py-3 font-semibold">Contact</th>
              <th className="px-5 py-3 font-semibold">Product</th>
              <th className="px-5 py-3 font-semibold">Channel</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Assignee</th>
              <th className="px-5 py-3 font-semibold">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-muted">
                  {hasFilters
                    ? "No leads match these filters."
                    : "No leads yet — they'll appear here as the website captures them."}
                </td>
              </tr>
            )}
            {rows.map((lead) => (
              <tr key={lead.id} className="border-b border-hairline last:border-b-0 hover:bg-paper">
                <td className="px-5 py-3.5">
                  <Link
                    href={`/leads/${lead.id}`}
                    className="font-semibold text-navy-950 hover:text-red-600"
                  >
                    {lead.name ?? "—"}
                  </Link>
                </td>
                <td className="px-5 py-3.5 text-navy-600">
                  <div className="tabular-nums">{lead.phone ?? "—"}</div>
                  {lead.email && <div className="text-xs text-muted">{lead.email}</div>}
                </td>
                <td className="px-5 py-3.5 text-navy-600">{productName(lead.productSlug)}</td>
                <td className="px-5 py-3.5 text-navy-600">{leadKindLabels[lead.kind]}</td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={lead.status} />
                </td>
                <td className="px-5 py-3.5 text-navy-600">{lead.assigneeName ?? "—"}</td>
                <td className="px-5 py-3.5 tabular-nums text-navy-500">
                  {formatDate(lead.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {pageCount > 1 && (
        <div className="mt-5 flex items-center justify-between text-sm text-navy-500">
          <span>
            Page {page} of {pageCount}
          </span>
          <div className="flex gap-2">
            {/* asChild disabled doesn't inert an anchor — kill pointer + focus explicitly. */}
            <Button
              variant="outline"
              size="sm"
              asChild
              className={cx(page <= 1 && "pointer-events-none opacity-50")}
            >
              <Link
                href={`/leads${queryString(filters, page - 1)}`}
                aria-disabled={page <= 1}
                tabIndex={page <= 1 ? -1 : undefined}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden /> Prev
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              className={cx(page >= pageCount && "pointer-events-none opacity-50")}
            >
              <Link
                href={`/leads${queryString(filters, page + 1)}`}
                aria-disabled={page >= pageCount}
                tabIndex={page >= pageCount ? -1 : undefined}
              >
                Next <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
export const metadata = { title: "Leads" };
