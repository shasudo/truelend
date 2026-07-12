import Link from "next/link";
import { Button, Container } from "@truelend/ui";

export default function NotFound() {
  return (
    <Container className="flex flex-col items-center py-28 text-center sm:py-36">
      <p className="font-display text-[7rem] font-extrabold leading-none tracking-tight text-navy-100 sm:text-[9rem]">
        404
      </p>
      <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-navy-950 sm:text-3xl">
        This page took the wrong turn.
      </h1>
      <p className="mt-3 max-w-md text-navy-600">
        The page you&rsquo;re looking for doesn&rsquo;t exist or has moved. The right loan is still
        easy to find, though.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/products">Browse products</Link>
        </Button>
      </div>
    </Container>
  );
}
