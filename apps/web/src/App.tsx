import { useEffect, useState } from "react";
import type { HealthResponse } from "@truelend/types";

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json() as Promise<HealthResponse>)
      .then(setHealth)
      .catch(() => setError(true));
  }, []);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 640, margin: "4rem auto", padding: "0 1rem" }}>
      <h1>truelend</h1>
      <p>
        API health:{" "}
        <strong>{error ? "unreachable" : health ? health.status : "checking…"}</strong>
      </p>
    </main>
  );
}
