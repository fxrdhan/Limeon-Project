import { useEffect, useState, useCallback, useRef } from 'react';

interface ScrollPosition {
  isAtTop: boolean;
  isAtBottom: boolean;
}

interface UseScrollPositionProps {
  elementRef: React.RefObject<HTMLElement | null>;
  isOpen: boolean;
}

export const useScrollPosition = ({
  elementRef,
  isOpen,
}: UseScrollPositionProps) => {
  const [scrollPosition, setScrollPosition] = useState<ScrollPosition>({
    isAtTop: true,
    isAtBottom: true,
  });

  const rafRef = useRef<number | undefined>(undefined);

  const checkScrollPosition = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      const element = elementRef.current;
      if (!element) return;

      const { scrollTop, scrollHeight, clientHeight } = element;
      const threshold = 2; // 2px threshold for better precision

      const newPosition = {
        isAtTop: scrollTop <= threshold,
        isAtBottom: scrollTop >= scrollHeight - clientHeight - threshold,
      };

      // Only update if values actually changed to prevent unnecessary renders
      setScrollPosition(prev => {
        if (
          prev.isAtTop !== newPosition.isAtTop ||
          prev.isAtBottom !== newPosition.isAtBottom
        ) {
          return newPosition;
        }
        return prev;
      });
    });
  }, [elementRef]);

  useEffect(() => {
    if (!isOpen) {
      setScrollPosition({ isAtTop: true, isAtBottom: true });
      return;
    }

    const element = elementRef.current;
    if (!element) return;

    // Initial check with delay to ensure DOM is ready
    const initialTimer = setTimeout(checkScrollPosition, 50);

    // Add scroll listener with passive option for better performance
    element.addEventListener('scroll', checkScrollPosition, { passive: true });

    // Also check on resize
    const resizeObserver = new ResizeObserver(checkScrollPosition);
    resizeObserver.observe(element);

    return () => {
      clearTimeout(initialTimer);
      element.removeEventListener('scroll', checkScrollPosition);
      resizeObserver.disconnect();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isOpen, checkScrollPosition, elementRef]);

  // Re-check when content changes (with multiple retries for AnimatePresence)
  useEffect(() => {
    if (isOpen) {
      const timer1 = setTimeout(checkScrollPosition, 100);
      const timer2 = setTimeout(checkScrollPosition, 300);
      const timer3 = setTimeout(checkScrollPosition, 500);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [isOpen, checkScrollPosition, elementRef]);

  return scrollPosition;
};
