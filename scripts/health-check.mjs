// Same host mapping as .github/workflows/ci.yml's "Verify release or roll back" step.
const targets = [
  { app: "website", url: "https://truelend.in/api/health" },
  { app: "admin", url: "https://admin.truelend.in/api/health" },
  { app: "partners", url: "https://partner.truelend.in/api/health" },
];

const results = await Promise.all(
  targets.map(async ({ app, url }) => {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      return { app, url, status: response.status };
    } catch (error) {
      return {
        app,
        url,
        status: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }),
);

let failed = false;
for (const result of results) {
  if (result.status === 200) {
    console.log(`✓ ${result.app} ${result.url} -> 200`);
  } else {
    failed = true;
    console.error(
      `✗ ${result.app} ${result.url} -> ${result.status ?? "no response"}${result.error ? ` (${result.error})` : ""}`,
    );
  }
}

if (failed) {
  throw new Error("One or more production health checks failed.");
}
