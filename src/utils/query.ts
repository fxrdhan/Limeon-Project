import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryKey,
  UseQueryOptions,
  UseMutationOptions,
  MutationFunction,
  MutationFunctionContext,
} from '@tanstack/react-query';

export function useSupabaseQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
>(
  key: QueryKey,
  fetcher: () => Promise<TQueryFnData>,
  options: Omit<
    UseQueryOptions<TQueryFnData, TError, TData, QueryKey>,
    'queryKey' | 'queryFn'
  > = {}
) {
  return useQuery({
    queryKey: Array.isArray(key) ? key : [key],
    queryFn: fetcher,
    ...options,
  });
}

export function useSupabaseMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  key: QueryKey | string,
  mutationFn: MutationFunction<TData, TVariables>,
  options: Omit<
    UseMutationOptions<TData, TError, TVariables, TContext>,
    'mutationFn'
  > = {}
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    ...options,
    onSuccess: (
      data: TData,
      variables: TVariables,
      context: TContext | undefined,
      functionContext: MutationFunctionContext
    ) => {
      const keyToInvalidate = Array.isArray(key) ? key : [key];

      // Immediate cache invalidation and refetch for better responsiveness
      queryClient.invalidateQueries({ queryKey: keyToInvalidate });
      queryClient.refetchQueries({
        queryKey: keyToInvalidate,
        type: 'active',
      });

      if (options?.onSuccess && context !== undefined) {
        options.onSuccess(data, variables, context, functionContext);
      }
    },
  });
}
