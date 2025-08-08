import React, { useEffect } from 'react';
import type { VersionData } from '../../../../shared/types';

interface ComparisonData {
  isKodeDifferent?: boolean;
  isNameDifferent?: boolean;
  isDescriptionDifferent?: boolean;
}

interface UseOverflowDetectionProps {
  isOpen: boolean;
  isFlipped: boolean;
  selectedVersion?: VersionData;
  versionA?: VersionData;
  versionB?: VersionData;
  kodeRef: React.RefObject<HTMLDivElement | null>;
  nameRef: React.RefObject<HTMLDivElement | null>;
  descriptionRef: React.RefObject<HTMLDivElement | null>;
  compData: ComparisonData | null;
}

export const useOverflowDetection = ({
  isOpen,
  isFlipped,
  selectedVersion,
  versionA,
  versionB,
  kodeRef,
  nameRef,
  descriptionRef,
  compData,
}: UseOverflowDetectionProps) => {
  const [overflowStates, setOverflowStates] = React.useState({
    kode: false,
    name: false,
    description: false,
  });

  // Function to check if element overflows
  const checkOverflow = (element: HTMLElement | null) => {
    if (!element) return false;
    return element.scrollHeight > element.clientHeight;
  };

  // Update overflow states when content changes
  useEffect(() => {
    if (!isOpen) return;

    const updateOverflowStates = () => {
      setOverflowStates({
        kode: checkOverflow(kodeRef.current),
        name: checkOverflow(nameRef.current),
        description: checkOverflow(descriptionRef.current),
      });
    };

    // Check overflow after content is rendered
    const timer = setTimeout(updateOverflowStates, 100);

    // Also check on resize
    window.addEventListener('resize', updateOverflowStates);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateOverflowStates);
    };
  }, [
    isOpen,
    isFlipped,
    selectedVersion?.version_number,
    versionA?.version_number,
    versionB?.version_number,
    kodeRef,
    nameRef,
    descriptionRef,
  ]);

  // Update overflow states when modal opens or content changes (must be before early return)
  useEffect(() => {
    if (!isOpen) return;

    const updateOverflowStatesWithRetry = (retryCount = 0) => {
      const updateOverflowStates = () => {
        setOverflowStates({
          kode: checkOverflow(kodeRef.current),
          name: checkOverflow(nameRef.current),
          description: checkOverflow(descriptionRef.current),
        });
      };

      // For equal->diff transitions, we need to wait for AnimatePresence to mount elements
      const hasAnyDiff =
        compData?.isKodeDifferent ||
        compData?.isNameDifferent ||
        compData?.isDescriptionDifferent;

      if (hasAnyDiff) {
        // Check if refs are available (elements are mounted)
        const refsReady =
          (compData?.isKodeDifferent ? kodeRef.current : true) &&
          (compData?.isNameDifferent ? nameRef.current : true) &&
          (compData?.isDescriptionDifferent ? descriptionRef.current : true);

        if (!refsReady && retryCount < 5) {
          // Retry with increasing delay for AnimatePresence mounting
          setTimeout(
            () => updateOverflowStatesWithRetry(retryCount + 1),
            100 + retryCount * 50
          );
          return;
        }
      }

      updateOverflowStates();
    };

    // Initial delay, then retry mechanism for equal->diff transitions
    const timer = setTimeout(() => updateOverflowStatesWithRetry(), 200);

    return () => clearTimeout(timer);
  }, [
    isOpen,
    isFlipped,
    selectedVersion?.version_number,
    versionA?.version_number,
    versionB?.version_number,
    // Also trigger when diff content status changes (equal <-> diff)
    compData?.isKodeDifferent,
    compData?.isNameDifferent,
    compData?.isDescriptionDifferent,
    kodeRef,
    nameRef,
    descriptionRef,
    compData,
  ]);

  return {
    overflowStates,
    checkOverflow,
  };
};
