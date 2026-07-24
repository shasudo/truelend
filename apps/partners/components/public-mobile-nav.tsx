"use client";

import { useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { appUrls } from "@truelend/reference";

interface NavigationItem {
  label: string;
  href: string;
  external?: boolean;
}

const navigation: readonly NavigationItem[] = [
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Why TrueLend", href: "/#why-truelend" },
  { label: "Who Can Join", href: "/#who-can-join" },
  { label: "Referral Benefits", href: "/#benefits" },
  { label: "FAQs", href: "/#faqs" },
  { label: "Contact Us", href: `${appUrls.website}/contact`, external: true },
];

const linkClass =
  "block rounded-lg px-3 py-3 font-medium text-navy-700 hover:bg-paper hover:text-navy-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600";

export function PublicMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-hairline text-navy-800 transition-colors hover:border-navy-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 xl:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-navy-950/40 backdrop-blur-sm motion-safe:data-[state=open]:animate-[fade-in_200ms_ease-out]" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-80 max-w-[88vw] flex-col bg-white shadow-2xl motion-safe:data-[state=open]:animate-[drawer-in-right_250ms_var(--ease-out-quart)]">
          <div className="flex h-20 items-center justify-between border-b border-hairline px-5">
            <Dialog.Title className="font-display text-lg font-bold text-navy-950">
              Explore TrueLend
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Navigate the public Referral Partner website.
            </Dialog.Description>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-lg p-2 text-navy-600 hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </Dialog.Close>
          </div>
          <nav className="flex-1 overflow-y-auto p-3" aria-label="Mobile public">
            {navigation.map((item) =>
              item.external ? (
                <a key={item.href} className={linkClass} href={item.href}>
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.href}
                  className={linkClass}
                  href={item.href}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>
          <div className="grid gap-2 border-t border-hairline p-4">
            <Link
              className="rounded-lg bg-red-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
              href="/register/referral"
              onClick={() => setOpen(false)}
            >
              Become a Referral Partner
            </Link>
            <Link
              className="rounded-lg px-4 py-2.5 text-center text-sm font-semibold text-navy-700 hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
              href="/login"
              onClick={() => setOpen(false)}
            >
              Sign in
            </Link>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
