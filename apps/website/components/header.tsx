"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog } from "radix-ui";
import { Menu, X, Phone } from "lucide-react";
import { Button, Container, Logo, cx } from "@truelend/ui";
import { site } from "@/content/site";

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    href !== "/" && !href.includes("#") && pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-paper/85 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link href="/" aria-label="TrueLend home" className="text-navy-800">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Main">
          {site.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                "text-sm font-medium text-navy-600 transition-colors hover:text-navy-950",
                isActive(item.href) &&
                  "text-navy-950 underline decoration-red-600 decoration-2 underline-offset-8",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Button size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/enquiry">
              <Phone className="h-4 w-4" aria-hidden />
              Speak to an Advisor
            </Link>
          </Button>

          {/* Mobile drawer */}
          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
              <button
                className="rounded-md p-2 text-navy-800 hover:bg-navy-800/5 lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-6 w-6" />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-navy-950/50 backdrop-blur-sm data-[state=open]:animate-[fade-in_200ms_ease-out]" />
              <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-80 max-w-[85vw] flex-col bg-navy-950 p-6 text-white data-[state=open]:animate-[drawer-in_250ms_var(--ease-out-quart)]">
                <Dialog.Title className="sr-only">Menu</Dialog.Title>
                <div className="flex items-center justify-between">
                  <Logo className="text-white" />
                  <Dialog.Close asChild>
                    <button
                      className="rounded-md p-2 text-white/70 hover:bg-white/10 hover:text-white"
                      aria-label="Close menu"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </Dialog.Close>
                </div>

                <nav className="mt-10 flex flex-col gap-1" aria-label="Mobile">
                  {site.nav.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="rounded-lg px-3 py-3 font-display text-xl font-semibold text-white/85 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>

                <div className="mt-auto space-y-4 border-t border-white/10 pt-6">
                  <Button asChild className="w-full">
                    <Link href="/enquiry" onClick={() => setOpen(false)}>
                      <Phone className="h-4 w-4" aria-hidden />
                      Speak to an Advisor
                    </Link>
                  </Button>
                  <p className="text-sm text-white/60">
                    {site.phone} · {site.hours}
                  </p>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </Container>
    </header>
  );
}
