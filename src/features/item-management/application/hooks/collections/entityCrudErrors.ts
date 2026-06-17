import { getErrorStringField, hasErrorStringFields } from '@/lib/errorFields';

interface PostgrestLikeError {
  message: string;
  code: string;
  details?: string | null;
}

const isPostgrestLikeError = (error: unknown): error is PostgrestLikeError => {
  return hasErrorStringFields(error, ['message', 'code']);
};

export const getEntityCrudErrorMessage = (error: unknown): string => {
  if (isPostgrestLikeError(error)) return error.message;
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
};

export const toEntityCrudError = (error: unknown): Error | null => {
  if (!error) return null;
  if (error instanceof Error) return error;
  return new Error(getEntityCrudErrorMessage(error));
};

const getEntityCrudErrorDetails = (error: unknown): string => {
  return isPostgrestLikeError(error)
    ? (getErrorStringField(error, 'details') ?? '')
    : '';
};

const getEntityCrudErrorCode = (error: unknown): string => {
  return isPostgrestLikeError(error)
    ? (getErrorStringField(error, 'code') ?? '')
    : '';
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
