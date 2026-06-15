import type { QueryClient, QueryKey } from '@tanstack/react-query';

export type QueryKeySet = readonly QueryKey[];

export const invalidateQueryKeys = (
  queryClient: QueryClient,
  queryKeys: QueryKeySet
) =>
  Promise.all(
    queryKeys.map(queryKey => queryClient.invalidateQueries({ queryKey }))
  );

export const refetchQueryKeys = (
  queryClient: QueryClient,
  queryKeys: QueryKeySet
) =>
  Promise.all(
    queryKeys.map(queryKey => queryClient.refetchQueries({ queryKey }))
  );
