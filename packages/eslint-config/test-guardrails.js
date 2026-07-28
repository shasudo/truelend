const MOCK_MODULE_MESSAGE =
  "This module needs its mocks installed (install*Mock()) and must be imported " +
  "dynamically — `await import(...)` — after those calls, not statically at the " +
  "top of the file. Registering module mocks and then statically importing the " +
  "module under test is what crashed Node's test runner (an internal assertion, " +
  "not a usage error) the first time this codebase tried it. See a support file " +
  "under test/support/ for the install*Mock() + dynamic import pattern. Type-only " +
  "imports (`import type`) are unaffected and always allowed.";

/**
 * Server Actions, middleware, lib/auth.ts, and API routes reach Cloudflare/db/
 * better-auth only through a mockable seam (withPartnerMutation-style helpers,
 * or module-level Cloudflare/db bindings) — tests must install that seam's mock
 * and dynamically import the module under test, never statically import it.
 * This is enforced mechanically here rather than left to a doc comment, since
 * the failure mode is an opaque runtime crash, not a type or lint error.
 */
export default [
  {
    files: ["**/test/**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/lib/*-actions", "**/lib/*-actions.js", "**/lib/*-actions.ts"],
              message: MOCK_MODULE_MESSAGE,
              allowTypeImports: true,
            },
            {
              group: ["**/lib/auth", "**/lib/auth.js", "**/lib/auth.ts"],
              message: MOCK_MODULE_MESSAGE,
              allowTypeImports: true,
            },
            {
              group: ["**/middleware", "**/middleware.js", "**/middleware.ts"],
              message: MOCK_MODULE_MESSAGE,
              allowTypeImports: true,
            },
            {
              group: ["**/app/api/**/route", "**/app/api/**/route.js", "**/app/api/**/route.ts"],
              message: MOCK_MODULE_MESSAGE,
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
];
