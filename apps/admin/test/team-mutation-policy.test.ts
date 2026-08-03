import assert from "node:assert/strict";
import test from "node:test";
import {
  lastAdminRefusal,
  planBanMutation,
  staffDeletionRefusal,
} from "../lib/team-mutation-policy";

const noHistory = {
  notes: false,
  cases: false,
  partnerReviews: false,
  assignedLeads: false,
  assignedCallTasks: false,
};

void test("repeating the same requested ban state is an idempotent no-op", () => {
  assert.deepEqual(planBanMutation(true, true), {
    banned: true,
    changed: false,
    auditAction: "team.ban",
  });
});

void test("a requested ban never turns into an unban based on current state", () => {
  assert.deepEqual(planBanMutation(false, true), {
    banned: true,
    changed: true,
    auditAction: "team.ban",
  });
});

void test("partner review history blocks teammate deletion", () => {
  assert.match(
    staffDeletionRefusal({ ...noHistory, partnerReviews: true }) ?? "",
    /Referral Partner reviews/,
  );
});

void test("a teammate without retained history can be deleted", () => {
  assert.equal(staffDeletionRefusal(noHistory), null);
});

void test("assigned work blocks deletion, so the FK cannot silently orphan it", () => {
  assert.match(staffDeletionRefusal({ ...noHistory, assignedLeads: true }) ?? "", /Ban them first/);
  assert.match(
    staffDeletionRefusal({ ...noHistory, assignedCallTasks: true }) ?? "",
    /Ban them first/,
  );
});

void test("the only active admin cannot be demoted, banned or deleted", () => {
  const soleAdmin = { role: "admin", banned: false };
  assert.match(lastAdminRefusal(soleAdmin, 1, "demote") ?? "", /demoted/);
  assert.match(lastAdminRefusal(soleAdmin, 1, "ban") ?? "", /banned/);
  assert.match(lastAdminRefusal(soleAdmin, 1, "remove") ?? "", /deleted/);
});

void test("a second active admin lifts the lockout refusal", () => {
  assert.equal(lastAdminRefusal({ role: "admin", banned: false }, 2, "ban"), null);
});

void test("an already-banned admin is not the last active admin", () => {
  assert.equal(lastAdminRefusal({ role: "admin", banned: true }, 1, "remove"), null);
});

void test("a non-admin target is never a lockout risk", () => {
  assert.equal(lastAdminRefusal({ role: "employee", banned: false }, 1, "remove"), null);
});
