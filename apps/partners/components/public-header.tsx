import Link from "next/link";
import { Button, Container, Logo } from "@truelend/ui";
import { ProductsMenu } from "@/components/products-menu";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-paper/85 backdrop-blur-md">
      <Container className="flex h-20 max-w-[1380px] items-center justify-between gap-6">
        <Link href="/" aria-label="TrueLend Partners home" className="text-navy-800">
          <Logo />
        </Link>
        {/* Eight items at text-base is a wide nav: nowrap stops links breaking
            across two lines inside the bar, and the tighter gap keeps it inside
            the container at the xl breakpoint where this nav first appears. */}
        <nav
          className="hidden flex-1 items-center justify-center gap-5 whitespace-nowrap xl:flex"
          aria-label="Public"
        >
          <Link
            href="/"
            className="border-b-2 border-transparent py-7 text-base font-semibold text-navy-950 hover:border-red-600"
          >
            For Partners
          </Link>
          <Link
            href="/#benefits"
            className="text-base font-medium text-navy-700 hover:text-red-600"
          >
            Partner Benefits
          </Link>
          <Link
            href="/#how-it-works"
            className="text-base font-medium text-navy-700 hover:text-red-600"
          >
            How It Works
          </Link>
          <Link
            href="/#partner-types"
            className="text-base font-medium text-navy-700 hover:text-red-600"
          >
            Who Can Join
          </Link>
          <ProductsMenu />
          <Link
            href="/resources"
            className="text-base font-medium text-navy-700 hover:text-red-600"
          >
            Resources
          </Link>
          <a
            href="https://truelend.in/about"
            className="text-base font-medium text-navy-700 hover:text-red-600"
          >
            About Us
          </a>
          <a
            href="https://truelend.in/contact"
            className="text-base font-medium text-navy-700 hover:text-red-600"
          >
            Contact
          </a>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden min-[480px]:inline-flex">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </span>
          <Button size="sm" className="whitespace-nowrap px-3 sm:px-4" asChild>
            <Link href="/#partner-types">Become a partner</Link>
          </Button>
        </div>
      </Container>
    </header>
  );
}
