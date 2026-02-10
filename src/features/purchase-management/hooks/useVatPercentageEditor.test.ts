import { act, renderHook } from '@testing-library/react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useVatPercentageEditor } from './useVatPercentageEditor';

describe('useVatPercentageEditor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('starts editing and focuses/selects input after delay', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useVatPercentageEditor({ initialValue: 11, onChange })
    );

    const focus = vi.fn();
    const select = vi.fn();

    act(() => {
      result.current.inputRef.current = {
        focus,
        select,
      } as unknown as HTMLInputElement;
      result.current.startEditing();
    });

    expect(result.current.isEditing).toBe(true);
    expect(result.current.tempValue).toBe('11');

    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(focus).toHaveBeenCalledTimes(1);
    expect(select).toHaveBeenCalledTimes(1);
  });

  it('stops editing and clamps numeric value to 100', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useVatPercentageEditor({ initialValue: 0, onChange })
    );

    act(() => {
      result.current.startEditing();
    });

    act(() => {
      result.current.handleChange({
        target: { value: '120' },
      } as ChangeEvent<HTMLInputElement>);
    });

    act(() => {
      result.current.stopEditing();
    });

    expect(result.current.isEditing).toBe(false);
    expect(onChange).toHaveBeenCalledWith(100);
  });

  it('ignores invalid numeric input and handles Enter/Escape', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useVatPercentageEditor({ initialValue: 5, onChange })
    );

    act(() => {
      result.current.startEditing();
    });

    act(() => {
      result.current.handleChange({
        target: { value: 'abc' },
      } as ChangeEvent<HTMLInputElement>);
    });

    act(() => {
      result.current.handleKeyDown({ key: 'Enter' } as KeyboardEvent);
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(result.current.isEditing).toBe(false);

    act(() => {
      result.current.startEditing();
    });

    act(() => {
      result.current.handleChange({
        target: { value: '17.5' },
      } as ChangeEvent<HTMLInputElement>);
    });

    act(() => {
      result.current.handleKeyDown({ key: 'Escape' } as KeyboardEvent);
    });

    expect(onChange).toHaveBeenCalledWith(17.5);
  });

  it('does not fail when input ref is absent and ignores unrelated keys', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useVatPercentageEditor({ initialValue: 9, onChange })
    );

    act(() => {
      result.current.startEditing();
      vi.advanceTimersByTime(10);
      result.current.handleKeyDown({ key: 'ArrowRight' } as KeyboardEvent);
    });

    expect(result.current.isEditing).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
  });
});
