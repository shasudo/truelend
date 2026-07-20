interface DatabaseExecutionContext {
  githubActions?: string;
  githubRef?: string;
  productionApproved?: string;
}

const localHosts = new Set(["", "localhost", "127.0.0.1", "[::1]"]);

export function assertSafeDatabaseTarget(
  databaseUrl: string,
  context: DatabaseExecutionContext = {
    githubActions: process.env.GITHUB_ACTIONS,
    githubRef: process.env.GITHUB_REF,
    productionApproved: process.env.TRUELEND_PRODUCTION_DATABASE_APPROVED,
  },
): void {
  let target: URL;
  try {
    target = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL");
  }

  if (!new Set(["postgres:", "postgresql:"]).has(target.protocol)) {
    throw new Error("DATABASE_URL must use the postgres or postgresql protocol");
  }
  if (localHosts.has(target.hostname)) return;

  const releaseIntent =
    context.githubActions === "true" &&
    context.githubRef === "refs/heads/main" &&
    context.productionApproved === "true";
  if (!releaseIntent) {
    throw new Error(
      "Remote database operations require explicit main-branch release intent; locally settable flags are not authorization",
    );
  }
}
