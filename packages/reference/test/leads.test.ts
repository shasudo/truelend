import assert from "node:assert/strict";
import test from "node:test";

import { channelForKind } from "../src/leads";

void test("referral-partner lead channels take precedence over the website lead kind", () => {
  assert.equal(channelForKind("referral", true), "Referral Partner");
  assert.equal(channelForKind("referral"), "Website · Referral");
  assert.equal(channelForKind("enquiry"), "Website · Direct");
});
