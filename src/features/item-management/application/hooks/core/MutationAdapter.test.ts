import { describe, expect, it, vi } from 'vitest';
import {
  anyPending,
  firstError,
  hasFullCRUD,
  toNormalizedMutations,
} from './MutationAdapter';

describe('MutationAdapter', () => {
  it('returns empty normalized mutations for invalid input', () => {
    const normalized = toNormalizedMutations(null);
    expect(normalized).toEqual({});
    expect(hasFullCRUD(normalized)).toBe(false);
  });

  it('normalizes create and delete mutations with common loading state', async () => {
    const createMutation = {
      mutateAsync: vi.fn(async data => ({ created: data })),
      isPending: true,
      error: null,
    };
    const deleteMutation = {
      mutateAsync: vi.fn(async id => ({ deleted: id })),
      isLoading: true,
    };

    const normalized = toNormalizedMutations({
      createMutation,
      deleteMutation,
    });

    const createResult = await normalized.create?.mutateAsync({ name: 'A' });
    const deleteResult = await normalized.delete?.mutateAsync('id-1');

    expect(createResult).toEqual({ created: { name: 'A' } });
    expect(deleteResult).toEqual({ deleted: 'id-1' });
    expect(normalized.create?.isPending).toBe(true);
    expect(normalized.create?.isLoading).toBe(true);
    expect(normalized.delete?.isPending).toBe(true);
    expect(normalized.delete?.isLoading).toBe(true);
  });

  it('normalizes update mutation with flat payload style', async () => {
    const updateMutation = {
      mutateAsync: vi.fn(async payload => payload),
      isLoading: false,
    };

    const normalized = toNormalizedMutations({ updateMutation });

    const result = await normalized.update?.mutateAsync({
      id: 'flat-1',
      name: 'Updated',
      description: 'Desc',
    });

    expect(result).toEqual({
      id: 'flat-1',
      name: 'Updated',
      description: 'Desc',
    });
  });

  it('normalizes update mutation with nested payload style', async () => {
    const updateCategory = {
      mutateAsync: vi.fn(async payload => payload),
      isPending: false,
    };

    const normalized = toNormalizedMutations({ updateCategory });

    const result = await normalized.update?.mutateAsync({
      id: 'nested-1',
      name: 'Updated',
      code: 'C1',
    });

    expect(result).toEqual({
      id: 'nested-1',
      data: {
        name: 'Updated',
        code: 'C1',
      },
    });
  });

  it('forces flat update style when createMutation key exists', async () => {
    const createMutation = {
      mutateAsync: vi.fn(async data => data),
    };
    const updateCategory = {
      mutateAsync: vi.fn(async payload => payload),
    };

    const normalized = toNormalizedMutations({
      createMutation,
      updateCategory,
    });

    const result = await normalized.update?.mutateAsync({
      id: 'flat-by-heuristic',
      name: 'Updated',
    });

    expect(result).toEqual({
      id: 'flat-by-heuristic',
      name: 'Updated',
    });
  });

  it('ignores invalid mutation-like objects without mutateAsync', () => {
    const normalized = toNormalizedMutations({
      createMutation: { invalid: true },
      updateMutation: { mutateAsync: 'not-a-function' },
      deleteMutation: null,
    });

    expect(normalized).toEqual({});
    expect(hasFullCRUD(normalized)).toBe(false);
  });

  it('supports helper utilities for pending and errors', () => {
    expect(
      anyPending(
        { mutateAsync: vi.fn(), isPending: false },
        { mutateAsync: vi.fn(), isLoading: true }
      )
    ).toBe(true);

    expect(
      firstError(
        { mutateAsync: vi.fn(), error: null },
        { mutateAsync: vi.fn(), error: new Error('failed') }
      )
    ).toBeInstanceOf(Error);

    expect(firstError(undefined, { mutateAsync: vi.fn(), error: null })).toBe(
      null
    );
  });

  it('detects full crud availability', () => {
    const normalized = toNormalizedMutations({
      createMutation: { mutateAsync: vi.fn(async data => data) },
      updateMutation: { mutateAsync: vi.fn(async data => data) },
      deleteMutation: { mutateAsync: vi.fn(async data => data) },
    });

    expect(hasFullCRUD(normalized)).toBe(true);
  });
});
