import type { ReactNode } from "react";
import { Sidebar, MobileNav } from "@/components/sidebar";
import { requireStaff } from "@/lib/auth";

// Real auth for every dashboard page (middleware only checks the cookie exists).
// requireStaff, not requireSession: partners share these auth tables, so a valid
// session isn't enough — only admin|employee may see the dashboard.
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await requireStaff();
  const user = {
    name: session.user.name,
    email: session.user.email,
    role: session.user.role ?? "employee",
  };
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-navy-800 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <div className="lg:flex">
        <Sidebar user={user} />
        <div className="flex min-h-screen flex-1 flex-col">
          <MobileNav user={user} />
          <main id="main-content" tabIndex={-1} className="flex-1 px-6 py-8 sm:px-10">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
