import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MutationFunctionContext } from '@tanstack/react-query';
import { useSupabaseQuery, useSupabaseMutation } from './query';

const useQueryMock = vi.hoisted(() => vi.fn());
const useMutationMock = vi.hoisted(() => vi.fn());
const useQueryClientMock = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: useMutationMock,
  useQueryClient: useQueryClientMock,
}));

describe('query helpers', () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    useMutationMock.mockReset();
    useQueryClientMock.mockReset();
  });

  it('normalizes query key to array', () => {
    useQueryMock.mockReturnValue({ data: 'ok' });

    const result = useSupabaseQuery('items', async () => 'data');

    expect(result).toEqual({ data: 'ok' });
    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['items'] })
    );

    useSupabaseQuery(['items', 'detail'], async () => 'data');
    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['items', 'detail'] })
    );
  });

  it('invalidates and refetches on mutation success', () => {
    const invalidateQueries = vi.fn();
    const refetchQueries = vi.fn();
    useQueryClientMock.mockReturnValue({ invalidateQueries, refetchQueries });

    const onSuccessMock = vi.fn();

    useMutationMock.mockImplementation(config => config);

    const config = useSupabaseMutation('items', vi.fn(), {
      onSuccess: onSuccessMock,
    }) as unknown as { onSuccess: (...args: unknown[]) => void };

    const context = { note: 'ctx' };
    config.onSuccess('data', 'vars', context, {} as MutationFunctionContext);

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['items'] });
    expect(refetchQueries).toHaveBeenCalledWith({
      queryKey: ['items'],
      type: 'active',
    });
    expect(onSuccessMock).toHaveBeenCalled();

    onSuccessMock.mockClear();
    config.onSuccess('data', 'vars', undefined, {} as MutationFunctionContext);
    expect(onSuccessMock).not.toHaveBeenCalled();
  });

  it('invalidates when no onSuccess is provided', () => {
    const invalidateQueries = vi.fn();
    const refetchQueries = vi.fn();
    useQueryClientMock.mockReturnValue({ invalidateQueries, refetchQueries });

    useMutationMock.mockImplementation(config => config);

    const config = useSupabaseMutation('items', vi.fn()) as unknown as {
      onSuccess: (...args: unknown[]) => void;
    };

    config.onSuccess('data', 'vars', {}, {} as MutationFunctionContext);

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['items'] });
  });

  it('supports array query keys for mutations', () => {
    const invalidateQueries = vi.fn();
    const refetchQueries = vi.fn();
    useQueryClientMock.mockReturnValue({ invalidateQueries, refetchQueries });

    useMutationMock.mockImplementation(config => config);

    const config = useSupabaseMutation(
      ['items', 'detail'],
      vi.fn()
    ) as unknown as {
      onSuccess: (...args: unknown[]) => void;
    };

    config.onSuccess('data', 'vars', {}, {} as MutationFunctionContext);

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['items', 'detail'],
    });
  });
});
