## What changed

<!-- Describe the user-visible outcome and the smallest coherent implementation. -->

## Evidence

- [ ] Touched files were formatted.
- [ ] Focused lint, typecheck, and tests passed.
- [ ] `pnpm check:release` passed, or failures/not-run checks are explained below.
- [ ] Worker build, dry run, and bundle scan passed for runtime/binding/OpenNext changes.
- [ ] UI changes were checked at mobile, tablet, and desktop sizes.
- [ ] Accessibility states (keyboard, focus, labels, errors, reduced motion) were checked.

## Risk and operations

- [ ] No database, auth, finance, KYC, infrastructure, or release behavior changed.
- [ ] If checked above is false: CODEOWNERS and two independent approvals are requested.
- [ ] Migration is backward-compatible through rollout and rollback, or not applicable.
- [ ] New/changed configuration and secret names are documented, or not applicable.
- [ ] Rollout, health verification, and rollback evidence is attached, or not applicable.
- [ ] No credentials, customer data, banking values, KYC content, or reset links appear in this PR.

## External follow-up

<!-- Record deployment, Cloudflare/GitHub configuration, legal/content approval, monitoring, backup,
or recovery work that repository checks cannot prove. Write "None" only when genuinely complete. -->
