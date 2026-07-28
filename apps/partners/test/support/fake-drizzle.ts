export type FakeRow = Record<string, unknown>;

interface FakeSelectChain extends PromiseLike<FakeRow[]> {
  from(table: unknown): FakeSelectChain;
  where(...args: unknown[]): FakeSelectChain;
  limit(...args: unknown[]): FakeSelectChain;
  for(...args: unknown[]): FakeSelectChain;
}

interface FakeUpdateChain {
  set(values: FakeRow): { where(...args: unknown[]): Promise<void> };
}

interface FakeInsertChain {
  values(values: FakeRow): Promise<void>;
}

interface FakeTx {
  select(columns?: unknown): FakeSelectChain;
  update(table: unknown): FakeUpdateChain;
  insert(table: unknown): FakeInsertChain;
}

export interface FakeDbOptions {
  /** Rows returned by `.from(table)`, keyed by the real schema table object. */
  rowsByTable?: Map<unknown, FakeRow[]>;
  onUpdate?: (table: unknown, values: FakeRow) => void;
  onInsert?: (table: unknown, values: FakeRow) => void;
  /** When set, `db.transaction(...)` rejects with this instead of running the callback. */
  transactionError?: unknown;
}

export interface FakeDb {
  transaction<T>(run: (tx: FakeTx) => Promise<T>): Promise<T>;
}

function createFakeTx(options: FakeDbOptions): FakeTx {
  const rowsByTable = options.rowsByTable ?? new Map<unknown, FakeRow[]>();
  return {
    select() {
      let selectedTable: unknown;
      const chain: FakeSelectChain = {
        from(table) {
          selectedTable = table;
          return chain;
        },
        where(...args: unknown[]) {
          void args;
          return chain;
        },
        limit(...args: unknown[]) {
          void args;
          return chain;
        },
        for(...args: unknown[]) {
          void args;
          return chain;
        },
        then(onFulfilled, onRejected) {
          const rows = rowsByTable.get(selectedTable) ?? [];
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
          return Promise.resolve();
        },
      };
    },
  };
}

/**
 * A minimal stand-in for @truelend/db's Database, covering only the
 * `.transaction(tx => ...)` plus chainable select/update/insert shape that
 * apps/partners' Server Actions actually call. Rows are looked up by the real
 * schema table object passed to `.from()` — import `schema` for real in
 * tests so `schema.partners` etc. are the same object identities the source
 * under test compares against.
 */
export function createFakeDb(options: FakeDbOptions = {}): FakeDb {
  return {
    async transaction<T>(run: (tx: FakeTx) => Promise<T>): Promise<T> {
      if (options.transactionError !== undefined) throw options.transactionError;
      return run(createFakeTx(options));
    },
  };
}
