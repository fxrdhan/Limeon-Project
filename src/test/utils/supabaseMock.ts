import { vi } from 'vitest';

type ThenableQuery = {
  select: (...args: unknown[]) => ThenableQuery;
  eq: (...args: unknown[]) => ThenableQuery;
  order: (...args: unknown[]) => ThenableQuery;
  limit: (...args: unknown[]) => ThenableQuery;
  range: (...args: unknown[]) => ThenableQuery;
  insert: (...args: unknown[]) => ThenableQuery;
  update: (...args: unknown[]) => ThenableQuery;
  delete: (...args: unknown[]) => ThenableQuery;
  or: (...args: unknown[]) => ThenableQuery;
  ilike: (...args: unknown[]) => ThenableQuery;
  in: (...args: unknown[]) => ThenableQuery;
  gte: (...args: unknown[]) => ThenableQuery;
  lte: (...args: unknown[]) => ThenableQuery;
  lt: (...args: unknown[]) => ThenableQuery;
  like: (...args: unknown[]) => ThenableQuery;
  neq: (...args: unknown[]) => ThenableQuery;
  upsert: (...args: unknown[]) => ThenableQuery;
  selectCount?: (...args: unknown[]) => ThenableQuery;
  single: () => Promise<unknown>;
  then: (
    resolve: (value: unknown) => unknown,
    reject: (reason?: unknown) => unknown
  ) => Promise<unknown>;
};

export const createThenableQuery = (
  result: unknown,
  options: {
    reject?: Error;
    rejectSingle?: Error;
    singleResult?: unknown;
  } = {}
) => {
  const query: ThenableQuery = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    range: vi.fn(() => query),
    insert: vi.fn(() => query),
    update: vi.fn(() => query),
    delete: vi.fn(() => query),
    or: vi.fn(() => query),
    ilike: vi.fn(() => query),
    in: vi.fn(() => query),
    gte: vi.fn(() => query),
    lte: vi.fn(() => query),
    lt: vi.fn(() => query),
    like: vi.fn(() => query),
    neq: vi.fn(() => query),
    upsert: vi.fn(() => query),
    single: vi.fn(() =>
      options.rejectSingle
        ? Promise.reject(options.rejectSingle)
        : Promise.resolve(options.singleResult ?? result)
    ),
    then: (resolve, reject) =>
      (options.reject
        ? Promise.reject(options.reject)
        : Promise.resolve(result)
      ).then(resolve, reject),
  };

  return query;
};

export type { ThenableQuery };
