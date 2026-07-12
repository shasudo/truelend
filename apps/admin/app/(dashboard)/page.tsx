import { requireSession } from "@/lib/auth";
import { PageTitle } from "@/components/page-title";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const session = await requireSession();
  return (
    <>
      <PageTitle title={`Welcome back, ${session.user.name.split(" ")[0]}`} subtitle="Overview" />
      <p className="text-navy-500">Dashboard metrics coming next.</p>
    </>
  );
}
