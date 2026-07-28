import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { isDeepStrictEqual } from "node:util";
import { eq } from "drizzle-orm";
import { schema } from "@truelend/db";
import {
  installAuthDependencyMocks,
  resetFakeAuthState,
  setFakeAuthState,
  type FakeAdminSession,
  type FakeCloudflareEnv,
} from "./support/fake-auth-dependencies";
import type { FakeRow, FakeRowProvider } from "@truelend/test-support";

installAuthDependencyMocks();
beforeEach(() => {
  resetFakeAuthState();
});
const { GET } = await import("../app/api/kyc/[...key]/route");

function buildAdminSession(overrides: Partial<FakeAdminSession["user"]> = {}): FakeAdminSession {
  return {
    user: {
      id: overrides.id ?? "admin-1",
      email: overrides.email ?? "admin@example.com",
      name: overrides.name ?? "Admin",
      role: overrides.role ?? "admin",
    },
  };
}

function buildEnv(bucket: unknown): FakeCloudflareEnv {
  return {
    HYPERDRIVE: { connectionString: "postgres://fake" },
    BETTER_AUTH_SECRET: "secret",
    BETTER_AUTH_URL: "https://admin.example.com",
    BUCKET: bucket,
  };
}

function getParams(key: string[]) {
  return { params: Promise.resolve({ key }) };
}

/**
 * Only returns `row` when the captured `.where(...)` call is structurally the
 * real `eq(schema.partnerDocuments.r2Key, expectedKey)` — proving the route's
 * "only keys a database row currently references may be fetched" boundary
 * (its own comment's words) is genuinely enforced by the query, not just by
 * a row existing somewhere in the table. If this where-clause were dropped
 * during a refactor, an unscoped `.limit(1)` would return the first document
 * row in the whole table regardless of which key was requested — handing
 * back an arbitrary partner's KYC file for any URL an admin happened to try.
 */
function scopedDocumentRow(expectedKey: string, row: FakeRow): FakeRowProvider {
  const expectedWhere = eq(schema.partnerDocuments.r2Key, expectedKey);
  return ({ whereArgs }) => (isDeepStrictEqual(whereArgs[0], expectedWhere) ? [row] : []);
}

void test("kyc view: a non-admin session is refused", async () => {
  setFakeAuthState({
    getSession: async () => buildAdminSession({ role: "employee" }),
    env: buildEnv({}),
  });

  const response = await GET(
    new Request("https://admin.example.com"),
    getParams(["kyc", "p1", "pan.png"]),
  );

  assert.equal(response.status, 403);
});

void test("kyc view: a key with no matching database row 404s, whether or not something else in the table exists", async () => {
  const bucket = { get: async () => ({ body: new Uint8Array(), httpMetadata: {} }) };
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    env: buildEnv(bucket),
    dbOptions: {
      rowsByTable: new Map([
        [
          schema.partnerDocuments,
          scopedDocumentRow("kyc/partner-1/pan-real.png", {
            id: "doc-1",
            partnerId: "partner-1",
            r2Key: "kyc/partner-1/pan-real.png",
          }),
        ],
      ]),
    },
  });

  const response = await GET(
    new Request("https://admin.example.com"),
    getParams(["kyc", "partner-2", "other.png"]),
  );

  assert.equal(response.status, 404);
});

void test("kyc view: a matching key streams the object and audit-logs the view", async () => {
  const inserts: { table: unknown; values: FakeRow }[] = [];
  const bucket = {
    get: async (key: string) =>
      key === "kyc/partner-1/pan-real.png"
        ? { body: new Uint8Array([1, 2, 3]), httpMetadata: { contentType: "image/png" } }
        : null,
  };
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    env: buildEnv(bucket),
    dbOptions: {
      rowsByTable: new Map([
        [
          schema.partnerDocuments,
          scopedDocumentRow("kyc/partner-1/pan-real.png", {
            id: "doc-1",
            partnerId: "partner-1",
            r2Key: "kyc/partner-1/pan-real.png",
          }),
        ],
      ]),
      onInsert: (table, values) => inserts.push({ table, values }),
    },
  });

  const response = await GET(
    new Request("https://admin.example.com"),
    getParams(["kyc", "partner-1", "pan-real.png"]),
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.equal(inserts.length, 1);
  assert.equal(inserts[0]?.values.entityId, "doc-1");
});

void test("kyc view: a database row referencing a since-deleted R2 object 404s", async () => {
  const bucket = { get: async () => null };
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    env: buildEnv(bucket),
    dbOptions: {
      rowsByTable: new Map([
        [
          schema.partnerDocuments,
          scopedDocumentRow("kyc/partner-1/pan-real.png", {
            id: "doc-1",
            partnerId: "partner-1",
            r2Key: "kyc/partner-1/pan-real.png",
          }),
        ],
      ]),
    },
  });

  const response = await GET(
    new Request("https://admin.example.com"),
    getParams(["kyc", "partner-1", "pan-real.png"]),
  );

  assert.equal(response.status, 404);
});
