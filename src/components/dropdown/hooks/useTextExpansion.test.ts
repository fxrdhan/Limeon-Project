import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTextExpansion } from './useTextExpansion';

const shouldTruncateTextMock = vi.hoisted(() => vi.fn());

vi.mock('@/utils/text', () => ({
  shouldTruncateText: shouldTruncateTextMock,
}));

const createButtonRef = () => {
  const button = document.createElement('button');
  Object.defineProperty(button, 'getBoundingClientRect', {
    value: () => ({
      width: 180,
      top: 0,
      left: 0,
      right: 180,
      bottom: 40,
      height: 40,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  });
  return { current: button };
};

describe('useTextExpansion', () => {
  beforeEach(() => {
    shouldTruncateTextMock.mockReset();
  });

  it('expands and collapses text states when truncation is possible', () => {
    shouldTruncateTextMock.mockReturnValue(true);

    const buttonRef = createButtonRef();

    const { result, rerender } = renderHook(
      ({ isOpen }: { isOpen: boolean }) =>
        useTextExpansion({
          buttonRef,
          selectedOption: { id: 'opt-1', name: 'Nama Sangat Panjang' },
          isOpen,
        }),
      {
        initialProps: { isOpen: true },
      }
    );

    expect(result.current.canExpand).toBe(true);

    act(() => {
      result.current.handleExpansion('opt-1', 'Nama Sangat Panjang', true);
      result.current.handleButtonExpansion(true);
      result.current.handleExpansionChange(true);
    });

    expect(result.current.expandedId).toBe('opt-1');
    expect(result.current.isButtonTextExpanded).toBe(true);
    expect(result.current.isExpanded).toBe(true);

    act(() => {
      result.current.handleExpansion('opt-1', 'Nama Sangat Panjang', false);
    });

    expect(result.current.expandedId).toBeNull();

    rerender({ isOpen: false });

    expect(result.current.isExpanded).toBe(false);
    expect(result.current.isButtonTextExpanded).toBe(false);
    expect(result.current.expandedId).toBeNull();
  });

  it('keeps expansion disabled when truncation is not needed', () => {
    shouldTruncateTextMock.mockReturnValue(false);

    const { result } = renderHook(() =>
      useTextExpansion({
        buttonRef: createButtonRef(),
        selectedOption: { id: 'opt-2', name: 'Pendek' },
        isOpen: true,
      })
    );

    expect(result.current.canExpand).toBe(false);

    act(() => {
      result.current.handleButtonExpansion(true);
      result.current.handleExpansionChange(true);
      result.current.handleExpansion('opt-2', 'Pendek', true);
    });

    expect(result.current.isButtonTextExpanded).toBe(false);
    expect(result.current.isExpanded).toBe(false);
    expect(result.current.expandedId).toBeNull();
  });

  it('returns safe defaults when selected option or button ref is missing', () => {
    shouldTruncateTextMock.mockReturnValue(true);

    const { result } = renderHook(() =>
      useTextExpansion({
        buttonRef: { current: null },
        selectedOption: undefined,
        isOpen: true,
      })
    );

    expect(result.current.canExpand).toBe(false);

    act(() => {
      result.current.handleExpansion('x', 'Any', true);
      result.current.handleButtonExpansion(true);
      result.current.handleExpansionChange(true);
    });

    expect(result.current.expandedId).toBeNull();
    expect(result.current.isButtonTextExpanded).toBe(false);
    expect(result.current.isExpanded).toBe(false);
  });
});
