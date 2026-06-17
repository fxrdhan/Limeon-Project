export type ErrorStringField = 'message' | 'code' | 'details' | 'hint';
export type ErrorCode = string | number;

const isErrorRecord = (error: unknown): error is Record<string, unknown> =>
  typeof error === 'object' && error !== null;

export const getErrorStringField = (
  error: unknown,
  field: ErrorStringField
): string | null => {
  if (!isErrorRecord(error)) {
    return null;
  }

  const value = error[field];
  return typeof value === 'string' ? value : null;
};

export const hasErrorStringFields = <TField extends ErrorStringField>(
  error: unknown,
  fields: readonly TField[]
): error is Record<TField, string> & Record<string, unknown> => {
  if (!isErrorRecord(error)) {
    return false;
  }

  return fields.every(field => typeof error[field] === 'string');
};

export const getErrorCode = (error: unknown): ErrorCode | null => {
  if (!isErrorRecord(error)) {
    return null;
  }

  const value = error.code;
  return typeof value === 'string' || typeof value === 'number' ? value : null;
};
