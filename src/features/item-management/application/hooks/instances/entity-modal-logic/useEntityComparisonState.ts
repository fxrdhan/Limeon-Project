import { useCallback, useEffect, useRef, useState } from 'react';
import type { VersionData } from '../../../../shared/contexts/EntityModalContext';

export type ComparisonData = {
  isOpen: boolean;
  isClosing: boolean;
  selectedVersion: VersionData | undefined;
  isDualMode: boolean;
  versionA: VersionData | undefined;
  versionB: VersionData | undefined;
  isFlipped: boolean;
};

const createClosedComparisonData = (): ComparisonData => ({
  isOpen: false,
  isClosing: false,
  selectedVersion: undefined,
  isDualMode: false,
  versionA: undefined,
  versionB: undefined,
  isFlipped: false,
});

export const useEntityComparisonState = (isOpen: boolean) => {
  const resetTimerRef = useRef<number | null>(null);
  const [comparisonState, setComparisonState] = useState<{
    modalOpen: boolean;
    data: ComparisonData;
  }>({
    modalOpen: false,
    data: createClosedComparisonData(),
  });

  const clearResetTimer = useCallback(() => {
    if (resetTimerRef.current === null) {
      return;
    }

    window.clearTimeout(resetTimerRef.current);
    resetTimerRef.current = null;
  }, []);

  if (
    isOpen !== comparisonState.modalOpen &&
    !isOpen &&
    comparisonState.data.isOpen
  ) {
    setComparisonState({
      modalOpen: isOpen,
      data: createClosedComparisonData(),
    });
  } else if (isOpen !== comparisonState.modalOpen) {
    setComparisonState(prev => ({ ...prev, modalOpen: isOpen }));
  }

  const setComparisonData = useCallback(
    (updater: ComparisonData | ((prev: ComparisonData) => ComparisonData)) => {
      setComparisonState(prev => ({
        ...prev,
        data: typeof updater === 'function' ? updater(prev.data) : updater,
      }));
    },
    []
  );

  const resetComparisonData = useCallback(() => {
    setComparisonData(createClosedComparisonData());
  }, [setComparisonData]);

  const openComparison = useCallback(
    (version: VersionData) => {
      clearResetTimer();
      setComparisonData({
        isOpen: true,
        isClosing: false,
        selectedVersion: version,
        isDualMode: false,
        versionA: undefined,
        versionB: undefined,
        isFlipped: false,
      });
    },
    [clearResetTimer, setComparisonData]
  );

  const openDualComparison = useCallback(
    (versionA: VersionData, versionB: VersionData) => {
      clearResetTimer();
      setComparisonData({
        isOpen: true,
        isClosing: false,
        selectedVersion: undefined,
        isDualMode: true,
        versionA,
        versionB,
        isFlipped: false,
      });
    },
    [clearResetTimer, setComparisonData]
  );

  const flipVersions = useCallback(() => {
    setComparisonData(prev => ({
      ...prev,
      isFlipped: !prev.isFlipped,
    }));
  }, [setComparisonData]);

  const closeComparison = useCallback(() => {
    clearResetTimer();
    setComparisonData(prev => ({
      ...prev,
      isClosing: true,
    }));

    resetTimerRef.current = window.setTimeout(() => {
      resetTimerRef.current = null;
      resetComparisonData();
    }, 250);
  }, [clearResetTimer, resetComparisonData, setComparisonData]);

  useEffect(() => clearResetTimer, [clearResetTimer]);

  return {
    comparisonData: comparisonState.data,
    setComparisonData,
    resetComparisonData,
    openComparison,
    closeComparison,
    openDualComparison,
    flipVersions,
  };
};
