import type { PostgrestError } from '@supabase/supabase-js';

export const isPostgrestError = (err: unknown): err is PostgrestError => {
  return (
    typeof err === 'object' && err !== null && 'message' in err && 'code' in err
  );
};

export const getMasterDataErrorMessage = (error: unknown) => {
  return (
    (isPostgrestError(error)
      ? error.message
      : typeof error === 'string'
        ? error
        : String(error)) || 'Unknown error'
  );
};

export const getMasterDataErrorDetails = (error: unknown) => {
  return isPostgrestError(error) ? (error.details ?? '') : '';
};

export const getMasterDataErrorCode = (error: unknown) => {
  return isPostgrestError(error) ? (error.code ?? '') : '';
};

export const isDuplicateCodeError = (error: unknown) => {
  const errorMessage = getMasterDataErrorMessage(error);
  const errorDetails = getMasterDataErrorDetails(error);
  const errorCode = getMasterDataErrorCode(error);

  return (
    errorCode === '23505' ||
    errorMessage.includes('unique constraint') ||
    errorMessage.includes('duplicate key value') ||
    errorMessage.includes('violates unique constraint') ||
    errorDetails.includes('already exists') ||
    errorMessage.includes('already exists') ||
    (errorMessage.includes('409') && errorMessage.includes('conflict'))
  );
};

export const isForeignKeyDeleteError = (error: unknown) => {
  return (
    error instanceof Error &&
    (error.message.includes('foreign key constraint') ||
      error.message.includes('violates foreign key') ||
      error.message.includes('still referenced'))
  );
};
