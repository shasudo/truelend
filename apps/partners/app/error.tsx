"use client";

import { useEffect } from "react";
import { Button } from "@truelend/ui";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(JSON.stringify({ event: "partners_render_error", message: error.message }));
  }, [error]);
  return (
    <main className="mx-auto max-w-lg px-6 py-20 text-center">
      <h1 className="font-display text-2xl font-bold text-navy-950">Portal unavailable</h1>
      <p className="mt-3 text-navy-600">No changes were made. Try loading the page again.</p>
      <Button type="button" className="mt-6" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
