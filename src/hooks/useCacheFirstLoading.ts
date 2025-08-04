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
  const [isFirstLoad, setIsFirstLoad] = useState(isInitialLoad);
  const [shouldSuppressOverlay, setShouldSuppressOverlay] = useState(isInitialLoad);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasDataRef = useRef(hasData);
  const prevTabKeyRef = useRef(tabKey);
  const isTabChangingRef = useRef(false);
  
  // Track tab changes
  useEffect(() => {
    if (tabKey && prevTabKeyRef.current && tabKey !== prevTabKeyRef.current) {
      // Tab is changing - just suppress overlay briefly to prevent flash
      isTabChangingRef.current = true;
      setShouldSuppressOverlay(true);
      
      // Reset tab changing flag after brief delay
      const tabChangeTimer = setTimeout(() => {
        isTabChangingRef.current = false;
        // Only allow overlay to show if still no data after tab change stabilizes
        if (!hasData) {
          setShouldSuppressOverlay(false);
        }
      }, gracePeriod * 2); // Brief suppression for tab changes
      
      prevTabKeyRef.current = tabKey;
      
      return () => clearTimeout(tabChangeTimer);
    } else if (tabKey) {
      prevTabKeyRef.current = tabKey;
    }
  }, [tabKey, gracePeriod, hasData]);

  // Track if we've ever had data (for cache detection)
  useEffect(() => {
    if (hasData && !hasDataRef.current) {
      hasDataRef.current = true;
      setIsFirstLoad(false);
    }
  }, [hasData]);

  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (isLoading) {
      // Always suppress overlay during loading
      setShouldSuppressOverlay(true);
      
      if (isFirstLoad || !hasDataRef.current) {
        // First load or no cached data - show skeleton
        setShowSkeleton(true);
        setShowBackgroundLoading(false);
      } else {
        // Subsequent load with cached data - show background loading
        setShowSkeleton(false);
        setShowBackgroundLoading(true);
      }
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
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isLoading, isFirstLoad, showSkeleton, hasData, minSkeletonTime, gracePeriod]);

  return {
    showSkeleton,
    showBackgroundLoading,
    isFirstLoad,
    shouldSuppressOverlay,
  };
};