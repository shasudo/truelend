import Link from "next/link";
import { Button, Container, Logo } from "@truelend/ui";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-paper/85 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" aria-label="TrueLend Partners home" className="text-navy-800">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/register">Become a partner</Link>
          </Button>
        </div>
      </Container>
    </header>
  );
}
