import assert from "node:assert/strict";
import test from "node:test";
import { schema } from "@truelend/db";
import { installNextCacheMock } from "./support/fake-next-cache";
import {
  buildSession,
  installPartnerAuthMock,
  setPartnerContext,
} from "./support/fake-partner-context";
import { createFakeDb, type FakeRow } from "@truelend/test-support";
import { buildPartnerRow } from "./support/fixtures";

installNextCacheMock();
installPartnerAuthMock();
const { POST } = await import("../app/api/kyc/upload/route");

const ORIGIN = "https://partners.example.com";

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
const GARBAGE_BYTES = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

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

function buildEnv(bucket: unknown, options: { rateLimited?: boolean } = {}) {
  return {
    BETTER_AUTH_URL: ORIGIN,
    BUCKET: bucket,
    PARTNER_WRITE_RATE_LIMITER: {
      limit: async () => ({ success: !options.rateLimited }),
    },
  };
}

function buildCtx() {
  const scheduled: Promise<unknown>[] = [];
  return { ctx: { waitUntil: (p: Promise<unknown>) => scheduled.push(p) }, scheduled };
}

function buildUploadRequest(formData: FormData): Request {
  return new Request("https://partners.example.com/api/kyc/upload", {
    method: "POST",
    headers: { origin: ORIGIN },
    body: formData,
  });
}

function buildValidForm(docType = "pan"): FormData {
  const formData = new FormData();
  formData.set("docType", docType);
  formData.set("file", new File([PNG_BYTES], "doc.png", { type: "image/png" }));
  return formData;
}

interface RecordedWrite {
  table: unknown;
  values: FakeRow;
}

void test("kyc upload: no session returns a 401 JSON body", async () => {
  setPartnerContext({
    db: createFakeDb(),
    session: null,
    partner: null,
    ...buildCtx(),
    env: buildEnv({}),
  });

  const response = await POST(buildUploadRequest(buildValidForm()));

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Please sign in again." });
});

void test("kyc upload: rate limited returns 429 before touching the database", async () => {
  const { bucket } = buildBucket();
  setPartnerContext({
    db: createFakeDb(),
    session: buildSession(),
    partner: buildPartnerRow({ status: "pending", submittedAt: null }),
    ...buildCtx(),
    env: buildEnv(bucket, { rateLimited: true }),
  });

  const response = await POST(buildUploadRequest(buildValidForm()));

  assert.equal(response.status, 429);
});

void test("kyc upload: a locked (under-review) partner is rejected before touching R2", async () => {
  const { bucket, puts } = buildBucket();
  setPartnerContext({
    db: createFakeDb(),
    session: buildSession(),
    partner: buildPartnerRow({ status: "pending", submittedAt: new Date() }),
    ...buildCtx(),
    env: buildEnv(bucket),
  });

  const response = await POST(buildUploadRequest(buildValidForm()));

  assert.equal(response.status, 403);
  assert.equal(puts.length, 0);
});

void test("kyc upload: a file whose bytes don't match its declared type is rejected", async () => {
  const { bucket, puts } = buildBucket();
  setPartnerContext({
    db: createFakeDb(),
    session: buildSession(),
    partner: buildPartnerRow({ status: "pending", submittedAt: null }),
    ...buildCtx(),
    env: buildEnv(bucket),
  });
  const formData = new FormData();
  formData.set("docType", "pan");
  formData.set("file", new File([GARBAGE_BYTES], "doc.png", { type: "image/png" }));

  const response = await POST(buildUploadRequest(formData));

  assert.equal(response.status, 400);
  assert.equal(puts.length, 0);
});

void test("kyc upload: a fresh document with no prior row is inserted", async () => {
  const { bucket, puts } = buildBucket();
  const inserts: RecordedWrite[] = [];
  const partner = buildPartnerRow({ status: "pending", submittedAt: null, userId: "user-1" });
  const db = createFakeDb({
    rowsByTable: new Map<unknown, FakeRow[]>([
      [schema.partners, [partner]],
      [schema.partnerDocuments, []],
    ]),
    onInsert: (table, values) => inserts.push({ table, values }),
  });
  setPartnerContext({ db, session: buildSession(), partner, ...buildCtx(), env: buildEnv(bucket) });

  const response = await POST(buildUploadRequest(buildValidForm()));

  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(puts.length, 1);
  assert.equal(
    inserts.some((write) => write.table === schema.partnerDocuments),
    true,
  );
});

void test("kyc upload: replacing an existing document updates it and schedules the old R2 key for deletion", async () => {
  const { bucket, deletes } = buildBucket();
  const { ctx, scheduled } = buildCtx();
  const partner = buildPartnerRow({ status: "pending", submittedAt: null, userId: "user-1" });
  const updates: RecordedWrite[] = [];
  const db = createFakeDb({
    rowsByTable: new Map<unknown, FakeRow[]>([
      [schema.partners, [partner]],
      [schema.partnerDocuments, [{ id: "doc-1", r2Key: "kyc/user-1/pan-old.png" }]],
    ]),
    onUpdate: (table, values) => updates.push({ table, values }),
  });
  setPartnerContext({ db, session: buildSession(), partner, ctx, env: buildEnv(bucket) });

  const response = await POST(buildUploadRequest(buildValidForm()));
  await Promise.all(scheduled);

  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(updates.length, 1);
  assert.deepEqual(deletes, ["kyc/user-1/pan-old.png"]);
});

void test("kyc upload: duplicate prior rows for the same doc type are deduped — the extra database rows are deleted", async () => {
  const { bucket } = buildBucket();
  const { ctx, scheduled } = buildCtx();
  const partner = buildPartnerRow({ status: "pending", submittedAt: null, userId: "user-1" });
  const dbDeletes: unknown[] = [];
  const db = createFakeDb({
    rowsByTable: new Map<unknown, FakeRow[]>([
      [schema.partners, [partner]],
      [
        schema.partnerDocuments,
        [
          { id: "doc-1", r2Key: "kyc/user-1/pan-old-1.png" },
          { id: "doc-2", r2Key: "kyc/user-1/pan-old-2.png" },
        ],
      ],
    ]),
    onDelete: (table) => dbDeletes.push(table),
  });
  setPartnerContext({ db, session: buildSession(), partner, ctx, env: buildEnv(bucket) });

  const response = await POST(buildUploadRequest(buildValidForm()));
  await Promise.all(scheduled);

  assert.deepEqual(await response.json(), { ok: true });
  assert.deepEqual(dbDeletes, [schema.partnerDocuments]);
});

void test("kyc upload: the partner disappearing mid-transaction is a clean rollback, not an ambiguous one", async () => {
  const { bucket, puts, deletes } = buildBucket();
  const partner = buildPartnerRow({ status: "pending", submittedAt: null, userId: "user-1" });
  const db = createFakeDb({
    rowsByTable: new Map([[schema.partners, []]]),
  });
  setPartnerContext({ db, session: buildSession(), partner, ...buildCtx(), env: buildEnv(bucket) });

  const response = await POST(buildUploadRequest(buildValidForm()));
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.uncertain, undefined);
  assert.equal(puts.length, 1);
  assert.equal(deletes.length, 1);
});

void test("kyc upload: a transaction failure after the ambiguous window preserves the object and reports uncertain", async () => {
  const { bucket, deletes } = buildBucket();
  const partner = buildPartnerRow({ status: "pending", submittedAt: null, userId: "user-1" });
  const db = createFakeDb({
    rowsByTable: new Map([[schema.partners, [partner]]]),
    transactionError: new Error("connection reset during commit"),
  });
  setPartnerContext({ db, session: buildSession(), partner, ...buildCtx(), env: buildEnv(bucket) });

  const response = await POST(buildUploadRequest(buildValidForm()));
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.uncertain, true);
  assert.equal(deletes.length, 0);
});

void test("kyc upload: a failure before the database is ever reached is a plain 500 with no uncertain flag", async () => {
  const { bucket } = buildBucket({ putError: new Error("R2 unavailable") });
  const partner = buildPartnerRow({ status: "pending", submittedAt: null, userId: "user-1" });
  setPartnerContext({
    db: createFakeDb({ rowsByTable: new Map([[schema.partners, [partner]]]) }),
    session: buildSession(),
    partner,
    ...buildCtx(),
    env: buildEnv(bucket),
  });

  const response = await POST(buildUploadRequest(buildValidForm()));
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.equal(body.uncertain, undefined);
});
