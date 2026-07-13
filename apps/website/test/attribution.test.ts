import assert from "node:assert/strict";
import test from "node:test";
import { ATTRIBUTION_TTL_MS, resolveAttribution, touchFromSearch } from "../lib/attribution";

test("attribution keeps first touch, updates last touch, and expires", () => {
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

test("corrupt, oversized, and blocked-style attribution inputs remain optional", () => {
  assert.deepEqual(resolveAttribution("{not-json", {}).fields, {});
  assert.deepEqual(resolveAttribution("x".repeat(5_000), {}).fields, {});
  assert.deepEqual(touchFromSearch(new URLSearchParams("utm_source=" + "x".repeat(200))), {
    source: "x".repeat(100),
    medium: undefined,
    campaign: undefined,
  });
});
