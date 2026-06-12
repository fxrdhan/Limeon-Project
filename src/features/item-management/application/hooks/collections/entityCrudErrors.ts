interface PostgrestLikeError {
  message: string;
  code: string;
  details?: string | null;
}

const isPostgrestLikeError = (error: unknown): error is PostgrestLikeError => {
  if (typeof error !== 'object' || error === null) return false;
  const record = error as Record<string, unknown>;
  return typeof record.message === 'string' && typeof record.code === 'string';
};

export const getEntityCrudErrorMessage = (error: unknown): string => {
  if (isPostgrestLikeError(error)) return error.message;
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
};

const getEntityCrudErrorDetails = (error: unknown): string => {
  return isPostgrestLikeError(error) ? (error.details ?? '') : '';
};

const getEntityCrudErrorCode = (error: unknown): string => {
  return isPostgrestLikeError(error) ? error.code : '';
};

export const isDuplicateEntityCodeError = (error: unknown): boolean => {
  const errorMessage = getEntityCrudErrorMessage(error);
  const errorDetails = getEntityCrudErrorDetails(error);
  const errorCode = getEntityCrudErrorCode(error);

  return (
    errorCode === '23505' ||
    errorMessage.includes('duplicate key value') ||
    errorMessage.includes('violates unique constraint') ||
    errorDetails.includes('already exists') ||
    errorMessage.includes('already exists') ||
    (errorMessage.includes('409') && errorMessage.includes('conflict'))
  );
};

export const isForeignKeyReferenceError = (error: unknown): boolean => {
  return (
    error instanceof Error &&
    (error.message.includes('foreign key constraint') ||
      error.message.includes('violates foreign key') ||
      error.message.includes('still referenced'))
  );
};
