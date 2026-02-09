import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { useFieldValidation } from './useFieldValidation';

describe('useFieldValidation', () => {
  it('validates on blur by default and supports clear/force actions', () => {
    const schema = z.string().min(3, 'Minimal 3 karakter');
    const { result } = renderHook(
      ({ value }: { value: unknown }) =>
        useFieldValidation({
          schema,
          value,
        }),
      { initialProps: { value: 'ab' } }
    );

    expect(result.current.validation).toMatchObject({
      isValid: true,
      error: null,
      showError: false,
    });

    act(() => {
      result.current.handleBlur();
    });
    expect(result.current.validation).toMatchObject({
      isValid: false,
      error: 'Minimal 3 karakter',
      showError: true,
    });

    act(() => {
      result.current.clearError();
    });
    expect(result.current.validation).toMatchObject({
      isValid: false,
      error: 'Minimal 3 karakter',
      showError: false,
    });

    act(() => {
      result.current.forceValidate();
    });
    expect(result.current.validation.showError).toBe(true);
  });

  it('skips blur validation when showOnBlur is false', () => {
    const schema = z.string().email('Email tidak valid');
    const { result } = renderHook(() =>
      useFieldValidation({
        schema,
        value: 'not-an-email',
        showOnBlur: false,
      })
    );

    act(() => {
      result.current.handleBlur();
    });

    expect(result.current.validation).toMatchObject({
      isValid: true,
      error: null,
      showError: false,
    });
  });

  it('marks field valid after value becomes correct and forceValidate is called', () => {
    const schema = z.number().min(10, 'Minimum 10');
    const { result, rerender } = renderHook(
      ({ value }: { value: unknown }) =>
        useFieldValidation({
          schema,
          value,
        }),
      { initialProps: { value: 5 } }
    );

    act(() => {
      result.current.forceValidate();
    });
    expect(result.current.validation).toMatchObject({
      isValid: false,
      error: 'Minimum 10',
      showError: true,
    });

    rerender({ value: 12 });
    act(() => {
      result.current.forceValidate();
    });
    expect(result.current.validation).toMatchObject({
      isValid: true,
      error: null,
      showError: false,
    });
  });
});
