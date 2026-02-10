import { act, renderHook } from '@testing-library/react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useInlineEditor } from './useInlineEditor';

describe('useInlineEditor', () => {
  it('starts editing and syncs value from latest initial value', () => {
    const onSave = vi.fn();

    const { result, rerender } = renderHook(
      ({ initialValue }) => useInlineEditor({ initialValue, onSave }),
      {
        initialProps: { initialValue: '10' },
      }
    );

    act(() => {
      result.current.startEditing();
    });

    expect(result.current.isEditing).toBe(true);
    expect(result.current.value).toBe('10');

    rerender({ initialValue: '25' });

    act(() => {
      result.current.startEditing();
    });

    expect(result.current.value).toBe('25');
  });

  it('saves numeric values and ignores invalid values', () => {
    const onSave = vi.fn();
    const { result } = renderHook(() =>
      useInlineEditor({ initialValue: 0, onSave })
    );

    act(() => {
      result.current.startEditing();
    });

    act(() => {
      result.current.handleChange({
        target: { value: '44.5' },
      } as ChangeEvent<HTMLInputElement>);
    });

    act(() => {
      result.current.stopEditing();
    });

    expect(result.current.isEditing).toBe(false);
    expect(onSave).toHaveBeenCalledWith(44.5);

    act(() => {
      result.current.startEditing();
    });

    act(() => {
      result.current.handleChange({
        target: { value: 'invalid' },
      } as ChangeEvent<HTMLInputElement>);
    });

    act(() => {
      result.current.stopEditing();
    });

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('handles cancel and keyboard Enter/Escape behavior', () => {
    const onSave = vi.fn();
    const { result } = renderHook(() =>
      useInlineEditor({ initialValue: '12', onSave })
    );

    act(() => {
      result.current.startEditing();
      result.current.handleChange({
        target: { value: '30' },
      } as ChangeEvent<HTMLInputElement>);
      result.current.cancelEditing();
    });

    expect(result.current.isEditing).toBe(false);
    expect(result.current.value).toBe('12');

    const preventDefaultEnter = vi.fn();
    act(() => {
      result.current.startEditing();
    });

    act(() => {
      result.current.handleChange({
        target: { value: '99' },
      } as ChangeEvent<HTMLInputElement>);
    });

    act(() => {
      result.current.handleKeyDown({
        key: 'Enter',
        preventDefault: preventDefaultEnter,
      } as unknown as KeyboardEvent<HTMLInputElement>);
    });

    expect(preventDefaultEnter).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(99);

    const preventDefaultEscape = vi.fn();
    act(() => {
      result.current.startEditing();
    });

    act(() => {
      result.current.handleChange({
        target: { value: '101' },
      } as ChangeEvent<HTMLInputElement>);
    });

    act(() => {
      result.current.handleKeyDown({
        key: 'Escape',
        preventDefault: preventDefaultEscape,
      } as unknown as KeyboardEvent<HTMLInputElement>);
    });

    expect(preventDefaultEscape).toHaveBeenCalledTimes(1);
    expect(result.current.value).toBe('12');

    const preventDefaultTab = vi.fn();
    act(() => {
      result.current.handleKeyDown({
        key: 'Tab',
        preventDefault: preventDefaultTab,
      } as unknown as KeyboardEvent<HTMLInputElement>);
    });
    expect(preventDefaultTab).not.toHaveBeenCalled();
  });
});
