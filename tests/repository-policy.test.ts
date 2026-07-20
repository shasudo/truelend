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

void test("partner profile mutations require an authorized partner profile", () => {
  const action = readFileSync(
    join(repositoryRoot, "apps", "partners", "lib", "profile-actions.ts"),
    "utf8",
  );
  assert.match(action, /await requirePartner\(\)/);
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
