import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFormCache } from './useFormCache';

describe('useFormCache', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('saves, loads, updates, and clears cache data', () => {
    const { result } = renderHook(() =>
      useFormCache({
        cacheKey: 'item-form-cache',
        isEditMode: false,
        isDirty: () => true,
        isSaving: false,
      })
    );

    const formData = {
      name: 'Paracetamol',
      code: 'PCM-001',
    } as never;
    const conversions = [
      {
        conversion_rate: 10,
      },
    ] as never;

    act(() => {
      result.current.saveToCache(formData, conversions);
    });

    const loaded = result.current.loadFromCache();
    expect(loaded).not.toBeNull();
    expect(loaded?.formData).toEqual(formData);
    expect(loaded?.conversions).toEqual(conversions);

    const updated = result.current.updateCacheWithSearchQuery(
      loaded as NonNullable<typeof loaded>,
      'Amoxicillin'
    );
    expect((updated.formData as { name: string }).name).toBe('Amoxicillin');

    const unchanged = result.current.updateCacheWithSearchQuery(
      loaded as NonNullable<typeof loaded>
    );
    expect(unchanged).toEqual(loaded);

    act(() => {
      result.current.clearCache();
    });
    expect(sessionStorage.getItem('item-form-cache')).toBeNull();
  });

  it('returns null when cache value is missing or invalid', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    sessionStorage.setItem('item-form-cache', '{invalid-json');

    const { result } = renderHook(() =>
      useFormCache({
        cacheKey: 'item-form-cache',
        isEditMode: false,
        isDirty: () => false,
        isSaving: false,
      })
    );

    expect(result.current.loadFromCache()).toBeNull();
    expect(warnSpy).toHaveBeenCalled();

    sessionStorage.removeItem('item-form-cache');
    expect(result.current.loadFromCache()).toBeNull();
  });

  it('handles storage access errors gracefully', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('set failed');
      });
    const getItemSpy = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('get failed');
      });
    const removeItemSpy = vi
      .spyOn(Storage.prototype, 'removeItem')
      .mockImplementation(() => {
        throw new Error('remove failed');
      });

    const { result } = renderHook(() =>
      useFormCache({
        cacheKey: 'item-form-cache',
        isEditMode: true,
        isDirty: () => false,
        isSaving: true,
      })
    );

    act(() => {
      result.current.saveToCache({ name: 'X' } as never, [] as never);
      result.current.clearCache();
    });

    expect(result.current.loadFromCache()).toBeNull();
    expect(setItemSpy).toHaveBeenCalled();
    expect(getItemSpy).toHaveBeenCalled();
    expect(removeItemSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });
});
