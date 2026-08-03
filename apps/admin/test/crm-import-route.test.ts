import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { schema } from "@truelend/db";
import {
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
const { POST } = await import("../app/api/crm/import/route");

const ORIGIN = "https://admin.example.com";

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

function buildEnv(options: { rateLimited?: boolean } = {}): FakeCloudflareEnv {
  return {
    HYPERDRIVE: { connectionString: "postgres://fake" },
    BETTER_AUTH_SECRET: "secret",
    BETTER_AUTH_URL: ORIGIN,
    AUTH_RATE_LIMITER: { limit: async () => ({ success: !options.rateLimited }) },
  };
}

function buildRequest(body: BodyInit, headers: Record<string, string> = {}): Request {
  return new Request("https://admin.example.com/api/crm/import", {
    method: "POST",
    headers: { origin: ORIGIN, ...headers },
    body,
  });
}

function csvForm(csv: BlobPart, name = "list.csv", type = "text/csv"): FormData {
  const formData = new FormData();
  formData.set("file", new File([csv], name, { type }));
  return formData;
}

const VALID_CSV = "name,phone,email\nAnil Rao,9876543210,anil@example.com\nMeera S,9812345678,\n";

interface RecordedWrite {
  table: unknown;
  values: FakeRow;
}

void test("crm import: a non-admin session is refused", async () => {
  setFakeAuthState({
    getSession: async () => buildAdminSession({ role: "employee" }),
    env: buildEnv(),
  });

  const response = await POST(buildRequest(csvForm(VALID_CSV)));

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "Not authorized." });
});

void test("crm import: a cross-origin post is refused", async () => {
  setFakeAuthState({ getSession: async () => buildAdminSession(), env: buildEnv() });

  const response = await POST(
    buildRequest(csvForm(VALID_CSV), { origin: "https://evil.example.com" }),
  );

  assert.equal(response.status, 403);
});

void test("crm import: an oversized declared body is refused before buffering", async () => {
  setFakeAuthState({ getSession: async () => buildAdminSession(), env: buildEnv() });

  const response = await POST(
    buildRequest(csvForm(VALID_CSV), { "content-length": String(5 * 1024 * 1024) }),
  );

  assert.equal(response.status, 413);
});

void test("crm import: a file that is not a .csv is refused", async () => {
  setFakeAuthState({ getSession: async () => buildAdminSession(), env: buildEnv() });

  const response = await POST(
    buildRequest(csvForm(VALID_CSV, "list.xlsx", "application/vnd.ms-excel")),
  );

  assert.equal(response.status, 400);
});

void test("crm import: a binary payload renamed .csv is refused", async () => {
  setFakeAuthState({ getSession: async () => buildAdminSession(), env: buildEnv() });
  // A ZIP/XLSX header: NUL-dense, so it never reaches the parser.
  const zip = Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00]).buffer;

  const response = await POST(buildRequest(csvForm(zip)));

  assert.equal(response.status, 400);
});

void test("crm import: a header without a phone column is refused", async () => {
  setFakeAuthState({ getSession: async () => buildAdminSession(), env: buildEnv() });

  const response = await POST(buildRequest(csvForm("name,city\nAnil,Pune\n")));

  assert.equal(response.status, 400);
  const body = (await response.json()) as { error: string };
  assert.match(body.error, /phone/);
});

void test("crm import: one bad row rejects the whole file and writes nothing", async () => {
  const inserts: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    env: buildEnv(),
    dbOptions: { onInsert: (table, values) => inserts.push({ table, values }) },
  });

  const response = await POST(
    buildRequest(csvForm("name,phone\nAnil,9876543210\nMeera,+919812345678\n")),
  );

  assert.equal(response.status, 400);
  const body = (await response.json()) as {
    total: number;
    invalid: number;
    failures: { row: number; code: string }[];
  };
  assert.equal(body.total, 2);
  assert.equal(body.invalid, 1);
  // Row 3: the header is row 1. Reported by position and code, never by value.
  assert.deepEqual(body.failures, [{ row: 3, code: "phone_invalid" }]);
  assert.equal(inserts.length, 0, "a partial import must never land");
});

void test("crm import: a clean file inserts the rows and one audit entry", async () => {
  const inserts: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    env: buildEnv(),
    dbOptions: { onInsert: (table, values) => inserts.push({ table, values }) },
  });

  const response = await POST(buildRequest(csvForm(VALID_CSV)));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, imported: 2 });
  const taskWrite = inserts.find((write) => write.table === schema.callTasks);
  assert.ok(taskWrite, "call tasks are inserted");
  // One chunked multi-row insert, not one statement per row.
  assert.equal(Array.isArray(taskWrite.values), true);
  assert.equal(
    inserts.filter((write) => write.table === schema.auditLog).length,
    1,
    "one audit row records the batch",
  );
});

void test("crm import: rate limiting returns 429 before the file is read", async () => {
  const inserts: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    env: buildEnv({ rateLimited: true }),
    dbOptions: { onInsert: (table, values) => inserts.push({ table, values }) },
  });

  const response = await POST(buildRequest(csvForm(VALID_CSV)));

  assert.equal(response.status, 429);
  assert.equal(inserts.length, 0);
});

void test("crm import: spreadsheet padding rows are skipped, not reported as failures", async () => {
  const inserts: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    env: buildEnv(),
    dbOptions: { onInsert: (table, values) => inserts.push({ table, values }) },
  });

  // Excel exports trailing delimiter-only and whitespace-only lines.
  const response = await POST(buildRequest(csvForm("name,phone\nAnil Rao,9876543210\n,,\n   ,\n")));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, imported: 1 });
  assert.ok(inserts.some((write) => write.table === schema.callTasks));
});

void test("crm import: an unbalanced quote is refused before anything is written", async () => {
  const inserts: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    env: buildEnv(),
    dbOptions: { onInsert: (table, values) => inserts.push({ table, values }) },
  });

  const response = await POST(
    buildRequest(csvForm('name,phone\n"Anil,9876543210\nBob,9812345678\n')),
  );

  assert.equal(response.status, 400);
  assert.equal(inserts.length, 0);
});
