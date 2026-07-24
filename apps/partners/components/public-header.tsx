import Link from "next/link";
import { UserRound } from "lucide-react";
import { Button, Container, Logo } from "@truelend/ui";
import { appUrls } from "@truelend/reference";
import { PublicMobileNav } from "@/components/public-mobile-nav";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-paper/85 backdrop-blur-md">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-navy-800 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to content
      </a>
      <Container className="flex h-[78px] max-w-[1240px] items-center justify-between gap-5">
        <Link href="/" aria-label="TrueLend Referral Partners home" className="text-navy-800">
          <Logo tagline />
        </Link>
        <nav
          className="hidden flex-1 items-center justify-center gap-7 whitespace-nowrap xl:flex"
          aria-label="Public"
        >
          <Link
            href="/#how-it-works"
            className="border-b-2 border-transparent py-7 text-sm font-semibold text-navy-950 hover:border-red-600"
          >
            How It Works
          </Link>
          <Link
            href="/#why-truelend"
            className="text-sm font-medium text-navy-700 hover:text-red-600"
          >
            Why TrueLend
          </Link>
          <Link
            href="/#who-can-join"
            className="text-sm font-medium text-navy-700 hover:text-red-600"
          >
            Who Can Join
          </Link>
          <Link href="/#benefits" className="text-sm font-medium text-navy-700 hover:text-red-600">
            Referral Benefits
          </Link>
          <Link href="/#faqs" className="text-sm font-medium text-navy-700 hover:text-red-600">
            FAQs
          </Link>
          <a
            href={`${appUrls.website}/contact`}
            className="text-sm font-medium text-navy-700 hover:text-red-600"
          >
            Contact Us
          </a>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden min-[480px]:inline-flex">
            <Button variant="outline" size="sm" className="h-10 whitespace-nowrap px-5" asChild>
              <Link href="/login">
                <UserRound className="h-4 w-4" aria-hidden /> Sign In
              </Link>
            </Button>
          </span>
          <span className="hidden sm:inline-flex">
            <Button size="sm" className="h-10 whitespace-nowrap px-3 sm:px-5" asChild>
              <Link href="/register/referral">Become a Referral Partner</Link>
            </Button>
          </span>
          <PublicMobileNav />
        </div>
      </Container>
    </header>
  );
}
