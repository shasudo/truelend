"use client";

import { useEffect, useState } from "react";
import type { HealthResponse } from "@truelend/types";

export default function Home() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json() as Promise<HealthResponse>)
      .then(setHealth)
      .catch(() => setError(true));
  }, []);

  return (
    <main style={{ maxWidth: 640, margin: "4rem auto", padding: "0 1rem" }}>
      <h1>truelend</h1>
      <p>
        API: <strong>{error ? "unreachable" : (health?.status ?? "checking…")}</strong>
      </p>
      <p>
        Database: <strong>{error ? "unknown" : (health?.db ?? "checking…")}</strong>
      </p>
    </main>
  );
}
