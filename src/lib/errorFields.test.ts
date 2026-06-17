import { describe, expect, it } from 'vite-plus/test';
import {
  getErrorCode,
  getErrorStringField,
  hasErrorStringFields,
} from './errorFields';

describe('error field helpers', () => {
  it('reads string fields from error-like objects', () => {
    const error = {
      message: 'database rejected the request',
      code: '23505',
      details: 'code already exists',
      hint: '',
    };

    expect(getErrorStringField(error, 'message')).toBe(
      'database rejected the request'
    );
    expect(getErrorStringField(error, 'details')).toBe('code already exists');
  });

  it('reads string and numeric error codes', () => {
    expect(getErrorCode({ code: 'PGRST116' })).toBe('PGRST116');
    expect(getErrorCode({ code: 401 })).toBe(401);
  });

  it('checks required string fields as a group', () => {
    expect(
      hasErrorStringFields(
        {
          message: 'database rejected the request',
          code: '23505',
          details: 'code already exists',
          hint: '',
        },
        ['message', 'code', 'details', 'hint']
      )
    ).toBe(true);
    expect(
      hasErrorStringFields({ message: 'database rejected the request' }, [
        'message',
        'code',
      ])
    ).toBe(false);
  });

  it('returns null for missing or non-string fields', () => {
    expect(getErrorStringField({ message: 401 }, 'message')).toBeNull();
    expect(getErrorStringField(null, 'message')).toBeNull();
    expect(getErrorCode({ code: false })).toBeNull();
  });
});
