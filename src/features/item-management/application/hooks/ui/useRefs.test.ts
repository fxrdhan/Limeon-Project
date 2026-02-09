import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useAddItemRefs } from './useRefs';

describe('useAddItemRefs', () => {
  it('returns stable refs initialized to null', () => {
    const { result, rerender } = renderHook(() => useAddItemRefs());

    const firstDescriptionRef = result.current.descriptionRef;
    const firstMarginRef = result.current.marginInputRef;
    const firstMinStockRef = result.current.minStockInputRef;

    expect(firstDescriptionRef.current).toBeNull();
    expect(firstMarginRef.current).toBeNull();
    expect(firstMinStockRef.current).toBeNull();

    rerender();

    expect(result.current.descriptionRef).toBe(firstDescriptionRef);
    expect(result.current.marginInputRef).toBe(firstMarginRef);
    expect(result.current.minStockInputRef).toBe(firstMinStockRef);
  });
});
