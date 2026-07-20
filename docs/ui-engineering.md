# UI engineering

These conventions make UI work predictable for one developer collaborating with coding agents.

## Component boundaries

- Start with a Server Component. Add `"use client"` only for browser APIs, effects, or interactive
  local state.
- Pass a named, explicit DTO to client code—never a database row or a broad `Pick` that can silently
  grow when the schema changes.
- Keep routes/pages thin. App-shared presentation belongs in `components/`; reusable primitives and
  brand behavior belong in `packages/ui`.
- Extract duplication only when multiple real consumers or a security/accessibility invariant need a
  canonical implementation.

## Styling

- Use semantic brand tokens from `packages/ui/src/theme.css`, such as `text-muted` and
  `text-on-dark-muted`.
- Compose classes with `cx()`. It resolves Tailwind conflicts, so a caller's later class can safely
  override a primitive default.
- Prefer a typed component variant when the same override appears repeatedly.
- Every app must retain `@source "../../../packages/ui/src"` in `app/globals.css`.

## Accessibility and resilience

- Give every page one `main` target and one meaningful `h1`; shells provide a keyboard-visible skip
  link.
- Labels, errors, descriptions, and counters must reference the actual form control. `Field` expects
  its direct child to be that control and composes existing `aria-describedby` IDs.
- Use `role="alert"` for failures and an appropriate status live region for asynchronous success or
  progress. Do not swallow sign-out or mutation failures.
- Preserve visible focus, keyboard operation, sufficient contrast, and reduced-motion behavior.
- Meaningful above-the-fold content must be visible in server-rendered HTML. Animation is progressive
  enhancement, never a prerequisite for reading the page.
- Design and verify mobile, tablet, and desktop states. Hiding desktop navigation requires an
  accessible small-screen alternative.

## Forms and async states

- Client validation improves usability; the server boundary always validates again.
- Every form exposes idle, pending, error, and success states without losing focus or becoming
  permanently disabled after hydration/provider/network failure.
- Public mutations retain origin, Fetch Metadata, rate-limit, and Turnstile controls where applicable.
- Public errors are stable and generic. Logs never include tokens, provider response bodies, identity
  values, banking data, or KYC content.

## Verification

For a touched workspace, run formatting plus its lint, typecheck, and test scripts. Shared UI behavior
needs a component test. Responsive shells and forms should also receive browser-level smoke,
accessibility, and screenshot coverage as that suite is introduced.

Before broad refactors, inspect current consumers and preserve established semantics. File splitting
is useful when it creates a clear ownership boundary; folder churn by itself is not an improvement.
