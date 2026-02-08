import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOverflowDetection } from './useOverflowDetection';

const setHeights = (
  element: HTMLElement,
  { scrollHeight, clientHeight }: { scrollHeight: number; clientHeight: number }
) => {
  Object.defineProperty(element, 'scrollHeight', {
    configurable: true,
    value: scrollHeight,
  });
  Object.defineProperty(element, 'clientHeight', {
    configurable: true,
    value: clientHeight,
  });
};

describe('useOverflowDetection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('computes overflow states and refreshes on resize', () => {
    const codeElement = document.createElement('div');
    const nameElement = document.createElement('div');
    const descriptionElement = document.createElement('div');

    setHeights(codeElement, { scrollHeight: 200, clientHeight: 100 });
    setHeights(nameElement, { scrollHeight: 90, clientHeight: 100 });
    setHeights(descriptionElement, { scrollHeight: 220, clientHeight: 120 });

    const refs = {
      kodeRef: {
        current: codeElement,
      } as React.RefObject<HTMLDivElement | null>,
      nameRef: {
        current: nameElement,
      } as React.RefObject<HTMLDivElement | null>,
      descriptionRef: {
        current: descriptionElement,
      } as React.RefObject<HTMLDivElement | null>,
    };

    const { result } = renderHook(() =>
      useOverflowDetection({
        isOpen: true,
        isFlipped: false,
        compData: {
          isKodeDifferent: true,
          isNameDifferent: true,
          isDescriptionDifferent: true,
        },
        ...refs,
      })
    );

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.overflowStates).toEqual({
      code: true,
      name: false,
      description: true,
    });

    setHeights(nameElement, { scrollHeight: 150, clientHeight: 100 });
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current.overflowStates.name).toBe(true);
    expect(result.current.checkOverflow(null)).toBe(false);
  });

  it('keeps safe defaults when modal is closed or refs are unavailable', () => {
    const refs = {
      kodeRef: { current: null } as React.RefObject<HTMLDivElement | null>,
      nameRef: { current: null } as React.RefObject<HTMLDivElement | null>,
      descriptionRef: {
        current: null,
      } as React.RefObject<HTMLDivElement | null>,
    };

    const { result, rerender } = renderHook(
      ({ isOpen }: { isOpen: boolean }) =>
        useOverflowDetection({
          isOpen,
          isFlipped: false,
          compData: {
            isKodeDifferent: true,
            isNameDifferent: false,
            isDescriptionDifferent: false,
          },
          ...refs,
        }),
      { initialProps: { isOpen: false } }
    );

    expect(result.current.overflowStates).toEqual({
      code: false,
      name: false,
      description: false,
    });

    rerender({ isOpen: true });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.overflowStates).toEqual({
      code: false,
      name: false,
      description: false,
    });
  });
});
