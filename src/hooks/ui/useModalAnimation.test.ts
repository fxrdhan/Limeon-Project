import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useModalAnimation } from './useModalAnimation';

describe('useModalAnimation', () => {
  it('returns animation variants and triggers onClose only when closing', () => {
    const onClose = vi.fn();

    const { result, rerender } = renderHook(
      ({ isClosing }) => useModalAnimation({ isClosing, onClose }),
      { initialProps: { isClosing: false } }
    );

    expect(result.current.backdropVariants).toEqual({
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
    });
    expect(result.current.modalVariants).toEqual({
      hidden: { scale: 0.95, opacity: 0 },
      visible: { scale: 1, opacity: 1 },
    });
    expect(result.current.contentVariants).toEqual({
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
    });
    expect(onClose).not.toHaveBeenCalled();

    rerender({ isClosing: true });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
