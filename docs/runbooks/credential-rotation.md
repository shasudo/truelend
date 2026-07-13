# Credential rotation

Use this runbook for suspected exposure or scheduled rotation of Cloudflare API tokens, database credentials/Hyperdrives, Better Auth secrets, health tokens, Resend keys, and other service credentials.

1. Open a private incident/change record; identify credential scope, environments, artifacts/logs/backups that may contain it, and earliest possible exposure.
2. Contain access. Revoke the credential immediately when safe; otherwise create a short overlap with a newly scoped credential and a fixed expiry.
3. Create the replacement with minimum permissions in the authoritative provider. Never transmit it through source control, chat, command arguments, or logs.
4. Update the protected GitHub Environment/Cloudflare secret store. For database changes, create a new least-privilege role/config rather than updating an owner credential in place.
5. Deploy through protected CI and verify liveness, readiness, auth, database, KYC, and email behavior as applicable.
6. Revoke the old credential, invalidate affected sessions/tokens where required, and verify it no longer authenticates.
7. Remove secret-bearing local/build artifacts securely, rotate dependent credentials if blast radius is uncertain, and review access/audit logs.
8. Record timestamps, owner, systems, verification, remaining risk, and follow-up prevention. Do not include the credential value.

Changing `BETTER_AUTH_SECRET` can invalidate authentication material; plan user/session impact. Database owner credentials must never become Worker runtime credentials. After a suspected artifact leak, scan the exact upload bundle and source maps as well as ignored local output.
