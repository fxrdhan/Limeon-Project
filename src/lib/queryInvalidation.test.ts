import { describe, expect, it, vi } from 'vite-plus/test';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { invalidateQueryKeys, refetchQueryKeys } from './queryInvalidation';

const createQueryClientMock = () => {
  const invalidateQueries = vi.fn().mockResolvedValue(undefined);
  const refetchQueries = vi.fn().mockResolvedValue(undefined);
  const queryClient = {
    invalidateQueries,
    refetchQueries,
  } as unknown as QueryClient;

  return {
    invalidateQueries,
    queryClient,
    refetchQueries,
  };
};

describe('query invalidation helpers', () => {
  it('invalidates every query key in a key set separately', async () => {
    const { invalidateQueries, queryClient } = createQueryClientMock();
    const queryKeys: readonly QueryKey[] = [['items'], ['dashboard']];

    await invalidateQueryKeys(queryClient, queryKeys);

    expect(invalidateQueries).toHaveBeenCalledTimes(2);
    expect(invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: queryKeys[0],
    });
    expect(invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: queryKeys[1],
    });
  });

  it('refetches every query key in a key set separately', async () => {
    const { queryClient, refetchQueries } = createQueryClientMock();
    const queryKeys: readonly QueryKey[] = [['items'], ['dashboard']];

    await refetchQueryKeys(queryClient, queryKeys);

    expect(refetchQueries).toHaveBeenCalledTimes(2);
    expect(refetchQueries).toHaveBeenNthCalledWith(1, {
      queryKey: queryKeys[0],
    });
    expect(refetchQueries).toHaveBeenNthCalledWith(2, {
      queryKey: queryKeys[1],
    });
  });
});
