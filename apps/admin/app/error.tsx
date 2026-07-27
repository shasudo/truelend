"use client";

import { useEffect } from "react";
import { Button } from "@truelend/ui";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(
      JSON.stringify({
        event: "admin_render_error",
        errorType: error.name,
        digest: error.digest,
      }),
    );
  }, [error]);
  return (
    <main className="mx-auto max-w-lg px-6 py-20 text-center">
      <h1 className="font-display text-2xl font-bold text-navy-950">Dashboard unavailable</h1>
      <p className="mt-3 text-navy-600">
        We couldn&rsquo;t confirm the last request. Reload and check the current status before
        repeating an action.
      </p>
      <Button type="button" className="mt-6" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
