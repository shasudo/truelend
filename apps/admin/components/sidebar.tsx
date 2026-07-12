"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  Banknote,
  BarChart3,
  Users,
  Building2,
  UserRoundPlus,
  LogOut,
} from "lucide-react";
import { Logo, cx } from "@truelend/ui";
import { authClient } from "@truelend/auth/client";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}

const nav: NavItem[] = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Leads", href: "/leads", icon: Inbox },
  { label: "Loan Cases", href: "/loan-cases", icon: Banknote },
  { label: "MIS", href: "/mis", icon: BarChart3 },
  { label: "Team", href: "/team", icon: Users, adminOnly: true },
];

// Partner platforms don't exist yet — shown disabled so the roadmap is visible.
const upcoming = [
  { label: "Business Partners", icon: Building2 },
  { label: "Referral Partners", icon: UserRoundPlus },
];

export interface SidebarUser {
  name: string;
  email: string;
  role: string;
}

export function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = user.role === "admin";

  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  async function signOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-hairline bg-white">
      <div className="flex h-16 items-center border-b border-hairline px-5 text-navy-800">
        <Logo />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3" aria-label="Main">
        {nav
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active(item.href)
                  ? "bg-navy-800 text-white"
                  : "text-navy-600 hover:bg-navy-800/[0.06] hover:text-navy-950",
              )}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" aria-hidden />
              {item.label}
            </Link>
          ))}

        <p className="px-3 pb-1 pt-5 text-xs font-bold uppercase tracking-[0.14em] text-navy-300">
          Coming soon
        </p>
        {upcoming.map((item) => (
          <span
            key={item.label}
            aria-disabled
            className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-navy-300"
          >
            <item.icon className="h-4.5 w-4.5 shrink-0" aria-hidden />
            {item.label}
          </span>
        ))}
      </nav>

      <div className="border-t border-hairline p-3">
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-semibold text-navy-950">{user.name}</p>
          <p className="truncate text-xs text-navy-400">{user.email}</p>
          <span className="mt-1 inline-block rounded-full bg-navy-800/[0.07] px-2 py-0.5 text-xs font-semibold capitalize text-navy-600">
            {user.role}
          </span>
        </div>
        <button
          onClick={signOut}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-navy-600 transition-colors hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="h-4.5 w-4.5 shrink-0" aria-hidden />
          Sign out
        </button>
      </div>
    </aside>
  );
}
