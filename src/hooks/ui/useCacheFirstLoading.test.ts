import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCacheFirstLoading } from './useCacheFirstLoading';

const flushTimers = async (ms = 0) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('useCacheFirstLoading', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('shows skeleton on first load and hides it after minimum skeleton time', async () => {
    const { result, rerender } = renderHook(
      ({ isLoading, hasData }) =>
        useCacheFirstLoading({
          isLoading,
          hasData,
          isInitialLoad: true,
          minSkeletonTime: 300,
          gracePeriod: 100,
        }),
      {
        initialProps: {
          isLoading: true,
          hasData: false,
        },
      }
    );

    await flushTimers(0);

    expect(result.current.showSkeleton).toBe(true);
    expect(result.current.showBackgroundLoading).toBe(false);
    expect(result.current.isFirstLoad).toBe(true);
    expect(result.current.shouldSuppressOverlay).toBe(true);

    rerender({ isLoading: false, hasData: true });
    await flushTimers(300);

    expect(result.current.showSkeleton).toBe(false);
    expect(result.current.shouldSuppressOverlay).toBe(false);
  });

  it('uses background loading for subsequent loads with cached data', async () => {
    const { result, rerender } = renderHook(
      ({ isLoading, hasData }) =>
        useCacheFirstLoading({
          isLoading,
          hasData,
          isInitialLoad: false,
          minSkeletonTime: 200,
          gracePeriod: 80,
        }),
      {
        initialProps: {
          isLoading: true,
          hasData: true,
        },
      }
    );

    await flushTimers(0);

    expect(result.current.showSkeleton).toBe(false);
    expect(result.current.showBackgroundLoading).toBe(true);
    expect(result.current.isFirstLoad).toBe(false);

    rerender({ isLoading: false, hasData: true });
    await flushTimers(0);

    expect(result.current.showBackgroundLoading).toBe(false);
    expect(result.current.shouldSuppressOverlay).toBe(false);
  });

  it('suppresses overlay and skeleton during tab change transitions', async () => {
    const { result, rerender } = renderHook(
      ({ isLoading, hasData, tabKey }) =>
        useCacheFirstLoading({
          isLoading,
          hasData,
          isInitialLoad: false,
          minSkeletonTime: 300,
          gracePeriod: 100,
          tabKey,
        }),
      {
        initialProps: {
          isLoading: false,
          hasData: false,
          tabKey: 'purchases',
        },
      }
    );

    rerender({ isLoading: true, hasData: false, tabKey: 'sales' });
    await flushTimers(0);

    expect(result.current.showSkeleton).toBe(false);
    expect(result.current.shouldSuppressOverlay).toBe(true);

    await flushTimers(300);
    expect(result.current.shouldSuppressOverlay).toBe(false);
  });

  it('releases overlay after grace period when no data exists', async () => {
    const { result, rerender } = renderHook(
      ({ isLoading, hasData }) =>
        useCacheFirstLoading({
          isLoading,
          hasData,
          isInitialLoad: false,
          minSkeletonTime: 300,
          gracePeriod: 120,
        }),
      {
        initialProps: {
          isLoading: true,
          hasData: true,
        },
      }
    );

    await flushTimers(0);
    expect(result.current.showBackgroundLoading).toBe(true);

    rerender({ isLoading: false, hasData: false });

    await flushTimers(0);
    expect(result.current.showBackgroundLoading).toBe(false);
    expect(result.current.shouldSuppressOverlay).toBe(true);

    await flushTimers(120);
    expect(result.current.shouldSuppressOverlay).toBe(false);
  });
});
