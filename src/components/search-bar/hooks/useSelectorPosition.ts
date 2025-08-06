import { useState, useEffect, RefObject } from 'react';

interface UseSelectorPositionProps {
  isOpen: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
}

export const useSelectorPosition = ({
  isOpen,
  containerRef,
}: UseSelectorPositionProps) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const updatePosition = () => {
      if (isOpen && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setPosition({
          top: rect.bottom,
          left: rect.left,
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
      if (containerRef.current && 'ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(updatePosition);
        resizeObserver.observe(containerRef.current);
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
  }, [isOpen, containerRef]);

  return position;
};