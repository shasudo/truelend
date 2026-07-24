import assert from "node:assert/strict";
import test from "node:test";
import {
  ATTRIBUTION_TTL_MS,
  resolveAttribution,
  touchFromSearch,
  refFromSearch,
} from "../lib/attribution";

void test("attribution keeps first touch, updates last touch, and expires", () => {
  const now = 1_000;
  const first = resolveAttribution(null, { source: "google", campaign: "launch" }, now);
  const second = resolveAttribution(
    first.serialized ?? null,
    { source: "newsletter", medium: "email" },
    now + 10,
  );
  assert.deepEqual(second.fields, {
    utmSource: "google",
    utmMedium: undefined,
    utmCampaign: "launch",
    utmLastSource: "newsletter",
    utmLastMedium: "email",
    utmLastCampaign: undefined,
  });
  assert.deepEqual(
    resolveAttribution(second.serialized ?? null, {}, now + ATTRIBUTION_TTL_MS + 11).fields,
    {},
  );
});

void test("Referral Partner ref is first-touch, normalized, survives UTM touches, and expires", () => {
  const now = 1_000;
  const first = resolveAttribution(null, {}, now, "rp100002");
  assert.equal(first.fields.ref, "RP100002"); // lowercased input normalized
  // A later, different ref does not steal credit from the first Referral Partner.
  const second = resolveAttribution(first.serialized ?? null, {}, now + 10, "RP100009");
  assert.equal(second.fields.ref, "RP100002");
  // Ref persists even when a UTM touch arrives afterwards.
  const third = resolveAttribution(second.serialized ?? null, { source: "google" }, now + 20);
  assert.equal(third.fields.ref, "RP100002");
  assert.equal(third.fields.utmSource, "google");
  // Ref ages out with the rest of the attribution window.
  assert.equal(
    resolveAttribution(third.serialized ?? null, {}, now + ATTRIBUTION_TTL_MS + 21).fields.ref,
    undefined,
  );
});

void test("refFromSearch accepts only RP Referral Partner codes", () => {
  assert.equal(refFromSearch(new URLSearchParams("ref=BP100002")), undefined);
  assert.equal(refFromSearch(new URLSearchParams("ref=rp100002")), "RP100002");
  assert.equal(refFromSearch(new URLSearchParams("ref=DROP TABLE partners")), undefined);
  assert.equal(refFromSearch(new URLSearchParams("ref=XY123")), undefined);
  assert.equal(refFromSearch(new URLSearchParams("")), undefined);
});

void test("corrupt, oversized, and blocked-style attribution inputs remain optional", () => {
  assert.deepEqual(resolveAttribution("{not-json", {}).fields, {});
  assert.deepEqual(resolveAttribution("x".repeat(5_000), {}).fields, {});
  assert.deepEqual(touchFromSearch(new URLSearchParams("utm_source=" + "x".repeat(200))), {
    source: "x".repeat(100),
    medium: undefined,
    campaign: undefined,
  });
});
