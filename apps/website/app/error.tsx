"use client";

import { useEffect } from "react";
import { Button, Container } from "@truelend/ui";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(JSON.stringify({ event: "website_render_error", message: error.message }));
  }, [error]);

  return (
    <Container className="py-20 text-center">
      <h1 className="font-display text-3xl font-bold text-navy-950">Something went wrong</h1>
      <p className="mx-auto mt-3 max-w-lg text-navy-600">
        We couldn&rsquo;t load this page. Your information has not been submitted.
      </p>
      <Button type="button" className="mt-6" onClick={reset}>
        Try again
      </Button>
    </Container>
  );
}
