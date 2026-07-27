"use client";

import { Button, Card } from "@truelend/ui";

// Dashboard route error boundary. Deliberately generic — never surface raw
// error.message to the operator.
export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card className="mx-auto mt-10 max-w-md p-8 text-center">
      <h2 className="font-display text-lg font-bold text-navy-950">
        Something went wrong completing this request.
      </h2>
      <p className="mt-2 text-sm text-navy-500">
        Reload and check the current status before repeating an action. If it keeps happening,
        contact an admin.
      </p>
      <Button className="mt-5" onClick={reset}>
        Try again
      </Button>
    </Card>
  );
}
