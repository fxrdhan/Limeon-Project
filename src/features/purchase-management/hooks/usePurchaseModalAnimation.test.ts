import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePurchaseModalAnimation } from './usePurchaseModalAnimation';

describe('usePurchaseModalAnimation', () => {
  it('returns the expected modal animation variants', () => {
    const { result } = renderHook(() => usePurchaseModalAnimation());

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
  });
});
