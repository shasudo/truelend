import type { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";
import { requireSession } from "@/lib/auth";

// Real session validation for every dashboard page (middleware only checks
// the cookie exists). Redirects to /login when there's no valid session.
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  return (
    <div className="flex">
      <Sidebar
        user={{
          name: session.user.name,
          email: session.user.email,
          role: session.user.role ?? "employee",
        }}
      />
      <main className="min-h-screen flex-1 px-6 py-8 sm:px-10">{children}</main>
    </div>
  );
}
