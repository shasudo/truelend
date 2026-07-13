# ADR 0001: Separate admin and partner auth surfaces

- Status: accepted
- Date: 2026-07-13

## Context

Loading one Better Auth configuration on both hosts risks exposing staff-only enumeration, impersonation, role, and ban endpoints to partner traffic. Partner self-registration must never inherit a staff role or bypass the business profile workflow.

## Decision

Use per-request `createAdminAuth` and `createPartnerAuth` factories. Only admin loads the Better Auth admin plugin. Partner auth omits it, and the partner catch-all rejects raw email signup and `/api/auth/admin/*`; registration is an atomic app action protected by input validation, independent abuse limits, and Turnstile.

Admin client functionality lives in the admin-only package export. Shared auth UI uses the base client without admin methods.

## Consequences

Auth configuration is duplicated only where session/security policy intentionally differs. Endpoint-absence regression tests are required. This does not replace server-side role/ownership authorization, verified-email requirements, MFA, device/session management, or Cloudflare Access; those remain separate controls.
