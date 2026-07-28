import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { schema } from "@truelend/db";
import {
  getWaitUntilCalls,
  installAuthDependencyMocks,
  resetFakeAuthState,
  setFakeAuthState,
  type FakeAdminSession,
  type FakeCloudflareEnv,
} from "./support/fake-auth-dependencies";
import type { FakeRow } from "@truelend/test-support";

installAuthDependencyMocks();
beforeEach(() => {
  resetFakeAuthState();
});
const { POST } = await import("../app/api/kyc/upload/route");

const ORIGIN = "https://admin.example.com";
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
const GARBAGE_BYTES = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

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

function buildBucket(overrides: { putError?: unknown } = {}) {
  const puts: { key: string; bytes: Uint8Array }[] = [];
  const deletes: string[] = [];
  return {
    bucket: {
      async put(key: string, bytes: Uint8Array) {
        if (overrides.putError !== undefined) throw overrides.putError;
        puts.push({ key, bytes });
      },
      async delete(key: string) {
        deletes.push(key);
      },
    },
    puts,
    deletes,
  };
}

function buildEnv(bucket: unknown, options: { rateLimited?: boolean } = {}): FakeCloudflareEnv {
  return {
    HYPERDRIVE: { connectionString: "postgres://fake" },
    BETTER_AUTH_SECRET: "secret",
    BETTER_AUTH_URL: ORIGIN,
    BUCKET: bucket,
    AUTH_RATE_LIMITER: { limit: async () => ({ success: !options.rateLimited }) },
  };
}

function buildUploadRequest(formData: FormData): Request {
  return new Request("https://admin.example.com/api/kyc/upload", {
    method: "POST",
    headers: { origin: ORIGIN },
    body: formData,
  });
}

function buildValidForm(partnerId = "user-1", docType = "pan"): FormData {
  const formData = new FormData();
  formData.set("partnerId", partnerId);
  formData.set("docType", docType);
  formData.set("file", new File([PNG_BYTES], "doc.png", { type: "image/png" }));
  return formData;
}

interface RecordedWrite {
  table: unknown;
  values: FakeRow;
}

void test("admin kyc upload: a non-admin session is refused", async () => {
  const { bucket } = buildBucket();
  setFakeAuthState({
    getSession: async () => buildAdminSession({ role: "employee" }),
    env: buildEnv(bucket),
  });

  const response = await POST(buildUploadRequest(buildValidForm()));

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "Not authorized." });
});

void test("admin kyc upload: rate limited returns 429 before touching the database", async () => {
  const { bucket } = buildBucket();
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    env: buildEnv(bucket, { rateLimited: true }),
  });

  const response = await POST(buildUploadRequest(buildValidForm()));

  assert.equal(response.status, 429);
});

void test("admin kyc upload: a file whose bytes don't match its declared type is rejected", async () => {
  const { bucket, puts } = buildBucket();
  setFakeAuthState({ getSession: async () => buildAdminSession(), env: buildEnv(bucket) });
  const formData = new FormData();
  formData.set("partnerId", "user-1");
  formData.set("docType", "pan");
  formData.set("file", new File([GARBAGE_BYTES], "doc.png", { type: "image/png" }));

  const response = await POST(buildUploadRequest(formData));

  assert.equal(response.status, 400);
  assert.equal(puts.length, 0);
});

void test("admin kyc upload: a fresh document with no prior row is inserted", async () => {
  const { bucket, puts } = buildBucket();
  const inserts: RecordedWrite[] = [];
  const partner: FakeRow = { userId: "user-1", status: "pending" };
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    env: buildEnv(bucket),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [schema.partners, [partner]],
        [schema.partnerDocuments, []],
      ]),
      onInsert: (table, values) => inserts.push({ table, values }),
    },
  });

  const response = await POST(buildUploadRequest(buildValidForm()));

  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(puts.length, 1);
  assert.equal(
    inserts.some((write) => write.table === schema.partnerDocuments),
    true,
  );
});

void test("admin kyc upload: uploading for a verified partner resets them to pending review", async () => {
  const { bucket } = buildBucket();
  const updates: RecordedWrite[] = [];
  const partner: FakeRow = { userId: "user-1", status: "verified" };
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    env: buildEnv(bucket),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [schema.partners, [partner]],
        [schema.partnerDocuments, []],
      ]),
      onUpdate: (table, values) => updates.push({ table, values }),
    },
  });

  const response = await POST(buildUploadRequest(buildValidForm()));

  assert.deepEqual(await response.json(), { ok: true });
  const partnerUpdate = updates.find((write) => write.table === schema.partners);
  assert.equal(partnerUpdate?.values.status, "pending");
  assert.equal(partnerUpdate.values.verifiedBy, null);
});

void test("admin kyc upload: replacing an existing document schedules the old R2 key for deletion", async () => {
  const { bucket, deletes } = buildBucket();
  const partner: FakeRow = { userId: "user-1", status: "pending" };
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    env: buildEnv(bucket),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [schema.partners, [partner]],
        [schema.partnerDocuments, [{ id: "doc-1", r2Key: "kyc/user-1/pan-old.png" }]],
      ]),
    },
  });

  const response = await POST(buildUploadRequest(buildValidForm()));

  assert.deepEqual(await response.json(), { ok: true });
  await Promise.all(getWaitUntilCalls());
  assert.deepEqual(deletes, ["kyc/user-1/pan-old.png"]);
});

void test("admin kyc upload: the partner disappearing mid-transaction returns 404 and deletes the object", async () => {
  const { bucket, puts, deletes } = buildBucket();
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    env: buildEnv(bucket),
    dbOptions: { rowsByTable: new Map([[schema.partners, []]]) },
  });

  const response = await POST(buildUploadRequest(buildValidForm()));
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.uncertain, undefined);
  assert.equal(puts.length, 1);
  assert.equal(deletes.length, 1);
});

void test("admin kyc upload: a transaction failure after the ambiguous window preserves the object and reports uncertain", async () => {
  const { bucket, deletes } = buildBucket();
  const partner: FakeRow = { userId: "user-1", status: "pending" };
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    env: buildEnv(bucket),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([[schema.partners, [partner]]]),
      transactionError: new Error("connection reset during commit"),
    },
  });

  const response = await POST(buildUploadRequest(buildValidForm()));
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.uncertain, true);
  assert.equal(deletes.length, 0);
});

void test("admin kyc upload: a failure before the database is ever reached is a plain 500 with no uncertain flag", async () => {
  const { bucket } = buildBucket({ putError: new Error("R2 unavailable") });
  const partner: FakeRow = { userId: "user-1", status: "pending" };
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    env: buildEnv(bucket),
    dbOptions: { rowsByTable: new Map<unknown, FakeRow[]>([[schema.partners, [partner]]]) },
  });

  const response = await POST(buildUploadRequest(buildValidForm()));
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.equal(body.uncertain, undefined);
});
