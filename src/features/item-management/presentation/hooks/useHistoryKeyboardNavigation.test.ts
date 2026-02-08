import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useHistoryKeyboardNavigation } from './useHistoryKeyboardNavigation';

describe('useHistoryKeyboardNavigation', () => {
  const items = [
    { id: 'v1', version: 1 },
    { id: 'v2', version: 2 },
    { id: 'v3', version: 3 },
  ];

  it('does not navigate when disabled or items are empty', () => {
    const onNavigate = vi.fn();

    renderHook(() =>
      useHistoryKeyboardNavigation({
        items: null,
        enabled: false,
        getCurrentIndex: () => -1,
        onNavigate,
      })
    );

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));

    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('starts from first item when there is no active selection', () => {
    const onNavigate = vi.fn();

    renderHook(() =>
      useHistoryKeyboardNavigation({
        items,
        enabled: true,
        getCurrentIndex: () => -1,
        onNavigate,
      })
    );

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));

    expect(onNavigate).toHaveBeenCalledWith(items[0], 0);
  });

  it('wraps around for ArrowDown and ArrowUp', () => {
    const onNavigate = vi.fn();

    const { rerender } = renderHook(
      ({ index }) =>
        useHistoryKeyboardNavigation({
          items,
          enabled: true,
          getCurrentIndex: () => index,
          onNavigate,
        }),
      { initialProps: { index: 2 } }
    );

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(onNavigate).toHaveBeenCalledWith(items[0], 0);

    rerender({ index: 0 });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(onNavigate).toHaveBeenCalledWith(items[2], 2);
  });

  it('ignores keyboard events from input fields by default', () => {
    const onNavigate = vi.fn();

    renderHook(() =>
      useHistoryKeyboardNavigation({
        items,
        enabled: true,
        getCurrentIndex: () => 1,
        onNavigate,
      })
    );

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
    );
    document.body.removeChild(input);

    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('respects shouldIgnoreEvent override', () => {
    const onNavigate = vi.fn();

    renderHook(() =>
      useHistoryKeyboardNavigation({
        items,
        enabled: true,
        getCurrentIndex: () => 0,
        onNavigate,
        shouldIgnoreEvent: e => e.key === 'ArrowDown',
      })
    );

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(onNavigate).not.toHaveBeenCalled();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(onNavigate).toHaveBeenCalledWith(items[2], 2);
  });
});
