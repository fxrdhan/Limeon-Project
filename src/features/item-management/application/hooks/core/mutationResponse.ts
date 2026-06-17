type MutationOperation = 'create' | 'update';

export const requireMutationResponseData = <TEntity>(
  data: TEntity | null | undefined,
  {
    entityDisplayName,
    operation,
  }: {
    entityDisplayName: string;
    operation: MutationOperation;
  }
) => {
  if (data == null) {
    throw new Error(
      `${operation} response for ${entityDisplayName} is missing data.`
    );
  }

  return data;
};
