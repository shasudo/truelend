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

installNextCacheMock();
installPartnerAuthMock();
const { updateProfileAction } = await import("../lib/profile-actions");

const PARTNER: FakeRow = { userId: "user-1" };

function buildProfileForm(): FormData {
  const formData = new FormData();
  formData.set("name", "Jane Partner");
  formData.set("phone", "9876543210");
  return formData;
}

interface RecordedWrite {
  table: unknown;
  values: FakeRow;
}

void test("updateProfileAction: no session returns an error", async () => {
  setPartnerContext({ db: createFakeDb(), session: null, partner: PARTNER });

  const result = await updateProfileAction({}, buildProfileForm());

  assert.equal(result.ok, undefined);
  assert.equal(typeof result.error, "string");
});

void test("updateProfileAction: a valid update is written and audited", async () => {
  const updates: RecordedWrite[] = [];
  const db = createFakeDb({
    rowsByTable: new Map<unknown, FakeRow[]>([[schema.partners, [PARTNER]]]),
    onUpdate: (table, values) => updates.push({ table, values }),
  });
  setPartnerContext({ db, session: buildSession(), partner: PARTNER });

  const result = await updateProfileAction({}, buildProfileForm());

  assert.deepEqual(result, { ok: true });
  assert.equal(
    updates.some((write) => write.table === schema.user),
    true,
  );
  assert.equal(
    updates.some((write) => write.table === schema.partners),
    true,
  );
});

void test("updateProfileAction: the partner row vanishing between the outer check and the transaction is reported", async () => {
  const db = createFakeDb({ rowsByTable: new Map<unknown, FakeRow[]>([[schema.partners, []]]) });
  setPartnerContext({ db, session: buildSession(), partner: PARTNER });

  const result = await updateProfileAction({}, buildProfileForm());

  assert.equal(result.ok, undefined);
  assert.equal(typeof result.error, "string");
});
