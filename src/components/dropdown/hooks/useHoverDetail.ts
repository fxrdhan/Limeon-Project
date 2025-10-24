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
  isDropdownOpen?: boolean;
}

export const useHoverDetail = ({
  isEnabled = true,
  hoverDelay = 800,
  hideDelay = 300,
  onFetchData,
  isDropdownOpen = true,
}: UseHoverDetailProps = {}) => {
  // Main visibility state - portal shown to user
  const [isVisible, setIsVisible] = useState(false);

  // Portal position and data
  const [position, setPosition] = useState<HoverDetailPosition>({
    top: 0,
    left: 0,
    direction: 'right',
  });
  const [data, setData] = useState<HoverDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentOptionIdRef = useRef<string | null>(null);
  const isPortalShownRef = useRef(false); // Track if portal has been shown

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

  const calculatePosition = useCallback(
    (element: HTMLElement): HoverDetailPosition => {
      const rect = element.getBoundingClientRect();
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft =
        window.pageXOffset || document.documentElement.scrollLeft;
      const viewportWidth = window.innerWidth;

      const top = rect.top + scrollTop;
      const padding = 10;
      const minPortalWidth = 280;
      const maxPortalWidth = 580;

      const spaceOnRight = viewportWidth - rect.right;
      const spaceOnLeft = rect.left;

      if (spaceOnRight >= minPortalWidth + padding) {
        return {
          left: rect.right + scrollLeft + padding,
          top,
          direction: 'right',
        };
      }

      if (spaceOnLeft >= minPortalWidth + padding) {
        return {
          left: rect.left + scrollLeft - minPortalWidth - padding,
          top,
          direction: 'left',
        };
      }

      if (spaceOnRight >= spaceOnLeft) {
        return {
          left: Math.max(padding, rect.right + scrollLeft + padding),
          top,
          direction: 'right',
        };
      } else {
        return {
          left: Math.max(
            padding,
            rect.left + scrollLeft - maxPortalWidth - padding
          ),
          top,
          direction: 'left',
        };
      }
    },
    []
  );

  const handleOptionHover = useCallback(
    async (
      optionId: string,
      element: HTMLElement,
      optionData?: Partial<HoverDetailData>
    ) => {
      if (!isEnabled) return;

      clearTimeouts();
      currentOptionIdRef.current = optionId;

      // Always update position
      const pos = calculatePosition(element);
      setPosition(pos);

      // If portal is already shown, update data immediately without delay
      if (isPortalShownRef.current) {
        // Update with basic data first for immediate response
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
        return;
      }

      // First time showing portal - set initial data
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

      // Wait for delay before showing portal for the first time
      showTimeoutRef.current = setTimeout(async () => {
        if (currentOptionIdRef.current !== optionId) return;

        isPortalShownRef.current = true;
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
    },
    [isEnabled, hoverDelay, clearTimeouts, calculatePosition, onFetchData]
  );

  const handleOptionLeave = useCallback(() => {
    if (!isEnabled || !isPortalShownRef.current) return;

    clearTimeouts();
    currentOptionIdRef.current = null;

    // Hide portal after delay
    hideTimeoutRef.current = setTimeout(() => {
      isPortalShownRef.current = false;
      setIsVisible(false);
      setIsLoading(false);
      // Clear data after animation completes
      setTimeout(() => {
        setData(null);
      }, 200);
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
    isPortalShownRef.current = false;
    setIsVisible(false);
    setIsLoading(false);
    currentOptionIdRef.current = null;
    setTimeout(() => {
      setData(null);
    }, 200);
  }, [clearTimeouts]);

  // Hide portal when dropdown closes
  useEffect(() => {
    if (!isDropdownOpen && isVisible) {
      hidePortal();
    }
  }, [isDropdownOpen, isVisible, hidePortal]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearTimeouts();
      isPortalShownRef.current = false;
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
