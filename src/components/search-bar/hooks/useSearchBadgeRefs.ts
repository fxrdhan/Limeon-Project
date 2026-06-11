import { useCallback, useRef, type RefObject } from 'react';

export const useSearchBadgeRefs = () => {
  const badgeRefsMap = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const badgesContainerRef = useRef<HTMLDivElement>(null);
  const lazyRefsCache = useRef<Map<string, RefObject<HTMLDivElement | null>>>(
    new Map()
  );

  const getBadgeRef = useCallback((badgeId: string): HTMLDivElement | null => {
    return badgeRefsMap.current.get(badgeId) || null;
  }, []);

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

  const getColumnRef = useCallback(
    (conditionIndex: number): HTMLDivElement | null => {
      return getBadgeRef(`condition-${conditionIndex}-column`);
    },
    [getBadgeRef]
  );

  const getOperatorRef = useCallback(
    (conditionIndex: number): HTMLDivElement | null => {
      return getBadgeRef(`condition-${conditionIndex}-operator`);
    },
    [getBadgeRef]
  );

  const getJoinRef = useCallback(
    (joinIndex: number): HTMLDivElement | null => {
      return getBadgeRef(`join-${joinIndex}`);
    },
    [getBadgeRef]
  );

  const getLazyColumnRef = useCallback(
    (conditionIndex: number): RefObject<HTMLDivElement | null> => {
      const cacheKey = `column-${conditionIndex}`;
      if (lazyRefsCache.current.has(cacheKey)) {
        return lazyRefsCache.current.get(cacheKey)!;
      }

      const lazyRef = {
        get current() {
          return getColumnRef(conditionIndex);
        },
      } as RefObject<HTMLDivElement | null>;

      lazyRefsCache.current.set(cacheKey, lazyRef);
      return lazyRef;
    },
    [getColumnRef]
  );

  const getLazyOperatorRef = useCallback(
    (conditionIndex: number): RefObject<HTMLDivElement | null> => {
      const cacheKey = `operator-${conditionIndex}`;
      if (lazyRefsCache.current.has(cacheKey)) {
        return lazyRefsCache.current.get(cacheKey)!;
      }

      const lazyRef = {
        get current() {
          return getOperatorRef(conditionIndex);
        },
      } as RefObject<HTMLDivElement | null>;

      lazyRefsCache.current.set(cacheKey, lazyRef);
      return lazyRef;
    },
    [getOperatorRef]
  );

  const getLazyJoinRef = useCallback(
    (joinIndex: number): RefObject<HTMLDivElement | null> => {
      const cacheKey = `join-${joinIndex}`;
      if (lazyRefsCache.current.has(cacheKey)) {
        return lazyRefsCache.current.get(cacheKey)!;
      }

      const lazyRef = {
        get current() {
          return getJoinRef(joinIndex);
        },
      } as RefObject<HTMLDivElement | null>;

      lazyRefsCache.current.set(cacheKey, lazyRef);
      return lazyRef;
    },
    [getJoinRef]
  );

  const getLazyBadgeRef = useCallback(
    (badgeId: string): RefObject<HTMLDivElement | null> => {
      const cacheKey = `badge-${badgeId}`;
      if (lazyRefsCache.current.has(cacheKey)) {
        return lazyRefsCache.current.get(cacheKey)!;
      }

      const lazyRef = {
        get current() {
          return getBadgeRef(badgeId);
        },
      } as RefObject<HTMLDivElement | null>;

      lazyRefsCache.current.set(cacheKey, lazyRef);
      return lazyRef;
    },
    [getBadgeRef]
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
    getLazyBadgeRef,
  };
};
