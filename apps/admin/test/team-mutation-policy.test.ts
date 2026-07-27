import assert from "node:assert/strict";
import test from "node:test";
import { planBanMutation, staffDeletionRefusal } from "../lib/team-mutation-policy";

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
    staffDeletionRefusal({ notes: false, cases: false, partnerReviews: true }) ?? "",
    /Referral Partner reviews/,
  );
});

void test("a teammate without retained history can be deleted", () => {
  assert.equal(staffDeletionRefusal({ notes: false, cases: false, partnerReviews: false }), null);
});
