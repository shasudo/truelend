import { mock } from "node:test";

/**
 * next/cache's revalidatePath throws outside a real Next.js request/render
 * context ("Invariant: static generation store missing"). Every partners
 * Server Action calls it on its happy path purely as cache-invalidation
 * plumbing — not logic this plan's tests assert on — so this is a no-op
 * stub, not a spy.
 *
 * Call this BEFORE dynamically importing the action module under test (see
 * installWithPartnerMutationMock's doc comment for why this must be an
 * explicit call rather than an import-time side effect).
 */
export function installNextCacheMock(): void {
  mock.module("next/cache", {
    namedExports: {
      revalidatePath: () => undefined,
    },
  });
}
