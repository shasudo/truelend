import assert from "node:assert/strict";
import test from "node:test";

import { channelForKind } from "../src/leads";

void test("partner lead channels take precedence over the website lead kind", () => {
  assert.equal(channelForKind("enquiry", "business"), "Business Partner");
  assert.equal(channelForKind("referral", "referral"), "Referral Partner");
  assert.equal(channelForKind("referral", null), "Website · Referral");
  assert.equal(channelForKind("enquiry", null), "Website · Direct");
});
