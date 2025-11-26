import { useState, useEffect, RefObject } from 'react';

interface UseSelectorPositionProps {
  isOpen: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  /** Optional anchor element to position relative to (e.g., badge). Falls back to containerRef. */
  anchorRef?: RefObject<HTMLDivElement | null>;
  /** Position relative to anchor: 'left', 'right', or 'center' */
  anchorAlign?: 'left' | 'right' | 'center';
  /** Optional offset ratio (0-1) from anchor's left edge. Overrides anchorAlign when provided. */
  anchorOffsetRatio?: number;
}

export const useSelectorPosition = ({
  isOpen,
  containerRef,
  anchorRef,
  anchorAlign = 'left',
  anchorOffsetRatio,
}: UseSelectorPositionProps) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const updatePosition = () => {
      if (!isOpen || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();

      // Use anchor element if provided, otherwise fall back to container
      const anchorElement = anchorRef?.current;
      if (anchorElement) {
        const anchorRect = anchorElement.getBoundingClientRect();

        // Calculate left position based on alignment or offset ratio
        let left: number;
        if (anchorOffsetRatio !== undefined) {
          // Use offset ratio: 0 = left edge, 0.5 = center, 1 = right edge
          left = anchorRect.left + anchorRect.width * anchorOffsetRatio;
        } else if (anchorAlign === 'right') {
          left = anchorRect.right;
        } else if (anchorAlign === 'center') {
          left = anchorRect.left + anchorRect.width / 2;
        } else {
          left = anchorRect.left;
        }

        setPosition({
          top: containerRect.bottom,
          left,
        });
      } else {
        setPosition({
          top: containerRect.bottom,
          left: containerRect.left,
        });
      }
    };

    // Initial position calculation
    updatePosition();

    if (isOpen) {
      const handleResize = () => updatePosition();
      const handleScroll = () => updatePosition();

      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true);
      document.addEventListener('scroll', handleScroll, true);

      let resizeObserver: ResizeObserver | null = null;

      // Observe both container and anchor for size changes
      if ('ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(updatePosition);
        if (containerRef.current) {
          resizeObserver.observe(containerRef.current);
        }
        if (anchorRef?.current) {
          resizeObserver.observe(anchorRef.current);
        }
      }

      // CRITICAL FIX: Recalculate position after a frame to ensure refs are updated
      // React batches state updates and refs might not be assigned when effect first runs
      // Also recalculate after badge animations settle (300ms)
      const rafId = requestAnimationFrame(updatePosition);
      const delayedUpdateId = setTimeout(updatePosition, 50);
      const animationSettleId = setTimeout(updatePosition, 300);

      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
        document.removeEventListener('scroll', handleScroll, true);
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
        cancelAnimationFrame(rafId);
        clearTimeout(delayedUpdateId);
        clearTimeout(animationSettleId);
      };
    }
  }, [isOpen, containerRef, anchorRef, anchorAlign, anchorOffsetRatio]);

  return position;
};
