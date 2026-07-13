"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import {
  LayoutDashboard,
  Upload,
  User,
  LogOut,
  Briefcase,
  UserRoundPlus,
  Menu,
  X,
} from "lucide-react";
import { Logo, cx } from "@truelend/ui";
import { partnerTypeLabels } from "@truelend/reference";
import { authClient } from "@truelend/auth/client";
import type { Partner } from "@truelend/db";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
}

function useSignOut() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function signOut() {
    if (pending) return;
    setPending(true);
    try {
      await authClient.signOut();
      router.push("/login");
      router.refresh();
    } catch {
      setPending(false);
    }
  }
  return { signOut, pending };
}

function NavLinks({ nav, onNavigate }: { nav: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  return (
    <>
      {nav.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
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
    </>
  );
}

function UserCard({ name, type }: { name: string; type: Partner["type"] }) {
  const { signOut, pending } = useSignOut();
  return (
    <div className="border-t border-hairline p-3">
      <div className="px-2 py-1.5">
        <p className="truncate text-sm font-semibold text-navy-950">{name}</p>
        <span className="mt-1 inline-block rounded-full bg-navy-800/[0.07] px-2 py-0.5 text-xs font-semibold text-navy-600">
          {partnerTypeLabels[type]}
        </span>
      </div>
      <button
        onClick={signOut}
        disabled={pending}
        className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-navy-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
      >
        <LogOut className="h-4.5 w-4.5 shrink-0" aria-hidden />
        {pending ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}

export function DashboardShell({
  partner,
  name,
  children,
}: {
  partner: Partner;
  name: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const business = partner.type === "business";

  const nav: NavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    business
      ? { label: "Submit a lead", href: "/leads", icon: Briefcase }
      : { label: "Refer a friend", href: "/refer", icon: UserRoundPlus },
    { label: "My KYC", href: "/kyc", icon: Upload },
    { label: "Profile", href: "/profile", icon: User },
  ];

  return (
    <div className="lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-hairline bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-hairline px-5 text-navy-800">
          <Logo />
        </div>
        <nav className="flex-1 space-y-0.5 p-3" aria-label="Main">
          <NavLinks nav={nav} />
        </nav>
        <UserCard name={name} type={partner.type} />
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-hairline bg-white/90 px-4 backdrop-blur-md lg:hidden">
          <span className="text-navy-800">
            <Logo />
          </span>
          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
              <button
                className="rounded-md p-2 text-navy-800 hover:bg-navy-800/5"
                aria-label="Open menu"
              >
                <Menu className="h-6 w-6" />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-navy-950/40 backdrop-blur-sm data-[state=open]:animate-[fade-in_200ms_ease-out]" />
              <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white data-[state=open]:animate-[drawer-in-left_250ms_var(--ease-out-quart)]">
                <div className="flex h-14 items-center justify-between border-b border-hairline px-4">
                  <Dialog.Title className="sr-only">Menu</Dialog.Title>
                  <span className="text-navy-800">
                    <Logo />
                  </span>
                  <Dialog.Close asChild>
                    <button
                      className="rounded-md p-2 text-navy-500 hover:bg-navy-800/5"
                      aria-label="Close menu"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </Dialog.Close>
                </div>
                <nav className="flex-1 space-y-0.5 overflow-y-auto p-3" aria-label="Main">
                  <NavLinks nav={nav} onNavigate={() => setOpen(false)} />
                </nav>
                <UserCard name={name} type={partner.type} />
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </header>

        <main className="flex-1 px-6 py-8 sm:px-10">{children}</main>
      </div>
    </div>
  );
}
