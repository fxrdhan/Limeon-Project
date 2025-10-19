import { useState, useRef, useEffect } from 'react';

export const useContainerWidth = () => {
  const [width, setWidth] = useState(1200);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        setWidth(containerWidth > 0 ? containerWidth : window.innerWidth - 40);
      } else {
        setWidth(window.innerWidth - 40);
      }
    };

    // Update width on mount
    updateWidth();

    // Update width on resize
    window.addEventListener('resize', updateWidth);

    // Observer untuk memantau perubahan ukuran container
    const resizeObserver = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateWidth);
      resizeObserver.disconnect();
    };
  }, []);

  return { width, containerRef };
};
