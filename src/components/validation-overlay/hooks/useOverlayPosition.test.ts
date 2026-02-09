import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { POSITION_OFFSET } from '../constants';
import { useOverlayPosition } from './useOverlayPosition';

const createTargetRef = (rect: Partial<DOMRect> = {}) => {
  const element = document.createElement('input');
  Object.defineProperty(element, 'getBoundingClientRect', {
    value: () => ({
      top: 80,
      left: 120,
      right: 320,
      bottom: 110,
      width: 200,
      height: 30,
      x: 120,
      y: 80,
      toJSON: () => ({}),
      ...rect,
    }),
  });

  return { current: element } as React.RefObject<HTMLElement | null>;
};

describe('useOverlayPosition', () => {
  it('computes overlay position when error is visible and input is present', () => {
    const targetRef = createTargetRef();

    const { result } = renderHook(() =>
      useOverlayPosition({
        showError: true,
        error: 'Required',
        targetRef,
        isOpen: false,
      })
    );

    expect(result.current).toEqual({
      top: 110 + POSITION_OFFSET,
      left: 120,
      width: 200,
    });
  });

  it('returns null when requirements are not met', () => {
    const missingRef = { current: null } as React.RefObject<HTMLElement | null>;
    const targetRef = createTargetRef();

    const { result, rerender } = renderHook(
      ({
        showError,
        error,
        ref,
        isOpen,
      }: {
        showError: boolean;
        error: string | null;
        ref: React.RefObject<HTMLElement | null>;
        isOpen: boolean;
      }) =>
        useOverlayPosition({
          showError,
          error,
          targetRef: ref,
          isOpen,
        }),
      {
        initialProps: {
          showError: false,
          error: 'Required',
          ref: targetRef,
          isOpen: false,
        },
      }
    );

    expect(result.current).toBeNull();

    rerender({
      showError: true,
      error: null,
      ref: targetRef,
      isOpen: false,
    });
    expect(result.current).toBeNull();

    rerender({
      showError: true,
      error: 'Required',
      ref: missingRef,
      isOpen: false,
    });
    expect(result.current).toBeNull();

    rerender({
      showError: true,
      error: 'Required',
      ref: targetRef,
      isOpen: true,
    });
    expect(result.current).toBeNull();
  });
});
