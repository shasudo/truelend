# Security policy

Do not disclose a suspected vulnerability in a public issue or include credentials, customer data,
banking information, KYC documents, or reset links in a report.

Use GitHub's private vulnerability-reporting channel when it is enabled. Otherwise contact the
repository owner privately with:

- the affected app, route, and commit;
- a minimal reproduction using synthetic data;
- expected and observed impact; and
- any safe containment recommendation.

Do not access or alter real customer records to prove impact. Stop testing if it could affect
availability, authorization, production data, email recipients, database state, or private R2
objects.

Repository checks and source review are not a security certification. Production readiness also
depends on verified external controls described in [CLAUDE.md](./CLAUDE.md), including GitHub and
Cloudflare access controls, least-privilege identities, private KYC storage, secrets, monitoring,
backups, restoration exercises, and incident response.
