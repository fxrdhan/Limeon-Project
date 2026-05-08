import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  HoverDetailPosition,
  HoverDetailSourceData,
} from '@/components/dropdown/internal-types';
import type { HoverDetailData } from '@/types';

const hoverDetailHideDelay = 300;

const getHoverDetailPosition = (element: HTMLElement): HoverDetailPosition => {
  const rect = element.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const padding = 10;
  const minPortalWidth = 280;
  const maxPortalWidth = 580;
  const spaceOnRight = viewportWidth - rect.right;
  const spaceOnLeft = rect.left;
  const anchorCenterY = rect.top + rect.height / 2;

  if (spaceOnRight >= minPortalWidth + padding) {
    return {
      left: rect.right + padding,
      top: rect.top,
      direction: 'right',
      anchorCenterY,
    };
  }

  if (spaceOnLeft >= minPortalWidth + padding) {
    return {
      left: rect.left - minPortalWidth - padding,
      top: rect.top,
      direction: 'left',
      anchorCenterY,
    };
  }

  if (spaceOnRight >= spaceOnLeft) {
    return {
      left: Math.max(padding, rect.right + padding),
      top: rect.top,
      direction: 'right',
      anchorCenterY,
    };
  }

  return {
    left: Math.max(padding, rect.left - maxPortalWidth - padding),
    top: rect.top,
    direction: 'left',
    anchorCenterY,
  };
};

const getHoverDetailData = (
  optionId: string,
  optionData?: HoverDetailSourceData
): HoverDetailData => ({
  id: optionId,
  name: optionData?.name || 'Unknown',
  code: optionData?.code,
  description: optionData?.description,
  metaLabel: optionData?.metaLabel,
  metaTone: optionData?.metaTone,
  created_at: optionData?.created_at,
  updated_at: optionData?.updated_at,
});

export const useBaseHoverDetail = ({
  hoverDelay,
  isDropdownOpen,
  isEnabled,
  onFetchData,
}: {
  hoverDelay: number;
  isDropdownOpen: boolean;
  isEnabled: boolean;
  onFetchData?: (optionId: string) => Promise<HoverDetailData | null>;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<HoverDetailPosition>({
    top: 0,
    left: 0,
    direction: 'right',
    anchorCenterY: 0,
  });
  const [data, setData] = useState<HoverDetailData | null>(null);
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearDataTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const currentOptionIdRef = useRef<string | null>(null);
  const isPortalShownRef = useRef(false);

  const clearHoverDetailTimeouts = useCallback(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    if (clearDataTimeoutRef.current) {
      clearTimeout(clearDataTimeoutRef.current);
      clearDataTimeoutRef.current = null;
    }
  }, []);

  const scheduleDataClear = useCallback(() => {
    clearDataTimeoutRef.current = setTimeout(() => {
      setData(null);
      clearDataTimeoutRef.current = null;
    }, 200);
  }, []);

  const fetchHoverDetail = useCallback(
    async (optionId: string) => {
      if (!onFetchData) return;

      const detail = await onFetchData(optionId);
      if (currentOptionIdRef.current === optionId && detail) {
        setData(previousData => ({
          ...previousData,
          ...detail,
        }));
      }
    },
    [onFetchData]
  );

  const handleOptionHover = useCallback(
    (
      optionId: string,
      element: HTMLElement,
      optionData?: HoverDetailSourceData,
      options: { immediate?: boolean } = {}
    ) => {
      if (!isEnabled) return;

      clearHoverDetailTimeouts();
      currentOptionIdRef.current = optionId;
      setPosition(getHoverDetailPosition(element));

      if (isPortalShownRef.current || options.immediate) {
        isPortalShownRef.current = true;
        setIsVisible(true);
        if (optionData) {
          setData(getHoverDetailData(optionId, optionData));
        }
        void fetchHoverDetail(optionId);
        return;
      }

      if (optionData) {
        setData(getHoverDetailData(optionId, optionData));
      }

      showTimeoutRef.current = setTimeout(() => {
        if (currentOptionIdRef.current !== optionId) return;

        isPortalShownRef.current = true;
        setIsVisible(true);
        void fetchHoverDetail(optionId);
      }, hoverDelay);
    },
    [clearHoverDetailTimeouts, fetchHoverDetail, hoverDelay, isEnabled]
  );

  const handleOptionLeave = useCallback(() => {
    if (!isEnabled) return;

    clearHoverDetailTimeouts();
    currentOptionIdRef.current = null;

    if (!isPortalShownRef.current) {
      setData(null);
      return;
    }

    hideTimeoutRef.current = setTimeout(() => {
      isPortalShownRef.current = false;
      setIsVisible(false);
      scheduleDataClear();
    }, hoverDetailHideDelay);
  }, [clearHoverDetailTimeouts, isEnabled, scheduleDataClear]);

  const suppressPortal = useCallback(() => {
    if (!isEnabled) return false;

    const shouldRestoreAfterSuppression = isPortalShownRef.current || isVisible;
    clearHoverDetailTimeouts();
    setIsVisible(false);
    return shouldRestoreAfterSuppression;
  }, [clearHoverDetailTimeouts, isEnabled, isVisible]);

  const hidePortal = useCallback(() => {
    clearHoverDetailTimeouts();
    isPortalShownRef.current = false;
    currentOptionIdRef.current = null;
    setIsVisible(false);
    scheduleDataClear();
  }, [clearHoverDetailTimeouts, scheduleDataClear]);

  useEffect(() => {
    if (!isDropdownOpen && isVisible) {
      hidePortal();
    }
  }, [hidePortal, isDropdownOpen, isVisible]);

  useEffect(() => {
    return () => {
      clearHoverDetailTimeouts();
      isPortalShownRef.current = false;
    };
  }, [clearHoverDetailTimeouts]);

  return {
    data,
    handleOptionHover,
    handleOptionLeave,
    hidePortal,
    isVisible,
    position,
    suppressPortal,
  };
};
