# Security Policy

## Reporting a vulnerability

Do not open a public issue containing vulnerability details, secrets, credentials, personal data, or KYC documents. Report privately to the repository owner through GitHub's private vulnerability reporting feature. If that feature is unavailable, contact the project owner using a previously verified private channel and provide only enough non-sensitive detail to establish contact.

Include the affected surface, impact, minimal reproduction, and suggested containment if known. Use synthetic accounts/data. Do not access, alter, download, or retain data belonging to other people, and do not perform denial-of-service, social engineering, credential stuffing, or destructive testing.

There is no published bug-bounty or safe-harbor program. Obtain written authorization before testing any production system beyond ordinary use.

## Supported versions

Only the current production revision on protected `main` is supported. Security fixes are released through the normal reviewed CI/CD flow unless an approved incident runbook authorizes an emergency change.

## Handling security-sensitive changes

- Never commit or log secrets, reset tokens, credentials, raw provider bodies, KYC values, or unnecessary personal data.
- Use isolated development/staging data and accounts.
- Require CODEOWNER review and two approvals for auth, infrastructure, migration, finance, and KYC changes.
- Record containment, rotation, migration, verification, and rollback evidence in a private incident/change record.
- Follow the runbooks in `docs/runbooks/` and keep `TODO.md` honest about controls that still require external or production verification.
