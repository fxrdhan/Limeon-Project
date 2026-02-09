import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useKeyboardHandler } from './useKeyboardHandler';

describe('useKeyboardHandler', () => {
  it('calls onChange with toggled value when Enter is pressed and enabled', () => {
    const onChange = vi.fn();
    const preventDefault = vi.fn();

    const { result } = renderHook(() =>
      useKeyboardHandler({
        disabled: false,
        checked: false,
        onChange,
      })
    );

    act(() => {
      result.current.handleKeyDown({
        key: 'Enter',
        preventDefault,
      } as unknown as React.KeyboardEvent<HTMLLabelElement>);
    });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('ignores non-Enter keys and disabled state', () => {
    const onChange = vi.fn();
    const preventDefault = vi.fn();

    const { result, rerender } = renderHook(
      ({ disabled }) =>
        useKeyboardHandler({
          disabled,
          checked: true,
          onChange,
        }),
      { initialProps: { disabled: false } }
    );

    act(() => {
      result.current.handleKeyDown({
        key: 'Space',
        preventDefault,
      } as unknown as React.KeyboardEvent<HTMLLabelElement>);
    });

    rerender({ disabled: true });

    act(() => {
      result.current.handleKeyDown({
        key: 'Enter',
        preventDefault,
      } as unknown as React.KeyboardEvent<HTMLLabelElement>);
    });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });
});
