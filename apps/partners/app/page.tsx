import Link from "next/link";
import { Button, Container, Logo } from "@truelend/ui";

// Minimal landing — replaced by the full marketing page later.
export default function Home() {
  return (
    <Container className="flex min-h-screen flex-col items-start justify-center gap-8 py-24">
      <Logo tagline />
      <h1 className="font-display text-5xl font-extrabold tracking-tight text-navy-950">
        Grow your income with TrueLend.
      </h1>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/register">Become a partner</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    </Container>
  );
}
