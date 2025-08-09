import { useEffect, useRef, useCallback } from 'react';

interface ComparisonData {
  isKodeDifferent?: boolean;
  isNameDifferent?: boolean;
  isDescriptionDifferent?: boolean;
}

interface UseAutoScrollProps {
  isOpen: boolean;
  kodeRef: React.RefObject<HTMLDivElement | null>;
  nameRef: React.RefObject<HTMLDivElement | null>;
  descriptionRef: React.RefObject<HTMLDivElement | null>;
  compData: ComparisonData | null;
}

export const useAutoScroll = ({
  isOpen,
  kodeRef,
  nameRef,
  descriptionRef,
  compData,
}: UseAutoScrollProps) => {
  const userIsScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Track user scroll activity
  const handleScroll = useCallback(() => {
    userIsScrollingRef.current = true;
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Reset user scrolling flag after user stops scrolling
    scrollTimeoutRef.current = setTimeout(() => {
      userIsScrollingRef.current = false;
    }, 2000);
  }, []);

  // Add scroll listeners to containers
  useEffect(() => {
    if (!isOpen) return;

    const containers = [
      kodeRef.current,
      nameRef.current, 
      descriptionRef.current
    ].filter(Boolean);

    containers.forEach(container => {
      container?.addEventListener('scroll', handleScroll);
    });

    return () => {
      containers.forEach(container => {
        container?.removeEventListener('scroll', handleScroll);
      });
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [isOpen, handleScroll, kodeRef, nameRef, descriptionRef]);

  // Simple rule: if description has diff -> auto scroll
  useEffect(() => {
    if (!isOpen) return;
    if (!compData?.isDescriptionDifferent) return;
    if (userIsScrollingRef.current) return;

    const scrollToFirstHighlight = (retryCount = 0) => {
      if (!descriptionRef.current || userIsScrollingRef.current) return;
      
      const highlightedElement = descriptionRef.current.querySelector(
        '.bg-green-400, .bg-red-400'
      );

      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        });
      } else if (retryCount < 8) {
        // Retry for equal->diff transitions where AnimatePresence needs time
        setTimeout(
          () => scrollToFirstHighlight(retryCount + 1),
          150 + retryCount * 50
        );
      }
    };

    // Wait for AnimatePresence transition (300ms) + buffer
    const timer = setTimeout(() => scrollToFirstHighlight(), 400);
    return () => clearTimeout(timer);
  }, [isOpen, compData?.isDescriptionDifferent, descriptionRef]);

  // Reset user scrolling flag when modal closes
  useEffect(() => {
    if (!isOpen) {
      userIsScrollingRef.current = false;
    }
  }, [isOpen]);
};
