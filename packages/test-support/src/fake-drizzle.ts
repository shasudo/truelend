export type FakeRow = Record<string, unknown>;

/** Everything a `.select()...` chain captured before it resolved, for fakes that need to check scoping. */
export interface FakeSelectQuery {
  table: unknown;
  whereArgs: unknown[];
  limitArgs: unknown[];
}

/**
 * Given a captured query, returns the rows it should resolve to. Unlike a
 * plain array, this can inspect `whereArgs`/`limitArgs` to prove a read is
 * actually scoped (e.g. `eq(schema.partners.userId, session.user.id)`) rather
 * than returning a row for the table regardless of what the query asked for —
 * see `FakeDbOptions.rowsByTable`'s doc comment for when this distinction matters.
 */
export type FakeRowProvider = (query: FakeSelectQuery) => FakeRow[];

interface FakeSelectChain extends PromiseLike<FakeRow[]> {
  from(table: unknown): FakeSelectChain;
  where(...args: unknown[]): FakeSelectChain;
  limit(...args: unknown[]): FakeSelectChain;
  for(...args: unknown[]): FakeSelectChain;
  /**
   * Accepted and ignored, like `.for()`. Configured rows are returned in the
   * order the test declared them, so a query that only orders to make `limit(1)`
   * deterministic stays reachable. This fake still cannot verify ordering — a
   * test must not assert on it.
   */
  orderBy(...args: unknown[]): FakeSelectChain;
}

interface FakeUpdateChain {
  set(values: FakeRow): { where(...args: unknown[]): Promise<void> };
}

interface FakeInsertResult extends PromiseLike<void> {
  returning(columns?: unknown): Promise<FakeRow[]>;
}

interface FakeInsertChain {
  values(values: FakeRow): FakeInsertResult;
}

interface FakeDeleteChain {
  where(...args: unknown[]): Promise<void>;
}

/** The chainable query surface real drizzle exposes both on `db` directly and on a `tx` inside `db.transaction(...)`. */
export interface FakeQueryClient {
  select(columns?: unknown): FakeSelectChain;
  update(table: unknown): FakeUpdateChain;
  insert(table: unknown): FakeInsertChain;
  delete(table: unknown): FakeDeleteChain;
}

export interface FakeDbOptions {
  /**
   * Rows returned by `.from(table)`, keyed by the real schema table object.
   *
   * A plain array answers every query against that table the same way,
   * regardless of `.where(...)` — fine for most branching logic, since these
   * fakes deliberately don't implement SQL. It is NOT fine for a read whose
   * `.where()` clause IS the security boundary (an ownership/authz lookup,
   * e.g. "find the partner row for THIS session's user id") — a test
   * asserting the row comes back would pass identically whether the source
   * scopes the query correctly or not, silently proving nothing about the
   * one thing that matters. For those reads, use a `FakeRowProvider`
   * function instead and only return the row when `query.whereArgs` proves
   * the call was scoped as expected (e.g. structurally equal, via
   * `node:util`'s `isDeepStrictEqual`, to a real `eq(...)` call built with
   * the expected id) — return `[]` otherwise.
   */
  rowsByTable?: Map<unknown, FakeRow[] | FakeRowProvider>;
  onUpdate?: (table: unknown, values: FakeRow) => void;
  onInsert?: (table: unknown, values: FakeRow) => void;
  onDelete?: (table: unknown) => void;
  /** Rows resolved by `.insert(table).values(values).returning(...)`. Defaults to `[]`. */
  returningRows?: (table: unknown, insertedValues: FakeRow) => FakeRow[];
  /** When set, `db.transaction(...)` rejects with this instead of running the callback. */
  transactionError?: unknown;
  /** When set, `db.$client.end()` rejects/throws with this instead of resolving. */
  clientEndError?: unknown;
  onClientEnd?: () => void;
  /**
   * Rows resolved when `db.$client` is invoked as a callable tagged-template
   * raw query (e.g. `` db.$client<Row[]>`select ... from partners` `` — the
   * real postgres.js client, which drizzle exposes as `$client`, is callable
   * this way; `ping()` and a couple of Server Actions use it directly instead
   * of the query builder). Defaults to `[]`.
   */
  rawQueryRows?: FakeRow[];
}

/** postgres.js's client is a callable tagged-template function with `.end()` attached — not a plain object. */
export type FakeClient = ((
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<FakeRow[]>) & {
  end(): Promise<void>;
};

export interface FakeDb extends FakeQueryClient {
  transaction<T>(run: (tx: FakeQueryClient) => Promise<T>): Promise<T>;
  $client: FakeClient;
}

function resolveRows(
  rowsByTable: Map<unknown, FakeRow[] | FakeRowProvider>,
  query: FakeSelectQuery,
): FakeRow[] {
  const entry = rowsByTable.get(query.table);
  if (entry === undefined) return [];
  return typeof entry === "function" ? entry(query) : entry;
}

function createFakeQueryClient(options: FakeDbOptions): FakeQueryClient {
  const rowsByTable = options.rowsByTable ?? new Map<unknown, FakeRow[] | FakeRowProvider>();
  return {
    select() {
      let selectedTable: unknown;
      let whereArgs: unknown[] = [];
      let limitArgs: unknown[] = [];
      const chain: FakeSelectChain = {
        from(table) {
          selectedTable = table;
          return chain;
        },
        where(...args: unknown[]) {
          whereArgs = args;
          return chain;
        },
        limit(...args: unknown[]) {
          limitArgs = args;
          return chain;
        },
        for(...args: unknown[]) {
          void args;
          return chain;
        },
        orderBy(...args: unknown[]) {
          void args;
          return chain;
        },
        then(onFulfilled, onRejected) {
          const rows = resolveRows(rowsByTable, {
            table: selectedTable,
            whereArgs,
            limitArgs,
          });
          return Promise.resolve(rows).then(onFulfilled, onRejected);
        },
      };
      return chain;
    },
    update(table) {
      return {
        set(values) {
          return {
            where(...args: unknown[]) {
              void args;
              options.onUpdate?.(table, values);
              return Promise.resolve();
            },
          };
        },
      };
    },
    insert(table) {
      return {
        values(values) {
          options.onInsert?.(table, values);
          const result: FakeInsertResult = {
            then(onFulfilled, onRejected) {
              return Promise.resolve(undefined).then(onFulfilled, onRejected);
            },
            returning(columns?: unknown) {
              void columns;
              const rows = options.returningRows?.(table, values) ?? [];
              return Promise.resolve(rows);
            },
          };
          return result;
        },
      };
    },
    delete(table) {
      return {
        where(...args: unknown[]) {
          void args;
          options.onDelete?.(table);
          return Promise.resolve();
        },
      };
    },
  };
}

/**
 * A minimal stand-in for @truelend/db's Database, covering the
 * `.transaction(tx => ...)` plus chainable select/update/insert shape the
 * apps' Server Actions and routes actually call. Rows are looked up by the
 * real schema table object passed to `.from()`/`.insert()`/`.update()` —
 * import `schema` for real in tests so `schema.partners` etc. are the same
 * object identities the source under test compares against.
 */
function createFakeClient(options: FakeDbOptions): FakeClient {
  const client = (async (..._args: unknown[]) => {
    void _args;
    return options.rawQueryRows ?? [];
  }) as FakeClient;
  client.end = async () => {
    options.onClientEnd?.();
    if (options.clientEndError !== undefined) throw options.clientEndError;
  };
  return client;
}

export function createFakeDb(options: FakeDbOptions = {}): FakeDb {
  return {
    ...createFakeQueryClient(options),
    async transaction<T>(run: (tx: FakeQueryClient) => Promise<T>): Promise<T> {
      if (options.transactionError !== undefined) throw options.transactionError;
      return run(createFakeQueryClient(options));
    },
    $client: createFakeClient(options),
  };
}
