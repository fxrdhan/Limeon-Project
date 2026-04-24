import { RefObject, useEffect, useRef, useState } from "react";

export interface Position {
  top: number;
  left: number;
}

interface UseSelectorPositionProps {
  isOpen: boolean;
  containerRef: RefObject<HTMLElement | null>;
  /** Optional anchor element to position relative to (e.g., badge). Falls back to containerRef. */
  anchorRef?: RefObject<HTMLElement | null>;
  /** Position relative to anchor: 'left', 'right', or 'center' */
  anchorAlign?: "left" | "right" | "center";
  /** Optional offset ratio (0-1) from anchor's left edge. Overrides anchorAlign when provided. */
  anchorOffsetRatio?: number;
}

export const useSelectorPosition = ({
  isOpen,
  containerRef,
  anchorRef,
  anchorAlign = "left",
  anchorOffsetRatio,
}: UseSelectorPositionProps): Position => {
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
  const positionRef = useRef<Position>({ top: 0, left: 0 });

  useEffect(() => {
    if (!isOpen) return;

    const readPosition = (): Position | null => {
      if (!containerRef.current) return null;

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
        } else if (anchorAlign === "right") {
          left = anchorRect.right;
        } else if (anchorAlign === "center") {
          left = anchorRect.left + anchorRect.width / 2;
        } else {
          left = anchorRect.left;
        }

        return {
          top: containerRect.bottom,
          left,
        };
      }

      return {
        top: containerRect.bottom,
        left: containerRect.left,
      };
    };

    const updatePosition = () => {
      const nextPosition = readPosition();
      if (!nextPosition) return;

      const currentPosition = positionRef.current;
      if (
        Math.abs(nextPosition.top - currentPosition.top) < 0.5 &&
        Math.abs(nextPosition.left - currentPosition.left) < 0.5
      ) {
        return;
      }

      positionRef.current = nextPosition;
      setPosition(nextPosition);
    };

    // Initial position calculation
    updatePosition();

    const handleResize = () => updatePosition();
    const handleScroll = () => updatePosition();

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);
    document.addEventListener("scroll", handleScroll, true);

    let resizeObserver: ResizeObserver | null = null;

    // Observe both container and anchor for size changes
    if ("ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(updatePosition);
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }
      if (anchorRef?.current) {
        resizeObserver.observe(anchorRef.current);
      }
    }

    let trackingFrameId = 0;
    const trackPosition = () => {
      updatePosition();
      trackingFrameId = requestAnimationFrame(trackPosition);
    };
    trackingFrameId = requestAnimationFrame(trackPosition);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
      document.removeEventListener("scroll", handleScroll, true);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      cancelAnimationFrame(trackingFrameId);
    };
  }, [isOpen, containerRef, anchorRef, anchorAlign, anchorOffsetRatio]);

  return position;
};
