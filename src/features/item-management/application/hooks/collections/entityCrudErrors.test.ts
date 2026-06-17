import { describe, expect, it } from 'vite-plus/test';
import {
  getEntityCrudErrorMessage,
  isDuplicateEntityCodeError,
  isForeignKeyReferenceError,
  toEntityCrudError,
} from './entityCrudErrors';

describe('entityCrudErrors', () => {
  it('preserves entity CRUD error message normalization', () => {
    expect(
      getEntityCrudErrorMessage({
        code: 'PGRST123',
        message: 'Database rejected the request',
      })
    ).toBe('Database rejected the request');

    expect(getEntityCrudErrorMessage(new Error('Runtime failure'))).toBe(
      'Runtime failure'
    );
    expect(getEntityCrudErrorMessage('Plain failure')).toBe('Plain failure');
    expect(getEntityCrudErrorMessage(null)).toBe('Unknown error');
    expect(getEntityCrudErrorMessage({ message: 'missing code' })).toBe(
      'Unknown error'
    );
  });

  it('detects duplicate code variants used by entity CRUD operations', () => {
    expect(
      isDuplicateEntityCodeError({
        code: '23505',
        message: 'duplicate key value violates unique constraint',
      })
    ).toBe(true);

    expect(
      isDuplicateEntityCodeError({
        code: 'PGRST409',
        message: 'conflict',
        details: 'code already exists',
      })
    ).toBe(true);

    expect(isDuplicateEntityCodeError('409 conflict')).toBe(true);
    expect(isDuplicateEntityCodeError('network unavailable')).toBe(false);
  });

  it('normalizes mutation state errors to Error instances', () => {
    const runtimeError = new Error('Runtime failure');

    expect(toEntityCrudError(null)).toBeNull();
    expect(toEntityCrudError(runtimeError)).toBe(runtimeError);
    expect(
      toEntityCrudError({
        code: 'PGRST123',
        message: 'Database rejected the request',
      })?.message
    ).toBe('Database rejected the request');
    expect(toEntityCrudError('Plain failure')?.message).toBe('Plain failure');
  });

  it('detects foreign-key delete failures only from Error instances', () => {
    expect(
      isForeignKeyReferenceError(new Error('violates foreign key constraint'))
    ).toBe(true);
    expect(isForeignKeyReferenceError(new Error('still referenced'))).toBe(
      true
    );
    expect(isForeignKeyReferenceError('violates foreign key constraint')).toBe(
      false
    );
  });
});
