"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  LayoutDashboard,
  Inbox,
  Banknote,
  Handshake,
  BarChart3,
  Users,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Logo, cx } from "@truelend/ui";
import { adminAuthClient } from "@truelend/auth/admin-client";

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
  { label: "Referral Partners", href: "/partners", icon: Handshake, adminOnly: true },
  { label: "MIS", href: "/mis", icon: BarChart3, adminOnly: true },
  { label: "Team", href: "/team", icon: Users, adminOnly: true },
];

interface SidebarUser {
  name: string;
  email: string;
  role: string;
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
      const { error } = await adminAuthClient.signOut();
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

interface NavLinksProps {
  isAdmin: boolean;
  onNavigate?: () => void;
}

function NavLinks({ isAdmin, onNavigate }: NavLinksProps) {
  const pathname = usePathname();
  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {nav
        .filter((item) => !item.adminOnly || isAdmin)
        .map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active(item.href) ? "page" : undefined}
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

interface UserCardProps {
  user: SidebarUser;
}

function UserCard({ user }: UserCardProps) {
  const { signOut, pending, error } = useSignOut();
  return (
    <div className="border-t border-hairline p-3">
      <div className="px-2 py-1.5">
        <p className="truncate text-sm font-semibold text-navy-950">{user.name}</p>
        <p className="truncate text-xs text-muted">{user.email}</p>
        <span className="mt-1 inline-block rounded-full bg-navy-800/[0.07] px-2 py-0.5 text-xs font-semibold capitalize text-navy-600">
          {user.role}
        </span>
      </div>
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

interface SidebarProps {
  user: SidebarUser;
}

export function Sidebar({ user }: SidebarProps) {
  const isAdmin = user.role === "admin";
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-hairline bg-white lg:flex">
      <div className="flex h-16 items-center border-b border-hairline px-5 text-navy-800">
        <Logo />
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3" aria-label="Main">
        <NavLinks isAdmin={isAdmin} />
      </nav>
      <UserCard user={user} />
    </aside>
  );
}

interface MobileNavProps {
  user: SidebarUser;
}

export function MobileNav({ user }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const isAdmin = user.role === "admin";
  return (
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
                Navigate the admin workspace.
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
            <nav className="flex-1 space-y-0.5 overflow-y-auto p-3" aria-label="Main">
              <NavLinks isAdmin={isAdmin} onNavigate={() => setOpen(false)} />
            </nav>
            <UserCard user={user} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </header>
  );
}
