import { useEffect } from 'react';
import type { VersionData } from '../../../../shared/types';

interface ComparisonData {
  isKodeDifferent?: boolean;
  isNameDifferent?: boolean;
  isDescriptionDifferent?: boolean;
}

interface UseAutoScrollProps {
  isOpen: boolean;
  isFlipped: boolean;
  selectedVersion?: VersionData;
  versionA?: VersionData;
  versionB?: VersionData;
  kodeRef: React.RefObject<HTMLDivElement | null>;
  nameRef: React.RefObject<HTMLDivElement | null>;
  descriptionRef: React.RefObject<HTMLDivElement | null>;
  checkOverflow: (element: HTMLElement | null) => boolean;
  compData: ComparisonData | null;
}

export const useAutoScroll = ({
  isOpen,
  isFlipped,
  selectedVersion,
  versionA,
  versionB,
  kodeRef,
  nameRef,
  descriptionRef,
  checkOverflow,
  compData,
}: UseAutoScrollProps) => {
  // Auto-scroll to first highlighted text EVERY TIME content changes (must be before early returns)
  useEffect(() => {
    // Only run when modal is actually opened
    if (!isOpen) return;

    const scrollToFirstHighlight = (
      container: HTMLDivElement | null,
      retryCount = 0
    ) => {
      if (!container) return;

      // Use multiple requestAnimationFrame for better timing - especially for equal->diff transitions
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Find first highlighted element (either added or removed text)
            const highlightedElement = container.querySelector(
              '.bg-green-400, .bg-red-400'
            );

            if (highlightedElement) {
              // Smooth scroll to first highlight - no jarring reset to top
              highlightedElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest',
              });
            } else if (retryCount < 8) {
              // Retry if highlighted elements not found yet (useful for equal->diff transitions)
              setTimeout(
                () => scrollToFirstHighlight(container, retryCount + 1),
                150 + retryCount * 100 // Increased delay with progressive backoff
              );
            }
          });
        });
      });
    };

    // Longer delay to ensure DOM is fully updated with new content and highlights
    const timer = setTimeout(() => {
      // Priority order: description (usually longest), name, then kode
      // Only scroll if container actually overflows (is scrollable)
      if (descriptionRef.current && checkOverflow(descriptionRef.current)) {
        scrollToFirstHighlight(descriptionRef.current);
      } else if (nameRef.current && checkOverflow(nameRef.current)) {
        scrollToFirstHighlight(nameRef.current);
      } else if (kodeRef.current && checkOverflow(kodeRef.current)) {
        scrollToFirstHighlight(kodeRef.current);
      }
    }, 200);

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
    checkOverflow,
  ]); // Trigger on content changes - retry mechanism handles equal->diff transitions
};
