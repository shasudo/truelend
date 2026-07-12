import { requireAdmin } from "@/lib/auth";
import { PageTitle } from "@/components/page-title";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  await requireAdmin();
  return (
    <>
      <PageTitle title="Team" subtitle="Employees and access" />
      <p className="text-navy-500">Team management coming next.</p>
    </>
  );
}
