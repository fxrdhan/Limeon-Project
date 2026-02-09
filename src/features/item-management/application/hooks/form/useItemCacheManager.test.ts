import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CACHE_KEY } from '../../../constants';
import { useItemCacheManager } from './useItemCacheManager';

const { mockUseFormCache } = vi.hoisted(() => ({
  mockUseFormCache: vi.fn(),
}));

vi.mock('@/hooks/forms/useFormCache', () => ({
  useFormCache: mockUseFormCache,
}));

describe('useItemCacheManager', () => {
  it('delegates cache initialization to useFormCache with current form state', () => {
    const cacheResult = {
      saveToCache: vi.fn(),
      loadFromCache: vi.fn(),
      clearCache: vi.fn(),
      updateCacheWithSearchQuery: vi.fn(),
    };
    mockUseFormCache.mockReturnValue(cacheResult);

    const conversions = [{ id: 'conv-1' }] as never;
    const isDirty = vi.fn().mockReturnValue(true);

    const { result } = renderHook(() =>
      useItemCacheManager({
        formState: {
          isEditMode: false,
          saving: true,
          isDirty,
          formData: {} as never,
        },
        conversions,
      })
    );

    expect(mockUseFormCache).toHaveBeenCalledTimes(1);
    expect(mockUseFormCache).toHaveBeenCalledWith({
      cacheKey: CACHE_KEY,
      isEditMode: false,
      isDirty: expect.any(Function),
      isSaving: true,
    });

    const options = mockUseFormCache.mock.calls[0][0];
    expect(options.isDirty()).toBe(true);
    expect(isDirty).toHaveBeenCalledWith(conversions);

    expect(result.current).toBe(cacheResult);
  });
});
