/**
 * Badge Refs Hook
 *
 * Extracted from useSearchInput.ts to manage badge ref system.
 * Provides dynamic ref map for N-condition support and lazy refs for selector positioning.
 */

import { useCallback, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * Badge ID format for scalable ref system:
 * - Column: condition-{index}-column
 * - Operator: condition-{index}-operator
 * - Join: join-{index}
 * - Value: condition-{index}-value or condition-{index}-value-{from|to}
 */

export interface UseBadgeRefsReturn {
  // Raw ref accessors
  getBadgeRef: (badgeId: string) => HTMLDivElement | null;
  setBadgeRef: (badgeId: string, element: HTMLDivElement | null) => void;

  // Typed ref accessors
  getColumnRef: (conditionIndex: number) => HTMLDivElement | null;
  getOperatorRef: (conditionIndex: number) => HTMLDivElement | null;
  getJoinRef: (joinIndex: number) => HTMLDivElement | null;

  // Container ref
  badgesContainerRef: React.RefObject<HTMLDivElement | null>;

  // Lazy refs for selector positioning (stable across renders)
  getLazyColumnRef: (
    conditionIndex: number
  ) => React.RefObject<HTMLDivElement | null>;
  getLazyOperatorRef: (
    conditionIndex: number
  ) => React.RefObject<HTMLDivElement | null>;
  getLazyJoinRef: (joinIndex: number) => React.RefObject<HTMLDivElement | null>;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useBadgeRefs(): UseBadgeRefsReturn {
  // ========== Dynamic Ref Map ==========
  // Map<badgeId, HTMLDivElement | null>
  const badgeRefsMap = useRef<Map<string, HTMLDivElement | null>>(new Map());

  /**
   * Get ref for a badge by ID
   */
  const getBadgeRef = useCallback((badgeId: string): HTMLDivElement | null => {
    return badgeRefsMap.current.get(badgeId) || null;
  }, []);

  /**
   * Set ref for a badge by ID (used as callback ref)
   */
  const setBadgeRef = useCallback(
    (badgeId: string, element: HTMLDivElement | null) => {
      if (element) {
        badgeRefsMap.current.set(badgeId, element);
      } else {
        badgeRefsMap.current.delete(badgeId);
      }
    },
    []
  );

  // ========== Typed Ref Helpers ==========
  /**
   * Get column badge ref by condition index
   */
  const getColumnRef = useCallback(
    (conditionIndex: number): HTMLDivElement | null => {
      return getBadgeRef(`condition-${conditionIndex}-column`);
    },
    [getBadgeRef]
  );

  /**
   * Get operator badge ref by condition index
   */
  const getOperatorRef = useCallback(
    (conditionIndex: number): HTMLDivElement | null => {
      return getBadgeRef(`condition-${conditionIndex}-operator`);
    },
    [getBadgeRef]
  );

  /**
   * Get join badge ref by index (join-0 = between condition 0 and 1)
   */
  const getJoinRef = useCallback(
    (joinIndex: number): HTMLDivElement | null => {
      return getBadgeRef(`join-${joinIndex}`);
    },
    [getBadgeRef]
  );

  // ========== Container Ref ==========
  // Used for measuring the total width of all badges combined
  const badgesContainerRef = useRef<HTMLDivElement>(null);

  // ========== Generalized Lazy Ref System ==========
  // Cache for lazy refs to ensure stability across renders
  const lazyRefsCache = useRef<
    Map<string, React.RefObject<HTMLDivElement | null>>
  >(new Map());

  /**
   * Creates a "lazy ref" that looks up the element from the badge map on access.
   * This is required for Selector components that expect a React.RefObject.
   * Stability is GUARANTEED by the lazyRefsCache to avoid infinite re-render loops.
   */
  const getLazyColumnRef = useCallback(
    (conditionIndex: number): React.RefObject<HTMLDivElement | null> => {
      const cacheKey = `column-${conditionIndex}`;
      if (lazyRefsCache.current.has(cacheKey)) {
        return lazyRefsCache.current.get(cacheKey)!;
      }

      const lazyRef = {
        get current() {
          return getColumnRef(conditionIndex);
        },
      } as React.RefObject<HTMLDivElement | null>;

      lazyRefsCache.current.set(cacheKey, lazyRef);
      return lazyRef;
    },
    [getColumnRef]
  );

  const getLazyOperatorRef = useCallback(
    (conditionIndex: number): React.RefObject<HTMLDivElement | null> => {
      const cacheKey = `operator-${conditionIndex}`;
      if (lazyRefsCache.current.has(cacheKey)) {
        return lazyRefsCache.current.get(cacheKey)!;
      }

      const lazyRef = {
        get current() {
          return getOperatorRef(conditionIndex);
        },
      } as React.RefObject<HTMLDivElement | null>;

      lazyRefsCache.current.set(cacheKey, lazyRef);
      return lazyRef;
    },
    [getOperatorRef]
  );

  const getLazyJoinRef = useCallback(
    (joinIndex: number): React.RefObject<HTMLDivElement | null> => {
      const cacheKey = `join-${joinIndex}`;
      if (lazyRefsCache.current.has(cacheKey)) {
        return lazyRefsCache.current.get(cacheKey)!;
      }

      const lazyRef = {
        get current() {
          return getJoinRef(joinIndex);
        },
      } as React.RefObject<HTMLDivElement | null>;

      lazyRefsCache.current.set(cacheKey, lazyRef);
      return lazyRef;
    },
    [getJoinRef]
  );

  return {
    getBadgeRef,
    setBadgeRef,
    getColumnRef,
    getOperatorRef,
    getJoinRef,
    badgesContainerRef,
    getLazyColumnRef,
    getLazyOperatorRef,
    getLazyJoinRef,
  };
}
