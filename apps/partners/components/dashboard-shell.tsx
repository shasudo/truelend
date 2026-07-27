"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  BadgeIndianRupee,
  BookOpenCheck,
  CircleHelp,
  FileCheck2,
  Handshake,
  LayoutDashboard,
  LayoutGrid,
  LibraryBig,
  NotebookTabs,
  User,
  LogOut,
  UserRoundPlus,
  Menu,
  X,
} from "lucide-react";
import { Logo, cx } from "@truelend/ui";
import { authClient } from "@truelend/auth/client";
import { PartnerIdChip } from "./partner-id-chip";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

function useSignOut() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  async function signOut() {
    if (pending) return;
    setPending(true);
    setError(undefined);
    try {
      const { error } = await authClient.signOut();
      if (error) throw new Error("Sign out failed");
      router.push("/login");
      router.refresh();
    } catch {
      setError("Could not sign out. Please try again.");
      setPending(false);
    }
  }
  return { signOut, pending, error };
}

function NavLinks({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  return (
    <>
      {groups.map((group, index) => (
        <div key={group.label} className={cx(index > 0 && "mt-5")}>
          <p className="mb-1.5 px-3 text-xs font-bold uppercase tracking-[0.14em] text-muted">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active(item.href) ? "page" : undefined}
                className={cx(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active(item.href)
                    ? "bg-navy-800 text-white shadow-[0_8px_24px_-16px_rgba(7,13,36,0.85)]"
                    : "text-navy-600 hover:bg-navy-800/[0.06] hover:text-navy-950",
                )}
              >
                <item.icon
                  className={cx(
                    "h-4.5 w-4.5 shrink-0",
                    active(item.href) ? "text-sun-400" : "text-navy-500 group-hover:text-red-600",
                  )}
                  aria-hidden
                />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function UserCard({ name, referenceId }: { name: string; referenceId: string }) {
  const { signOut, pending, error } = useSignOut();
  return (
    <div className="border-t border-hairline p-3">
      <div className="px-2 py-1.5">
        <p className="truncate text-sm font-semibold text-navy-950">{name}</p>
        <span className="mt-1 inline-block rounded-full bg-navy-800/[0.07] px-2 py-0.5 text-xs font-semibold text-navy-600">
          Referral Partner
        </span>
      </div>
      <PartnerIdChip referenceId={referenceId} className="mt-2 w-full justify-between" />
      <button
        type="button"
        onClick={signOut}
        disabled={pending}
        className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-navy-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
      >
        <LogOut className="h-4.5 w-4.5 shrink-0" aria-hidden />
        {pending ? "Signing out…" : "Sign out"}
      </button>
      {error && (
        <p role="alert" className="px-3 pt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function DashboardShell({
  referenceId,
  name,
  children,
}: {
  referenceId: string;
  name: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const navGroups: NavGroup[] = [
    {
      label: "Referrals",
      items: [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Products", href: "/products", icon: LayoutGrid },
        { label: "Refer Someone", href: "/refer", icon: UserRoundPlus },
        { label: "My Referrals", href: "/customers", icon: Handshake },
        { label: "Referral Status", href: "/pipeline", icon: NotebookTabs },
        { label: "Rewards Earned", href: "/earnings", icon: BadgeIndianRupee },
      ],
    },
    {
      label: "Learn & share",
      items: [
        { label: "Marketing Materials", href: "/marketing", icon: LibraryBig },
        { label: "Learn & Earn", href: "/training", icon: BookOpenCheck },
        { label: "Support", href: "/support", icon: CircleHelp },
      ],
    },
    {
      label: "Account",
      items: [
        { label: "Document Status", href: "/kyc", icon: FileCheck2 },
        { label: "Profile", href: "/profile", icon: User },
      ],
    },
  ];

  return (
    <div className="lg:flex">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-navy-800 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col border-r border-hairline bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-hairline px-5 text-navy-800">
          <Logo />
        </div>
        <nav className="flex-1 overflow-y-auto p-3" aria-label="Main">
          <NavLinks groups={navGroups} />
        </nav>
        <UserCard name={name} referenceId={referenceId} />
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
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
              <Dialog.Overlay className="fixed inset-0 z-50 bg-navy-950/40 backdrop-blur-sm motion-safe:data-[state=open]:animate-[fade-in_200ms_ease-out]" />
              <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white motion-safe:data-[state=open]:animate-[drawer-in-left_250ms_var(--ease-out-quart)]">
                <div className="flex h-14 items-center justify-between border-b border-hairline px-4">
                  <Dialog.Title className="sr-only">Menu</Dialog.Title>
                  <Dialog.Description className="sr-only">
                    Navigate the referral-partner workspace.
                  </Dialog.Description>
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
                <nav className="flex-1 overflow-y-auto p-3" aria-label="Main">
                  <NavLinks groups={navGroups} onNavigate={() => setOpen(false)} />
                </nav>
                <UserCard name={name} referenceId={referenceId} />
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="min-w-0 flex-1 bg-[radial-gradient(circle_at_top_right,var(--color-sun-50),transparent_32rem)] px-4 py-6 sm:px-8 sm:py-8 xl:px-10"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
