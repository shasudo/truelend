"use client";

import { Button, Card } from "@truelend/ui";

// Generic message only — never surface error.message to partners.
export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Card className="max-w-md p-6">
      <h2 className="font-display text-lg font-bold text-navy-950">
        Something went wrong completing this request
      </h2>
      <p className="mt-1 text-sm text-navy-500">
        Reload and check the current status before repeating an action. If it keeps happening,
        contact support.
      </p>
      <div className="mt-4">
        <Button size="sm" onClick={reset}>
          Try again
        </Button>
      </div>
    </Card>
  );
}
