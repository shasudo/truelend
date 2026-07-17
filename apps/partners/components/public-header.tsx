import Link from "next/link";
import { Button, Container, Logo } from "@truelend/ui";
import { ProductsMenu } from "@/components/products-menu";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-paper/85 backdrop-blur-md">
      <Container className="flex h-16 max-w-[1380px] items-center justify-between gap-6">
        <Link href="/" aria-label="TrueLend Partners home" className="text-navy-800">
          <Logo />
        </Link>
        <nav
          className="hidden flex-1 items-center justify-center gap-7 xl:flex"
          aria-label="Public"
        >
          <Link
            href="/"
            className="border-b-2 border-transparent py-5 text-sm font-semibold text-navy-950 hover:border-red-600"
          >
            For Partners
          </Link>
          <Link href="/#benefits" className="text-sm font-medium text-navy-700 hover:text-red-600">
            Partner Benefits
          </Link>
          <Link
            href="/#how-it-works"
            className="text-sm font-medium text-navy-700 hover:text-red-600"
          >
            How It Works
          </Link>
          <Link
            href="/#partner-types"
            className="text-sm font-medium text-navy-700 hover:text-red-600"
          >
            Who Can Join
          </Link>
          <ProductsMenu />
          <Link href="/resources" className="text-sm font-medium text-navy-700 hover:text-red-600">
            Resources
          </Link>
          <a
            href="https://truelend.in/about"
            className="text-sm font-medium text-navy-700 hover:text-red-600"
          >
            About Us
          </a>
          <a
            href="https://truelend.in/contact"
            className="text-sm font-medium text-navy-700 hover:text-red-600"
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
