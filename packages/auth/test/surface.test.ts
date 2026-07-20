import assert from "node:assert/strict";
import test from "node:test";
import { isPartnerAuthEndpointAllowed } from "../src/index";

const request = (path: string) => new Request(`https://partner.example.test${path}`);

void test("partner auth surface excludes raw signup and every admin endpoint", () => {
  assert.equal(isPartnerAuthEndpointAllowed(request("/api/auth/sign-up/email")), false);
  assert.equal(isPartnerAuthEndpointAllowed(request("/api/auth/sign-up/email/")), false);
  assert.equal(isPartnerAuthEndpointAllowed(request("/api/auth/admin")), false);
  assert.equal(isPartnerAuthEndpointAllowed(request("/api/auth/admin/list-users")), false);
  assert.equal(isPartnerAuthEndpointAllowed(request("/api/auth/admin/impersonate-user")), false);
});

void test("partner auth surface retains only normal account endpoints", () => {
  assert.equal(isPartnerAuthEndpointAllowed(request("/api/auth/sign-in/email")), true);
  assert.equal(isPartnerAuthEndpointAllowed(request("/api/auth/request-password-reset")), true);
  assert.equal(isPartnerAuthEndpointAllowed(request("/api/auth/get-session")), true);
});
