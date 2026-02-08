import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDropdownValidation } from './useDropdownValidation';

const flushMicrotasks = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('useDropdownValidation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('validates required field, handles overlay auto-hide state, and closes manually', async () => {
    const { result } = renderHook(() =>
      useDropdownValidation({
        validate: true,
        required: true,
        value: '',
        showValidationOnBlur: true,
        validationAutoHide: true,
        validationAutoHideDelay: 200,
      })
    );

    act(() => {
      result.current.setTouched(true);
      result.current.setShowValidationOverlay(true);
    });

    await flushMicrotasks();

    expect(result.current.hasError).toBe(true);
    expect(result.current.errorMessage).toBe('Pilihan harus diisi');
    expect(result.current.validateDropdown()).toBe(false);

    act(() => {
      result.current.handleValidationAutoHide();
    });

    expect(result.current.showValidationOverlay).toBe(false);
    expect(result.current.hasAutoHidden).toBe(true);

    act(() => {
      result.current.handleCloseValidation();
    });

    expect(result.current.hasError).toBe(false);
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.hasAutoHidden).toBe(false);
  });

  it('clears validation when value becomes valid and cleans timer on unmount', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    const { result, rerender, unmount } = renderHook(
      ({ value }: { value: string }) =>
        useDropdownValidation({
          validate: true,
          required: true,
          value,
          showValidationOnBlur: true,
          validationAutoHide: true,
          validationAutoHideDelay: 150,
        }),
      {
        initialProps: { value: '' },
      }
    );

    act(() => {
      result.current.setTouched(true);
    });

    await flushMicrotasks();

    expect(result.current.hasError).toBe(true);

    rerender({ value: 'Kategori A' });

    await flushMicrotasks();

    expect(result.current.hasError).toBe(false);
    expect(result.current.errorMessage).toBeNull();

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('returns valid immediately when validation is disabled', () => {
    const { result } = renderHook(() =>
      useDropdownValidation({
        validate: false,
        required: false,
        value: '',
      })
    );

    expect(result.current.validateDropdown()).toBe(true);
    expect(result.current.hasError).toBe(false);
    expect(result.current.errorMessage).toBeNull();
  });
});
