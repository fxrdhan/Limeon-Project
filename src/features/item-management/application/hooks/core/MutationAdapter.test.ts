import { describe, expect, it, vi } from 'vite-plus/test';
import {
  anyPending,
  firstError,
  hasFullCRUD,
  toNormalizedMutations,
} from './MutationAdapter';

describe('MutationAdapter', () => {
  it('normalizes legacy create, update, and delete mutation handles', async () => {
    const createSupplier = {
      mutateAsync: vi.fn(async (payload: unknown) => payload),
      isLoading: true,
    };
    const updateSupplierError = new Error('update failed');
    const updateSupplier = {
      mutateAsync: vi.fn(async (payload: unknown) => payload),
      error: updateSupplierError,
    };
    const deleteSupplier = {
      mutateAsync: vi.fn(async (id: string) => id),
    };

    const normalized = toNormalizedMutations({
      createSupplier,
      updateSupplier,
      deleteSupplier,
    });

    expect(hasFullCRUD(normalized)).toBe(true);
    expect(anyPending(normalized.create, normalized.update)).toBe(true);
    expect(firstError(normalized.create, normalized.update)).toBe(
      updateSupplierError
    );

    await normalized.create?.mutateAsync({ name: 'Acme' });
    await normalized.update?.mutateAsync({
      id: 'supplier-1',
      name: 'Acme',
      options: { silent: true },
    });
    await normalized.delete?.mutateAsync('supplier-1');

    expect(createSupplier.mutateAsync.mock.calls[0]?.[0]).toEqual({
      name: 'Acme',
    });
    expect(updateSupplier.mutateAsync.mock.calls[0]?.[0]).toEqual({
      id: 'supplier-1',
      data: { name: 'Acme' },
      options: { silent: true },
    });
    expect(deleteSupplier.mutateAsync.mock.calls[0]?.[0]).toBe('supplier-1');
  });

  it('uses flat update payloads for generic mutation providers', async () => {
    const updateMutation = vi.fn(async (payload: unknown) => payload);

    const normalized = toNormalizedMutations({
      createMutation: {
        mutateAsync: vi.fn(async (payload: unknown) => payload),
      },
      updateMutation: {
        mutateAsync: updateMutation,
      },
    });

    await normalized.update?.mutateAsync({
      id: 'category-1',
      name: 'Analgesik',
      options: { silent: true },
    });

    expect(updateMutation.mock.calls[0]?.[0]).toEqual({
      id: 'category-1',
      name: 'Analgesik',
      options: { silent: true },
    });
  });

  it('reads mutation state from state-only handles', () => {
    const error = new Error('first');

    expect(anyPending({ isPending: false }, { isLoading: true })).toBe(true);
    expect(firstError({ error }, { error: new Error('second') })).toBe(error);
    expect(firstError()).toBeNull();
  });
});
