import { useState, useEffect, useRef } from 'react';

interface UseCacheFirstLoadingOptions {
  isLoading: boolean;
  hasData: boolean;
  isInitialLoad?: boolean;
  minSkeletonTime?: number;
  gracePeriod?: number;
  tabKey?: string; // For detecting tab changes
}

interface UseCacheFirstLoadingReturn {
  showSkeleton: boolean;
  showBackgroundLoading: boolean;
  isFirstLoad: boolean;
  shouldSuppressOverlay: boolean;
}

/**
 * Smart loading state management for cache-first UX
 * - First load: Show skeleton
 * - Subsequent loads with cached data: Show data immediately + background loading indicator
 * - Subsequent loads without cache: Show skeleton
 */
export const useCacheFirstLoading = ({
  isLoading,
  hasData,
  isInitialLoad = true,
  minSkeletonTime = 300,
  gracePeriod = 150,
  tabKey,
}: UseCacheFirstLoadingOptions): UseCacheFirstLoadingReturn => {
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [showBackgroundLoading, setShowBackgroundLoading] = useState(false);
  // Use getDerivedStateFromProps to track hasData and manage isFirstLoad
  const [firstLoadState, setFirstLoadState] = useState({
    hasData,
    isFirstLoad: isInitialLoad,
  });
  if (hasData !== firstLoadState.hasData && hasData) {
    setFirstLoadState({ hasData, isFirstLoad: false });
  } else if (hasData !== firstLoadState.hasData) {
    setFirstLoadState(prev => ({ ...prev, hasData }));
  }
  const isFirstLoad = firstLoadState.isFirstLoad;
  const [shouldSuppressOverlay, setShouldSuppressOverlay] =
    useState(isInitialLoad);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasDataRef = useRef(hasData);
  const prevTabKeyRef = useRef(tabKey);
  const isTabChangingRef = useRef(false);

  // Track tab changes - optimized for realtime
  useEffect(() => {
    if (tabKey && prevTabKeyRef.current && tabKey !== prevTabKeyRef.current) {
      // Tab is changing - suppress skeleton and overlay for realtime data
      isTabChangingRef.current = true;

      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setShowSkeleton(false); // Never show skeleton on tab change for realtime
        setShouldSuppressOverlay(true);
      }, 0);

      // Reset tab changing flag after brief delay
      const tabChangeTimer = setTimeout(() => {
        isTabChangingRef.current = false;
        // For realtime, allow overlay only if no data after reasonable wait
        if (!hasData) {
          setShouldSuppressOverlay(false);
        }
      }, gracePeriod * 3); // Longer suppression for realtime data to settle

      prevTabKeyRef.current = tabKey;

      return () => clearTimeout(tabChangeTimer);
    } else if (tabKey) {
      prevTabKeyRef.current = tabKey;
    }
  }, [tabKey, gracePeriod, hasData]);

  // isFirstLoad auto-updates when hasData changes (getDerivedStateFromProps pattern)
  useEffect(() => {
    if (hasData && !hasDataRef.current) {
      hasDataRef.current = true;
    }
  }, [hasData]);

  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (isLoading) {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        // Always suppress overlay during loading
        setShouldSuppressOverlay(true);

        // Don't show skeleton if tab is changing (realtime scenario)
        if (isTabChangingRef.current) {
          setShowSkeleton(false);
          setShowBackgroundLoading(true);
        } else if (isFirstLoad || !hasDataRef.current) {
          // First load or no cached data - show skeleton
          setShowSkeleton(true);
          setShowBackgroundLoading(false);
        } else {
          // Subsequent load with cached data - show background loading
          setShowSkeleton(false);
          setShowBackgroundLoading(true);
        }
      }, 0);
    } else {
      // Loading finished - use grace period to prevent flash of empty content
      if (showSkeleton) {
        if (hasData) {
          // Data is available - hide skeleton with normal delay
          timerRef.current = setTimeout(() => {
            setShowSkeleton(false);
            if (!isTabChangingRef.current) {
              setShouldSuppressOverlay(false);
            }
          }, minSkeletonTime);
        } else {
          // No data yet - wait grace period before checking again
          timerRef.current = setTimeout(() => {
            // After grace period, still check if data appeared
            if (hasData) {
              setShowSkeleton(false);
              if (!isTabChangingRef.current) {
                setShouldSuppressOverlay(false);
              }
            } else {
              // Still no data after grace period - show empty state
              timerRef.current = setTimeout(() => {
                setShowSkeleton(false);
                if (!isTabChangingRef.current) {
                  setShouldSuppressOverlay(false);
                }
              }, minSkeletonTime - gracePeriod);
            }
          }, gracePeriod);
        }
      } else {
        // Use setTimeout to avoid synchronous setState in effect
        setTimeout(() => {
          // Hide background loading immediately
          setShowBackgroundLoading(false);
          // For background loading, allow overlay if no data
          if (!hasData) {
            // Still suppress overlay briefly to prevent flash
            timerRef.current = setTimeout(() => {
              if (!isTabChangingRef.current) {
                setShouldSuppressOverlay(false);
              }
            }, gracePeriod);
          } else {
            if (!isTabChangingRef.current) {
              setShouldSuppressOverlay(false);
            }
          }
        }, 0);
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    isLoading,
    isFirstLoad,
    showSkeleton,
    hasData,
    minSkeletonTime,
    gracePeriod,
  ]);

  return {
    showSkeleton,
    showBackgroundLoading,
    isFirstLoad,
    shouldSuppressOverlay,
  };
};
