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
const { POST } = await import("../app/api/bank-leads/import/route");

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
  return new Request("https://admin.example.com/api/bank-leads/import", {
    method: "POST",
    headers: { origin: ORIGIN, ...headers },
    body,
  });
}

function csvForm(csv: BlobPart, options: { bank?: string } = {}): FormData {
  const formData = new FormData();
  formData.set("file", new File([csv], "report.csv", { type: "text/csv" }));
  if (options.bank) formData.set("bank", options.bank);
  return formData;
}

const HEADER = "Application_Id,Status,Sub_Status,Stage,Workflow_Status,utm_content,CardIssualDate";
const HDFC_HEADER =
  "APPLICATION_REFERENCE_NUMBER,CUSTOMER_NAME,CITY,STATE,CURRENT_STAGE,FINAL_DECISION";

void test("bank leads import: a non-admin session is refused", async () => {
  setFakeAuthState({
    getSession: async () => buildAdminSession({ role: "employee" }),
    env: buildEnv(),
  });

  const response = await POST(
    buildRequest(csvForm(`${HEADER}\n1,IN PROGRESS,,Approved,,TRUE12345678,\n`)),
  );

  assert.equal(response.status, 403);
});

void test("bank leads import: a header without utm_content is refused", async () => {
  setFakeAuthState({ getSession: async () => buildAdminSession(), env: buildEnv() });

  const response = await POST(buildRequest(csvForm("Application_Id,Status\n1,IN PROGRESS\n")));

  assert.equal(response.status, 400);
  const body = (await response.json()) as { error: string };
  assert.match(body.error, /utm_content/);
});

void test("bank leads import: rows carrying a foreign or malformed code are skipped, not an error", async () => {
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    env: buildEnv(),
    dbOptions: { rowsByTable: new Map([[schema.bankApplyLeads, []]]) },
  });

  const response = await POST(
    buildRequest(
      csvForm(`${HEADER}\n1,IN PROGRESS,,Approved,,ORG,\n2,IN PROGRESS,,Approved,,NSSH31,\n`),
    ),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, total: 2, matched: 0 });
});

void test("bank leads import: a matching tracking code updates the row and writes one audit entry", async () => {
  const updates: RecordedWrite[] = [];
  const inserts: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    env: buildEnv(),
    dbOptions: {
      rowsByTable: new Map([[schema.bankApplyLeads, [{ id: "lead-1", trackingCode: "12345678" }]]]),
      onUpdate: (table, values) => updates.push({ table, values }),
      onInsert: (table, values) => inserts.push({ table, values }),
    },
  });

  const response = await POST(
    buildRequest(
      csvForm(
        `${HEADER}\n52291541,APPROVED,Policy met,Approved,CARD ISSUAL INITIATED,TRUE12345678,2026-06-09 00:00:00\n`,
      ),
    ),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, total: 1, matched: 1 });
  const leadUpdate = updates.find((u) => u.table === schema.bankApplyLeads);
  assert.equal(leadUpdate?.values.bankApplicationId, "52291541");
  assert.equal(leadUpdate.values.bankStatus, "APPROVED");
  assert.equal(leadUpdate.values.status, "approved");
  assert.equal(leadUpdate.values.cardIssualDate, "2026-06-09");
  const auditInsert = inserts.find((i) => i.table === schema.auditLog);
  assert.equal(auditInsert?.values.action, "bank_apply_lead.reconcile");
  assert.deepEqual(auditInsert.values.after, { total: 1, matched: 1 });
});

void test("hdfc application import: a header without application_reference_number is refused", async () => {
  setFakeAuthState({ getSession: async () => buildAdminSession(), env: buildEnv() });

  const response = await POST(
    buildRequest(csvForm("Customer_Name,City\nJane,Pune\n", { bank: "hdfc" })),
  );

  assert.equal(response.status, 400);
  const body = (await response.json()) as { error: string };
  assert.match(body.error, /application_reference_number/);
});

void test("hdfc application import: a never-seen application reference is inserted", async () => {
  const inserts: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    env: buildEnv(),
    dbOptions: {
      rowsByTable: new Map([[schema.hdfcApplications, []]]),
      onInsert: (table, values) => inserts.push({ table, values }),
    },
  });

  const response = await POST(
    buildRequest(
      csvForm(`${HDFC_HEADER}\nD26H01309079S0TM,Jane Doe,Pune,MAHARASHTRA,Inprocess,\n`, {
        bank: "hdfc",
      }),
    ),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, total: 1, matched: 0, created: 1 });
  const appInsert = inserts.find((i) => i.table === schema.hdfcApplications);
  assert.ok(appInsert);
  const [insertedRow] = appInsert.values as unknown as FakeRow[];
  assert.ok(insertedRow);
  assert.equal(insertedRow.applicationReferenceNumber, "D26H01309079S0TM");
  assert.equal(insertedRow.customerName, "Jane Doe");
});

void test("hdfc application import: an already-seen application reference is updated, not re-inserted", async () => {
  const updates: RecordedWrite[] = [];
  const inserts: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    env: buildEnv(),
    dbOptions: {
      rowsByTable: new Map([
        [
          schema.hdfcApplications,
          [{ id: "app-1", applicationReferenceNumber: "D26H01309079S0TM" }],
        ],
      ]),
      onUpdate: (table, values) => updates.push({ table, values }),
      onInsert: (table, values) => inserts.push({ table, values }),
    },
  });

  const response = await POST(
    buildRequest(
      csvForm(`${HDFC_HEADER}\nD26H01309079S0TM,Jane Doe,Pune,MAHARASHTRA,Approved,APPROVE\n`, {
        bank: "hdfc",
      }),
    ),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, total: 1, matched: 1, created: 0 });
  const appUpdate = updates.find((u) => u.table === schema.hdfcApplications);
  assert.equal(appUpdate?.values.currentStage, "Approved");
  assert.equal(
    inserts.find((i) => i.table === schema.hdfcApplications),
    undefined,
  );
  const auditInsert = inserts.find((i) => i.table === schema.auditLog);
  assert.equal(auditInsert?.values.action, "hdfc_application.import");
});

void test("bank leads import: rate limiting returns 429 before the file is read", async () => {
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    env: buildEnv({ rateLimited: true }),
  });

  const response = await POST(
    buildRequest(csvForm(`${HEADER}\n1,IN PROGRESS,,Approved,,TRUE12345678,\n`)),
  );

  assert.equal(response.status, 429);
});

interface RecordedWrite {
  table: unknown;
  values: FakeRow;
}
