# Refactor Mandate

You are performing a full restructure of this codebase. Behavior must not change.

## Rules of engagement

- Work in phases. Do not start Phase N+1 until I approve Phase N.
- Never edit and verify in one breath: after every module, run typecheck, lint,
  tests, and build. If anything fails, fix it before moving on.
- Commit after each completed module with a descriptive message. Small commits.
- No placeholders, no `// ... rest unchanged`, no partial files. Complete edits only.
- If intent is ambiguous, ASK. Do not guess at what code was meant to do.
- If a refactor would change observable behavior, stop and flag it instead of doing it.
- Phase 3 may not commit with a red suite, and may not modify a Tier A test to make it pass — a failing characterization test means the refactor changed behavior, and the refactor gets reverted, not the test.
- Every branch is cut from origin/main after a fetch — `git fetch && git checkout -b <name> origin/main` — never from local main. Before opening any PR, verify the branch contains only the commits intended for it (`git log --oneline origin/main..HEAD`) and state that commit list in the report.

## Frozen seams

The Tier A characterization tests (see `TEST_PLAN.md`) assert on the drizzle
call surface directly — the table/values passed to `.select()`/`.update()`/
`.insert()`/`.transaction()` — because that survives a file move or rename,
which is what these tests are for. It does **not** survive introducing a
repository/data-access abstraction over the ORM, which is exactly the kind of
change a "minimal public surface per module" restructure tends to propose.

**Phase 3 may not introduce a data-access abstraction layer, change ORM usage
patterns, or wrap db calls, for the duration of this refactor.** The drizzle
call surface is a frozen seam. If a repository/data-access layer is later
judged worth having, it is post-refactor work with its own plan and its own
characterization tests written against the new seam — not something to fold
into this restructure.

## Phase 0 — Baseline

Establish safety before touching anything:

- Run the existing test suite, typecheck, lint, build. Record the exact results.
- Report coverage. Identify modules with no test coverage — these are high-risk
  and must be refactored more conservatively.
- If there is no meaningful test suite, say so and stop. We add characterization
  tests before refactoring.

## Phase 1 — Audit (read-only, no edits)

Map the codebase and report:

- Current structure and what each module actually does
- Dead code, unused exports, unreachable branches, duplicated logic
- Type holes: `any`, implicit any, unchecked casts, suppression comments
- Naming inconsistencies (list the competing conventions you found)
- Circular dependencies and leaked internals
- Real performance problems: N+1 patterns, redundant passes, unnecessary
  recomputation, blocking work on hot paths
- Comment rot: restatements, stale notes, commented-out code, ownerless TODOs
  Group findings by severity. Do not fix anything yet.

## Phase 2 — Plan

Propose:

- Target directory tree, with one line of rationale per top-level folder
- The single convention chosen for: file/folder casing, type names, function
  names, booleans, constants, imports ordering, exports, error handling, async
- Module-by-module refactor order, safest and most isolated first
- Linter / formatter / compiler config that mechanically enforces the above
  Wait for my approval.

## Phase 3 — Execute, one module at a time

For each module in the approved order:

1. Refactor to the standard below
2. Run typecheck, lint, tests, build
3. Report what changed and why, then commit
4. Move to the next module

## The standard

**Typing** — strictest settings. No `any`, no implicit any, no unchecked casts,
no suppressions. `unknown` + narrowing where a type is genuinely unknowable.
Discriminated unions over boolean flags. Branded types for IDs. Literal unions
over loose strings. `readonly` by default. Explicit return types on exports.
Make illegal states unrepresentable; validate only at system boundaries.

**Naming** — precise, unambiguous, self-documenting. No `data`, `info`, `temp`,
`handleStuff`, `utils2`. Booleans read as assertions (`isActive`, `hasAccess`).
Functions are verbs, types are nouns, collections are plural. One convention,
zero exceptions.

**Organization** — group by feature/domain, not by technical type. One
responsibility per file. Split files doing multiple things; merge files holding
two lines. No circular imports. Minimal public surface per module through a
single entry point. Co-locate what changes together.

**Comments — delete nearly all of them.** Code explains itself through naming
and structure. Remove restatements, section banners, commented-out code,
ownerless TODOs, changelog notes, obvious param descriptions. Keep only where
absence costs a reader real time: a non-obvious WHY, a deliberate deviation, an
external-bug workaround (with a link), a subtle invariant, a genuinely tricky
algorithm, a security or correctness constraint invisible from the code.
Concise doc comments are allowed on public APIs consumers depend on.
If you want to comment WHAT code does, rewrite the code instead.

**Quality** — small composable functions, low cyclomatic complexity. Guard
clauses over nesting, early returns. Immutability by default, side effects
isolated at the edges. Typed, explicit error handling — nothing swallowed, no
generic catches that lose context. No magic numbers or strings. DRY, but
duplication beats the wrong abstraction — say which you chose on close calls.

**Performance** — fix real structural inefficiencies. Do not micro-optimize at
the cost of readability. State what each optimization improves and roughly by
how much.

## Conflict resolution

correctness > readability > consistency > performance > brevity.
Name the conflict out loud when one occurs.
