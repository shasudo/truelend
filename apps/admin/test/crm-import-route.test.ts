import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";
import test, { beforeEach } from "node:test";
import { and, inArray, notInArray } from "drizzle-orm";
import { schema } from "@truelend/db";
import { terminalCallStatusValues } from "@truelend/reference";
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

void test("crm import: a UTF-16 export names the encoding, not just 'not a CSV'", async () => {
  setFakeAuthState({ getSession: async () => buildAdminSession(), env: buildEnv() });
  // Excel's "Save As -> Unicode Text": a UTF-16LE BOM followed by ASCII text,
  // which is NUL-dense the same way a ZIP is — the two must not collapse into
  // the same generic message.
  const utf16 = new Uint8Array([0xff, 0xfe, ...Buffer.from("name,phone\n", "utf16le")]).buffer;

  const response = await POST(buildRequest(csvForm(utf16)));

  assert.equal(response.status, 400);
  const body = (await response.json()) as { error: string };
  assert.match(body.error, /UTF-16/);
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

  const response = await POST(buildRequest(csvForm("name,phone\nAnil,9876543210\nMeera,12345\n")));

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

void test("crm import: a +91-prefixed phone is accepted like a bare 10-digit one", async () => {
  const inserts: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    env: buildEnv(),
    dbOptions: { onInsert: (table, values) => inserts.push({ table, values }) },
  });

  const response = await POST(
    buildRequest(csvForm("name,phone\nAnil Rao,+91 98765 43210\nMeera S,09812345678\n")),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, imported: 2, skipped: 0 });
  const rows = inserts.find((write) => write.table === schema.callTasks)?.values as unknown as {
    phone: string;
  }[];
  assert.deepEqual(
    rows.map((r) => r.phone),
    ["9876543210", "9812345678"],
  );
});

void test("crm import: a phone repeated in the file is skipped, and the rest still import", async () => {
  const inserts: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    env: buildEnv(),
    dbOptions: { onInsert: (table, values) => inserts.push({ table, values }) },
  });

  const response = await POST(
    buildRequest(
      csvForm("name,phone\nAnil Rao,9876543210\nAnil Again,9876543210\nMeera Nair,9812345678\n"),
    ),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, imported: 2, skipped: 1 });
  const rows = inserts.find((w) => w.table === schema.callTasks)?.values as unknown as {
    phone: string;
  }[];
  assert.deepEqual(
    rows.map((r) => r.phone),
    ["9876543210", "9812345678"],
    "the first occurrence survives and the later repeat is the one dropped",
  );
});

void test("crm import: a phone already open in the queue is skipped, not fatal", async () => {
  const inserts: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    env: buildEnv(),
    dbOptions: {
      rowsByTable: new Map([[schema.callTasks, [{ phone: "9876543210" }]]]),
      onInsert: (table, values) => inserts.push({ table, values }),
    },
  });

  const response = await POST(
    buildRequest(csvForm("name,phone\nAnil Rao,9876543210\nMeera Nair,9812345678\n")),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, imported: 1, skipped: 1 });
  const rows = inserts.find((w) => w.table === schema.callTasks)?.values as unknown as {
    phone: string;
  }[];
  assert.deepEqual(
    rows.map((r) => r.phone),
    ["9812345678"],
  );
});

void test("crm import: a file of nothing but already-open phones imports nothing and says so", async () => {
  const inserts: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    env: buildEnv(),
    dbOptions: {
      rowsByTable: new Map([[schema.callTasks, [{ phone: "9876543210" }]]]),
      onInsert: (table, values) => inserts.push({ table, values }),
    },
  });

  const response = await POST(buildRequest(csvForm("name,phone\nAnil Rao,9876543210\n")));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, imported: 0, skipped: 1 });
  assert.equal(inserts.length, 0, "no insert, and no audit row for an import that did nothing");
});

void test("crm import: a malformed row still rejects the whole file, duplicates aside", async () => {
  const inserts: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    env: buildEnv(),
    dbOptions: { onInsert: (table, values) => inserts.push({ table, values }) },
  });

  const response = await POST(
    buildRequest(csvForm("name,phone\nAnil Rao,9876543210\nNo Phone,123\n")),
  );

  assert.equal(response.status, 400);
  const body = (await response.json()) as { failures: { row: number; code: string }[] };
  assert.deepEqual(body.failures, [{ row: 3, code: "phone_invalid" }]);
  assert.equal(inserts.length, 0);
});

void test("crm import: a closed task with the same phone does not block re-import", async () => {
  const inserts: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    env: buildEnv(),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[] | FakeRowProvider>([
        [
          schema.callTasks,
          // Proves the query excludes terminal statuses at the clause level,
          // the same way the auth-scoping tests prove a WHERE clause rather
          // than trusting that rows came back for the right reason.
          (query) =>
            isDeepStrictEqual(query.whereArgs, [
              and(
                inArray(schema.callTasks.phone, ["9876543210"]),
                notInArray(schema.callTasks.status, [...terminalCallStatusValues]),
              ),
            ])
              ? []
              : [{ phone: "9876543210" }],
        ],
      ]),
      onInsert: (table, values) => inserts.push({ table, values }),
    },
  });

  const response = await POST(buildRequest(csvForm("name,phone\nAnil Rao,9876543210\n")));

  assert.equal(response.status, 200);
});

void test("crm import: a human product label resolves to its slug", async () => {
  const inserts: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    env: buildEnv(),
    dbOptions: { onInsert: (table, values) => inserts.push({ table, values }) },
  });

  const response = await POST(
    buildRequest(
      csvForm(
        "name,phone,product\nAnil Rao,9876543210,Personal Loan\nMeera S,9812345678,nonsense\n",
      ),
    ),
  );

  assert.equal(response.status, 200);
  const rows = inserts.find((write) => write.table === schema.callTasks)?.values as unknown as {
    productSlug: string | null;
  }[];
  assert.equal(rows[0]?.productSlug, "personal-loan");
  assert.equal(rows[1]?.productSlug, null, "an unrecognized label is dropped, not a failure");
});

void test("crm import: a malformed email cell imports as no email, not a failure", async () => {
  const inserts: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    env: buildEnv(),
    dbOptions: { onInsert: (table, values) => inserts.push({ table, values }) },
  });

  const response = await POST(
    buildRequest(csvForm("name,phone,email\nAnil Rao,9876543210,not-an-email\n")),
  );

  assert.equal(response.status, 200);
  const rows = inserts.find((write) => write.table === schema.callTasks)?.values as unknown as {
    email: string | null;
  }[];
  assert.equal(rows[0]?.email, null);
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
  assert.deepEqual(await response.json(), { ok: true, imported: 2, skipped: 0 });
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
  assert.deepEqual(await response.json(), { ok: true, imported: 1, skipped: 0 });
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

void test("crm import: a remark column is imported and stays optional", async () => {
  const inserts: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    env: buildEnv(),
    dbOptions: { onInsert: (table, values) => inserts.push({ table, values }) },
  });

  const response = await POST(
    buildRequest(
      csvForm(
        "name,phone,remark\nAnil Rao,9876543210,Asked to call after 6pm\nMeera S,9812345678,\n",
      ),
    ),
  );

  assert.equal(response.status, 200);
  const rows = inserts.find((write) => write.table === schema.callTasks)?.values as unknown as {
    notes: string | null;
  }[];
  assert.equal(rows[0]?.notes, "Asked to call after 6pm");
  assert.equal(rows[1]?.notes, null, "a blank remark is null, not an import failure");
});
