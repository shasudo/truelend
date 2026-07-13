import { requirePartner } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Metrics filled in a later step.
export default async function DashboardPage() {
  const { session } = await requirePartner();
  return (
    <>
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy-950">
        Welcome, {session.user.name.split(" ")[0]}
      </h1>
      <p className="mt-1 text-navy-500">Your dashboard metrics will appear here.</p>
    </>
  );
}
