# Database and KYC recovery exercise

This document is a procedure template, not evidence that production recoverability has been verified. Record real provider commands, retention, RPO/RTO, owners, and results in an access-controlled recovery record.

## Database exercise

1. Choose a known recovery point and provision a fully isolated target with no production application access or outbound email.
2. Restore using the provider's PITR/snapshot mechanism.
3. Apply minimum test-only credentials and run schema/migration integrity checks plus bounded aggregate reconciliation; never export raw customer/KYC data into logs.
4. Run critical auth, lead, partner, KYC metadata, audit, and finance consistency checks using controlled tooling.
5. Record recovery-point age, restore duration, verification duration, data gaps, failures, and achieved RPO/RTO.
6. Destroy the isolated restore according to retention policy.

## KYC/R2 exercise

1. Select synthetic canary objects and a documented point/version from the approved R2 backup/versioning strategy.
2. Restore into an isolated private bucket with no public domain/CORS.
3. Reconcile database keys, object presence, size/hash metadata, scan state, and authorized preview/read behavior.
4. Verify missing/orphan detection and the recovery path for deleted/replaced objects.
5. Record timing and gaps, then securely delete the exercise bucket.

Do not claim P0 recoverability complete until both exercises succeed against the configured production backup strategies and are approved. Schedule quarterly repeats and after material provider/storage changes.
