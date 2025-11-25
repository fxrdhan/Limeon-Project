import { useState, useEffect, RefObject } from 'react';

interface UseSelectorPositionProps {
  isOpen: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  /** Optional anchor element to position relative to (e.g., badge). Falls back to containerRef. */
  anchorRef?: RefObject<HTMLDivElement | null>;
  /** Position relative to anchor: 'left' aligns to anchor's left edge, 'right' aligns to anchor's right edge */
  anchorAlign?: 'left' | 'right';
}

export const useSelectorPosition = ({
  isOpen,
  containerRef,
  anchorRef,
  anchorAlign = 'left',
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
        setPosition({
          top: containerRect.bottom,
          // Position based on anchor alignment
          left: anchorAlign === 'right' ? anchorRect.right : anchorRect.left,
        });
      } else {
        setPosition({
          top: containerRect.bottom,
          left: containerRect.left,
        });
      }
    };

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

      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
        document.removeEventListener('scroll', handleScroll, true);
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
      };
    }
  }, [isOpen, containerRef, anchorRef, anchorAlign]);

  return position;
};
