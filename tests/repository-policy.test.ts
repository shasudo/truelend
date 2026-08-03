import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { appUrls } from "../packages/reference/src/app-urls";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));

interface Manifest {
  name: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

function workspaceDirectories(): string[] {
  return ["apps", "packages"].flatMap((group) =>
    readdirSync(join(repositoryRoot, group), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(repositoryRoot, group, entry.name))
      .filter((directory) => existsSync(join(directory, "package.json"))),
  );
}

function readManifest(directory: string): Manifest {
  return JSON.parse(readFileSync(join(directory, "package.json"), "utf8")) as Manifest;
}

function sourceFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if ([".next", ".open-next", ".turbo", ".wrangler", "node_modules"].includes(entry.name)) {
      continue;
    }
    if (entry.name === "cloudflare-env.d.ts") continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(path));
    else if (/\.(?:[cm]?[jt]sx?|css)$/.test(entry.name)) files.push(path);
  }
  return files;
}

void test("workspace dependency versions stay centralized", () => {
  for (const directory of workspaceDirectories()) {
    const manifest = readManifest(directory);
    for (const group of [
      manifest.dependencies,
      manifest.devDependencies,
      manifest.optionalDependencies,
    ]) {
      for (const [dependency, version] of Object.entries(group ?? {})) {
        const expected = dependency.startsWith("@truelend/") ? "workspace:*" : "catalog:";
        assert.equal(version, expected, `${manifest.name}: ${dependency} must use ${expected}`);
      }
    }
  }
});

void test("code workspaces expose consistent quality scripts", () => {
  for (const directory of workspaceDirectories()) {
    const manifest = readManifest(directory);
    const files = sourceFiles(directory);
    if (
      !files.some(
        (file) => file.includes(`${join(directory, "src")}/`) || directory.includes("/apps/"),
      )
    ) {
      continue;
    }
    assert.ok(manifest.scripts?.lint, `${manifest.name} is missing a lint script`);
    assert.ok(manifest.scripts?.typecheck, `${manifest.name} is missing a typecheck script`);
    if (files.some((file) => /\.test\.tsx?$/.test(file))) {
      assert.ok(manifest.scripts?.test, `${manifest.name} has tests but no test script`);
    }
  }
});

void test("Next apps transpile every runtime workspace dependency", () => {
  for (const app of ["admin", "partners", "website"]) {
    const directory = join(repositoryRoot, "apps", app);
    const manifest = readManifest(directory);
    const nextConfig = readFileSync(join(directory, "next.config.ts"), "utf8");
    for (const dependency of Object.keys(manifest.dependencies ?? {}).filter((name) =>
      name.startsWith("@truelend/"),
    )) {
      assert.match(
        nextConfig,
        new RegExp(`["']${dependency.replace("/", "\\/")}["']`),
        `${manifest.name} must transpile ${dependency}`,
      );
    }
  }
});

void test("workspaces do not import application implementations", () => {
  const applicationPackageNames = new Set([
    "@truelend/admin",
    "@truelend/partners",
    "@truelend/website",
  ]);
  for (const directory of workspaceDirectories()) {
    const manifest = readManifest(directory);
    for (const dependency of Object.keys(manifest.dependencies ?? {})) {
      assert.ok(
        !applicationPackageNames.has(dependency),
        `${manifest.name} must not depend on application ${dependency}`,
      );
    }
    if (!directory.includes("/packages/")) continue;
    for (const file of sourceFiles(directory)) {
      const source = readFileSync(file, "utf8");
      assert.doesNotMatch(
        source,
        /(?:from\s+|import\s*)["'][^"']*(?:^|\/)apps\/(?:admin|partners|website)(?:\/|["'])/m,
        `${file} imports application code`,
      );
    }
  }
});

void test("runtime packages follow the documented dependency direction", () => {
  const allowed = new Map<string, readonly string[]>([
    ["@truelend/auth", ["@truelend/db", "@truelend/ui"]],
    ["@truelend/db", ["@truelend/reference"]],
    ["@truelend/email", []],
    ["@truelend/health", []],
    ["@truelend/reference", []],
    ["@truelend/turnstile", []],
    ["@truelend/ui", []],
  ]);

  for (const directory of workspaceDirectories().filter((path) => path.includes("/packages/"))) {
    const manifest = readManifest(directory);
    const expected = allowed.get(manifest.name);
    if (!expected) continue;
    const actual = Object.keys(manifest.dependencies ?? {})
      .filter((name) => name.startsWith("@truelend/"))
      .sort();
    assert.deepEqual(actual, [...expected].sort(), `${manifest.name} dependency boundary drifted`);
  }
});

void test("client components cannot import server-only package surfaces", () => {
  for (const directory of [join(repositoryRoot, "apps"), join(repositoryRoot, "packages")]) {
    for (const file of sourceFiles(directory)) {
      const source = readFileSync(file, "utf8");
      if (!source.startsWith('"use client"')) continue;
      assert.doesNotMatch(
        source,
        /["']@truelend\/(?:db|auth(?:\/server)?|turnstile(?:\/server)?)["']/,
        `${file} crosses the client boundary`,
      );
    }
  }
});

void test("production app origins have one TypeScript source of truth", () => {
  const owner = join(repositoryRoot, "packages", "reference", "src", "app-urls.ts");
  const productionOrigin = /https:\/\/(?:admin\.|partner\.)?truelend\.in/;
  for (const directory of [join(repositoryRoot, "apps"), join(repositoryRoot, "packages")]) {
    for (const file of sourceFiles(directory)) {
      if (file === owner) continue;
      assert.doesNotMatch(
        readFileSync(file, "utf8"),
        productionOrigin,
        `${file} duplicates appUrls`,
      );
    }
  }
});

void test("canonical app origins match Worker routes and auth configuration", () => {
  for (const app of ["admin", "partners", "website"] as const) {
    const wrangler = readFileSync(join(repositoryRoot, "apps", app, "wrangler.jsonc"), "utf8");
    const origin = appUrls[app];
    assert.ok(
      wrangler.includes(`"pattern": "${new URL(origin).hostname}"`),
      `${app} Worker route drifted from appUrls`,
    );
    if (app !== "website") {
      assert.ok(
        wrangler.includes(`"BETTER_AUTH_URL": "${origin}"`),
        `${app} auth origin drifted from appUrls`,
      );
    }
  }

  const admin = readFileSync(join(repositoryRoot, "apps", "admin", "wrangler.jsonc"), "utf8");
  assert.ok(admin.includes(`"PARTNERS_URL": "${appUrls.partners}"`));
});

void test("manual Worker secrets augment both supported environment interfaces", () => {
  for (const app of ["admin", "partners", "website"]) {
    const declarations = readFileSync(
      join(repositoryRoot, "apps", app, "cloudflare-secrets.d.ts"),
      "utf8",
    );
    assert.match(declarations, /namespace Cloudflare \{\s+interface Env \{/);
    const generated = readFileSync(
      join(repositoryRoot, "apps", app, "cloudflare-env.d.ts"),
      "utf8",
    );
    assert.match(generated, /interface CloudflareEnv extends Cloudflare\.Env \{\}/);
  }
});

void test("partner mutations use one explicitly owned request context", () => {
  const partners = join(repositoryRoot, "apps", "partners");
  const auth = readFileSync(join(partners, "lib", "auth.ts"), "utf8");
  const owner = readFileSync(join(partners, "lib", "owned-request-context.ts"), "utf8");

  assert.match(auth, /withOwnedRequestContext\(createAuthContext,/);
  assert.match(auth, /return withPartnerRequest\(await headers\(\), run\)/);
  assert.equal(owner.match(/\bcreate\(\)/g)?.length, 1);
  assert.equal(owner.match(/db\.\$client\.end\(\)/g)?.length, 1);
  assert.match(
    owner,
    /const context = create\(\);[\s\S]*finally \{[\s\S]*scheduleOwnedRequestContextCleanup\(context\)/,
  );
  assert.match(
    owner,
    /scheduleOwnedRequestContextCleanup[\s\S]*cleanup = context\.db\.\$client\.end\(\)[\s\S]*context\.ctx\.waitUntil\(reportedCleanup\)/,
  );
  assert.match(
    owner,
    /schedulePartnerBackgroundTask[\s\S]*task = createTask\(\)[\s\S]*ctx\.waitUntil\(reportedTask\)/,
  );

  const mutationBoundaries = [
    ["lib/kyc-actions.ts", /\bwithPartnerMutation\(/],
    ["lib/lead-actions.ts", /\bwithPartnerMutation\(/],
    ["lib/profile-actions.ts", /\bwithPartnerMutation\(/],
    ["app/api/kyc/upload/route.ts", /\bwithPartnerRequest\(req\.headers,/],
  ] as const;
  for (const [relativePath, ownedEntryPoint] of mutationBoundaries) {
    const file = join(partners, relativePath);
    const contents = readFileSync(file, "utf8");
    assert.match(contents, ownedEntryPoint, `${file} must use its owned request context`);
    assert.doesNotMatch(
      contents,
      /\b(?:getAuthContext|getOptionalPartnerSession|requirePartnerSession|requirePartner)\s*\(/,
      `${file} must not create a second cached RSC context`,
    );
    assert.doesNotMatch(
      contents,
      /\b(?:createDb|getCloudflareContext)\s*\(/,
      `${file} must not create an additional request client`,
    );
  }

  const signup = readFileSync(join(partners, "lib", "signup-actions.ts"), "utf8");
  assert.match(signup, /\bcreatePartnerActionContext\(\)/);
  assert.equal(signup.match(/\bscheduleOwnedRequestContextCleanup\(ownedContext\)/g)?.length, 1);
  assert.doesNotMatch(signup, /ctx\.waitUntil\(db\.\$client\.end\(\)\)/);
  assert.doesNotMatch(
    signup,
    /\b(?:getAuthContext|getOptionalPartnerSession|requirePartnerSession|requirePartner)\s*\(/,
  );

  const authRoute = readFileSync(join(partners, "app/api/auth/[...all]/route.ts"), "utf8");
  assert.match(authRoute, /\bscheduleOwnedRequestContextCleanup\(\{ db, ctx \}\)/);
  assert.doesNotMatch(authRoute, /ctx\.waitUntil\(db\.\$client\.end\(\)\)/);

  for (const relativePath of [
    "lib/signup-actions.ts",
    "lib/lead-actions.ts",
    "app/api/kyc/upload/route.ts",
  ]) {
    const file = join(partners, relativePath);
    const contents = readFileSync(file, "utf8");
    assert.match(
      contents,
      /\bschedulePartnerBackgroundTask\(/,
      `${file} must schedule background work without replacing action results`,
    );
    assert.doesNotMatch(contents, /\bctx\.waitUntil\(/);
  }
});

void test("website lead work cannot be replaced by background-task failures", () => {
  const website = join(repositoryRoot, "apps", "website");
  const scheduler = readFileSync(join(website, "lib", "background-task.ts"), "utf8");
  const leadActions = readFileSync(join(website, "lib", "lead-actions.ts"), "utf8");

  assert.match(
    scheduler,
    /scheduleWebsiteBackgroundTask[\s\S]*task = createTask\(\)[\s\S]*ctx\.waitUntil\(reportedTask\)/,
  );
  // Team alert, applicant acknowledgement, and the existing submission task.
  assert.equal(leadActions.match(/\bscheduleWebsiteBackgroundTask\(/g)?.length, 3);
  assert.doesNotMatch(leadActions, /\bctx\.waitUntil\(/);
});

void test("admin mutations do not reuse the cached Server Component context", () => {
  const admin = join(repositoryRoot, "apps", "admin");
  const auth = readFileSync(join(admin, "lib", "auth.ts"), "utf8");
  const cleanup = readFileSync(join(admin, "lib", "request-context-cleanup.ts"), "utf8");

  assert.match(auth, /export function createAuthContext\(\): AuthContext/);
  assert.match(auth, /export const getAuthContext = cache\(createAuthContext\)/);
  assert.match(
    auth,
    /getMutationContext\(\): Promise<MutationContext> \{[\s\S]*createAuthContext\(\)/,
  );
  assert.match(auth, /return \{ db, ctx, env, user:/);
  assert.match(
    cleanup,
    /scheduleAdminRequestContextCleanup[\s\S]*cleanup = context\.db\.\$client\.end\(\)[\s\S]*context\.ctx\.waitUntil\(reportedCleanup\)/,
  );
  assert.match(
    cleanup,
    /scheduleAdminBackgroundTask[\s\S]*pending = task\(\)[\s\S]*ctx\.waitUntil\(reported\)/,
  );

  for (const relativePath of [
    "lib/auth.ts",
    "lib/lead-actions.ts",
    "lib/loan-actions.ts",
    "lib/partner-actions.ts",
    "lib/team-actions.ts",
    "app/api/auth/[...all]/route.ts",
    "app/api/kyc/upload/route.ts",
    "app/api/kyc/[...key]/route.ts",
  ]) {
    const file = join(admin, relativePath);
    const contents = readFileSync(file, "utf8");
    assert.match(
      contents,
      /\bscheduleAdminRequestContextCleanup\((?:\{ db, ctx \}|context)\)/,
      `${file} must schedule safe owned-context cleanup`,
    );
    assert.doesNotMatch(contents, /ctx\.waitUntil\(db\.\$client\.end\(\)\)/);
  }

  for (const relativePath of [
    "lib/lead-actions.ts",
    "lib/loan-actions.ts",
    "lib/partner-actions.ts",
  ]) {
    const file = join(admin, relativePath);
    const contents = readFileSync(file, "utf8");
    assert.match(contents, /\bgetMutationContext\(\)/, `${file} must own a mutation context`);
    assert.doesNotMatch(
      contents,
      /\bgetAuthContext\s*\(/,
      `${file} must not open a second cached RSC context`,
    );
  }

  for (const relativePath of ["lib/team-actions.ts", "app/api/kyc/[...key]/route.ts"]) {
    const file = join(admin, relativePath);
    const contents = readFileSync(file, "utf8");
    assert.match(contents, /\bcreateAuthContext\(\)/, `${file} must own a fresh context`);
    assert.doesNotMatch(
      contents,
      /\bgetAuthContext\s*\(/,
      `${file} must not reuse the cached RSC context`,
    );
  }

  const partnerActions = readFileSync(join(admin, "lib", "partner-actions.ts"), "utf8");
  const teamActions = readFileSync(join(admin, "lib", "team-actions.ts"), "utf8");
  const leadActions = readFileSync(join(admin, "lib", "lead-actions.ts"), "utf8");
  const kycUpload = readFileSync(join(admin, "app/api/kyc/upload/route.ts"), "utf8");
  const readiness = readFileSync(join(admin, "app/api/health/ready/route.ts"), "utf8");

  assert.match(partnerActions, /\bwithPartnerAdminAction</);
  assert.match(teamActions, /\bwithTeamAdminContext</);
  // Files that defer work must defer it through the wrapper, never by touching
  // waitUntil directly. partner-actions.ts is absent deliberately: its
  // notifications are awaited inline so a failed send reaches the operator.
  assert.match(kycUpload, /\bscheduleAdminBackgroundTask\(/);
  assert.match(leadActions, /\bscheduleAdminBackgroundTask\(/);
  assert.match(teamActions, /\bscheduleAdminBackgroundTask\(/);
  assert.doesNotMatch(
    `${partnerActions}\n${teamActions}\n${leadActions}\n${kycUpload}`,
    /\bctx\.waitUntil\(/,
  );
  assert.match(kycUpload, /if \(uploadedKey && !databaseOutcomeUnknown\)/);
  assert.match(readiness, /\bscheduleAdminRequestContextCleanup\(\{ db: connection, ctx \}\)/);
  assert.doesNotMatch(readiness, /\bctx\.waitUntil\(/);
});

void test("source debt uses the documented ponytail protocol", () => {
  for (const directory of [
    join(repositoryRoot, "apps"),
    join(repositoryRoot, "packages"),
    join(repositoryRoot, "scripts"),
  ]) {
    for (const file of sourceFiles(directory)) {
      assert.doesNotMatch(
        readFileSync(file, "utf8"),
        /\b(?:TODO|FIXME|HACK)\b|@ts-ignore/,
        `${file} contains an unowned debt or type-suppression marker`,
      );
    }
  }
});

void test("Worker runtime source cannot read server secrets from process.env", () => {
  for (const directory of workspaceDirectories()) {
    for (const file of sourceFiles(directory)) {
      if (!file.includes("/src/") && !file.includes("/app/") && !file.includes("/lib/")) continue;
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
        const name = match[1] ?? "";
        assert.ok(
          !file.includes("/packages/") && (name === "NODE_ENV" || name.startsWith("NEXT_PUBLIC_")),
          `${file} reads ${name} from process.env instead of a Worker binding`,
        );
      }
    }
  }
});

void test("the public website has no KYC storage capability", () => {
  const website = join(repositoryRoot, "apps", "website");
  const manifest = readManifest(website);
  const wrangler = readFileSync(join(website, "wrangler.jsonc"), "utf8");
  assert.equal(manifest.dependencies?.["@truelend/auth"], undefined);
  assert.doesNotMatch(wrangler, /["']r2_buckets["']\s*:/);
  assert.doesNotMatch(wrangler, /["']binding["']\s*:\s*["']BUCKET["']/);
});

void test("all apps scan shared UI styles", () => {
  for (const app of ["admin", "partners", "website"]) {
    const globals = readFileSync(join(repositoryRoot, "apps", app, "app", "globals.css"), "utf8");
    assert.match(globals, /@source\s+["']\.\.\/\.\.\/\.\.\/packages\/ui\/src["']/);
  }
});

void test("partner product images match the website-owned source assets", () => {
  const websiteAssets = join(repositoryRoot, "apps", "website", "public", "images", "products");
  const partnerAssets = join(repositoryRoot, "apps", "partners", "public", "images", "products");
  const names = readdirSync(websiteAssets)
    .filter((name) => name.endsWith(".avif"))
    .sort();
  assert.deepEqual(
    readdirSync(partnerAssets)
      .filter((name) => name.endsWith(".avif"))
      .sort(),
    names,
  );
  for (const name of names) {
    assert.deepEqual(
      readFileSync(join(partnerAssets, name)),
      readFileSync(join(websiteAssets, name)),
      `${name} drifted; sync it from the website source asset`,
    );
  }
});
