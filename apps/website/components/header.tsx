"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Headset } from "lucide-react";
import { Button, Container, Logo, cx } from "@truelend/ui";
import { site } from "@/content/site";
import { ProductsMenu } from "@/components/products-menu";

export function Header() {
  const menuRef = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  const isActive = (href: string) =>
    href !== "/" && !href.includes("#") && pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-paper/85 backdrop-blur-md">
      <Container className="flex h-20 max-w-[1600px] items-center justify-between gap-3 px-5 sm:gap-5 sm:px-8 xl:gap-6 xl:px-10">
        <Link href="/" aria-label="TrueLend home" className="shrink-0 text-navy-800">
          <Logo />
        </Link>

        <nav
          className="hidden min-w-0 flex-1 items-center justify-center gap-6 xl:flex 2xl:gap-8"
          aria-label="Main"
        >
          {site.nav.map((item) =>
            item.href === "/products" ? (
              <ProductsMenu key={item.href} active={isActive(item.href)} />
            ) : (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cx(
                  "shrink-0 whitespace-nowrap text-base font-medium text-navy-600 transition-colors hover:text-navy-950",
                  isActive(item.href) &&
                    "text-navy-950 underline decoration-red-600 decoration-2 underline-offset-8",
                )}
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden sm:block">
            <Button size="sm" asChild>
              <Link href="/enquiry" className="whitespace-nowrap">
                <Headset className="h-4 w-4" aria-hidden />
                Talk to a Borrowing Advisor
              </Link>
            </Button>
          </div>

          <button
            className="rounded-md p-2 text-navy-800 hover:bg-navy-800/5 xl:hidden"
            aria-label="Open menu"
            onClick={() => menuRef.current?.showModal()}
          >
            <Menu className="h-6 w-6" />
          </button>
          <dialog
            ref={menuRef}
            aria-labelledby="mobile-menu-title"
            onClick={(event) => {
              if (event.target === event.currentTarget) event.currentTarget.close();
            }}
            className="fixed inset-y-0 right-0 left-auto m-0 h-dvh w-80 max-w-[85vw] border-0 bg-navy-950 p-6 text-white backdrop:bg-navy-950/50 backdrop:backdrop-blur-sm open:flex open:flex-col motion-safe:open:animate-[drawer-in-right_250ms_var(--ease-out-quart)]"
          >
            <h2 id="mobile-menu-title" className="sr-only">
              Menu
            </h2>
            <div className="flex items-center justify-between">
              <Logo className="text-white" />
              <button
                className="rounded-md p-2 text-white/70 hover:bg-white/10 hover:text-white"
                aria-label="Close menu"
                onClick={() => menuRef.current?.close()}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <nav className="mt-10 flex flex-col gap-1" aria-label="Mobile">
              {site.nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  onClick={() => menuRef.current?.close()}
                  className="rounded-lg px-3 py-3 font-display text-xl font-semibold text-white/85 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mt-auto space-y-4 border-t border-white/10 pt-6">
              <Button asChild className="w-full">
                <Link href="/enquiry" onClick={() => menuRef.current?.close()}>
                  <Headset className="h-4 w-4" aria-hidden />
                  Speak to an Advisor
                </Link>
              </Button>
              <p className="text-sm text-on-dark-muted">
                {site.phone} · {site.hours}
              </p>
            </div>
          </dialog>
        </div>
      </Container>
    </header>
  );
}
