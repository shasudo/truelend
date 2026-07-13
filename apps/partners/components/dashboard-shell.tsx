"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Upload, User, LogOut, Briefcase, UserRoundPlus } from "lucide-react";
import { Logo, cx } from "@truelend/ui";
import { partnerTypeLabels } from "@truelend/reference";
import { authClient } from "@truelend/auth/client";
import type { Partner } from "@truelend/db";

export function DashboardShell({
  partner,
  name,
  children,
}: {
  partner: Partner;
  name: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const business = partner.type === "business";

  const nav = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    business
      ? { label: "Submit Leads", href: "/leads", icon: Briefcase }
      : { label: "Refer a Friend", href: "/refer", icon: UserRoundPlus },
    { label: "My Documents", href: "/kyc", icon: Upload },
    { label: "Profile", href: "/profile", icon: User },
  ];

  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  async function signOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-hairline bg-white">
        <div className="flex h-16 items-center border-b border-hairline px-5 text-navy-800">
          <Logo />
        </div>
        <nav className="flex-1 space-y-0.5 p-3" aria-label="Main">
          {nav.map((item) => (
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
        </nav>
        <div className="border-t border-hairline p-3">
          <div className="px-2 py-1.5">
            <p className="truncate text-sm font-semibold text-navy-950">{name}</p>
            <span className="mt-1 inline-block rounded-full bg-navy-800/[0.07] px-2 py-0.5 text-xs font-semibold text-navy-600">
              {partnerTypeLabels[partner.type]}
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
      <main className="min-h-screen flex-1 px-6 py-8 sm:px-10">{children}</main>
    </div>
  );
}
