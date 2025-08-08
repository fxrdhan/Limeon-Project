import { useState, useCallback, useRef, useEffect } from 'react';
import type { HoverDetailData } from '@/types';

interface HoverDetailPosition {
  top: number;
  left: number;
  direction: 'right' | 'left';
}

interface UseHoverDetailProps {
  isEnabled?: boolean;
  hoverDelay?: number;
  hideDelay?: number;
  onFetchData?: (optionId: string) => Promise<HoverDetailData | null>;
}

export const useHoverDetail = ({
  isEnabled = true,
  hoverDelay = 800,
  hideDelay = 300,
  onFetchData,
}: UseHoverDetailProps = {}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<HoverDetailPosition>({ top: 0, left: 0, direction: 'right' });
  const [data, setData] = useState<HoverDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentOptionIdRef = useRef<string | null>(null);

  const clearTimeouts = useCallback(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const calculatePosition = useCallback((element: HTMLElement): HoverDetailPosition => {
    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const viewportWidth = window.innerWidth;

    const top = rect.top + scrollTop;
    const padding = 10;
    const minPortalWidth = 280; // Minimum portal width
    const maxPortalWidth = 580; // Maximum portal width

    // Calculate available space on both sides
    const spaceOnRight = viewportWidth - rect.right;
    const spaceOnLeft = rect.left;
    
    // Check if we can fit on the right (preferred)
    if (spaceOnRight >= minPortalWidth + padding) {
      return {
        left: rect.right + scrollLeft + padding,
        top,
        direction: 'right'
      };
    }
    
    // Check if we can fit on the left
    if (spaceOnLeft >= minPortalWidth + padding) {
      return {
        left: rect.left + scrollLeft - minPortalWidth - padding,
        top,
        direction: 'left'
      };
    }
    
    // If neither side has enough space, choose the side with more space
    if (spaceOnRight >= spaceOnLeft) {
      return {
        left: Math.max(padding, rect.right + scrollLeft + padding),
        top,
        direction: 'right'
      };
    } else {
      return {
        left: Math.max(padding, rect.left + scrollLeft - maxPortalWidth - padding),
        top,
        direction: 'left'
      };
    }
  }, []);

  const handleOptionHover = useCallback(async (
    optionId: string,
    element: HTMLElement,
    optionData?: Partial<HoverDetailData>
  ) => {
    if (!isEnabled) return;

    clearTimeouts();
    currentOptionIdRef.current = optionId;

    // If we already have basic data, use it immediately
    if (optionData) {
      setData({
        id: optionId,
        name: optionData.name || 'Unknown',
        code: optionData.code,
        description: optionData.description,
        created_at: optionData.created_at,
        updated_at: optionData.updated_at,
      });
    }

    const pos = calculatePosition(element);
    setPosition(pos);

    showTimeoutRef.current = setTimeout(async () => {
      if (currentOptionIdRef.current !== optionId) return;

      setIsVisible(true);

      // Fetch detailed data if fetch function is provided
      if (onFetchData) {
        setIsLoading(true);
        try {
          const detailedData = await onFetchData(optionId);
          if (currentOptionIdRef.current === optionId && detailedData) {
            setData(detailedData);
          }
        } catch (error) {
          console.error('Failed to fetch hover detail data:', error);
        } finally {
          setIsLoading(false);
        }
      }
    }, hoverDelay);
  }, [isEnabled, hoverDelay, clearTimeouts, calculatePosition, onFetchData]);

  const handleOptionLeave = useCallback(() => {
    if (!isEnabled) return;

    clearTimeouts();
    currentOptionIdRef.current = null;

    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
      setIsLoading(false);
      // Delay clearing data to allow exit animation to complete
      setTimeout(() => {
        setData(null);
      }, 200); // Match the animation duration
    }, hideDelay);
  }, [isEnabled, hideDelay, clearTimeouts]);

  const handlePortalHover = useCallback(() => {
    // Keep portal visible when hovering over it
    clearTimeouts();
  }, [clearTimeouts]);

  const handlePortalLeave = useCallback(() => {
    handleOptionLeave();
  }, [handleOptionLeave]);

  const hidePortal = useCallback(() => {
    clearTimeouts();
    setIsVisible(false);
    setIsLoading(false);
    currentOptionIdRef.current = null;
    // Delay clearing data to allow exit animation to complete
    setTimeout(() => {
      setData(null);
    }, 200); // Match the animation duration
  }, [clearTimeouts]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearTimeouts();
    };
  }, [clearTimeouts]);

  return {
    isVisible,
    position,
    data,
    isLoading,
    handleOptionHover,
    handleOptionLeave,
    handlePortalHover,
    handlePortalLeave,
    hidePortal,
  };
};