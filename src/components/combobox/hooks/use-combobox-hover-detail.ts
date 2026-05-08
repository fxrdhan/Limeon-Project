import { useCallback, useEffect, useRef, useState } from 'react';
import type { HoverDetailData } from '@/types/components';
import type {
  ComboboxHoverDetailPosition,
  ComboboxHoverDetailSourceData,
} from '@/components/combobox/internal-types';

const hoverDetailHideDelay = 300;

const getHoverDetailPosition = (
  element: HTMLElement
): ComboboxHoverDetailPosition => {
  const rect = element.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const padding = 10;
  const minPortalWidth = 220;
  const maxPortalWidth = 460;
  const spaceOnRight = viewportWidth - rect.right;
  const spaceOnLeft = rect.left;
  const anchorCenterY = rect.top + rect.height / 2;
  const getMaxWidth = (availableSpace: number) =>
    Math.min(
      maxPortalWidth,
      Math.max(minPortalWidth, availableSpace - padding * 2)
    );

  if (spaceOnRight >= minPortalWidth + padding) {
    return {
      left: rect.right + padding,
      top: rect.top,
      direction: 'right',
      anchorCenterY,
      maxWidth: getMaxWidth(spaceOnRight),
    };
  }

  if (spaceOnLeft >= minPortalWidth + padding) {
    return {
      left: rect.left - padding,
      top: rect.top,
      direction: 'left',
      anchorCenterY,
      maxWidth: getMaxWidth(spaceOnLeft),
    };
  }

  if (spaceOnRight >= spaceOnLeft) {
    return {
      left: Math.max(padding, rect.right + padding),
      top: rect.top,
      direction: 'right',
      anchorCenterY,
      maxWidth: getMaxWidth(spaceOnRight),
    };
  }

  return {
    left: rect.left - padding,
    top: rect.top,
    direction: 'left',
    anchorCenterY,
    maxWidth: getMaxWidth(spaceOnLeft),
  };
};

const getHoverDetailData = (
  itemId: string,
  itemData?: ComboboxHoverDetailSourceData
): HoverDetailData => ({
  id: itemId,
  name: itemData?.name || 'Unknown',
  display: itemData?.display,
  data: itemData?.data,
  code: itemData?.code,
  description: itemData?.description,
  metaLabel: itemData?.metaLabel,
  metaTone: itemData?.metaTone,
  created_at: itemData?.created_at,
  createdAt: itemData?.createdAt,
  updated_at: itemData?.updated_at,
  updatedAt: itemData?.updatedAt,
});

export const useComboboxHoverDetail = ({
  hoverDelay,
  isComboboxOpen,
  isEnabled,
  onFetchData,
}: {
  hoverDelay: number;
  isComboboxOpen: boolean;
  isEnabled: boolean;
  onFetchData?: (itemId: string) => Promise<HoverDetailData | null>;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<ComboboxHoverDetailPosition>({
    top: 0,
    left: 0,
    direction: 'right',
    anchorCenterY: 0,
    maxWidth: 460,
  });
  const [data, setData] = useState<HoverDetailData | null>(null);
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearDataTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const currentItemIdRef = useRef<string | null>(null);
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
    async (itemId: string) => {
      if (!onFetchData) return;

      const detail = await onFetchData(itemId);
      if (currentItemIdRef.current === itemId && detail) {
        setData(previousData => ({
          ...previousData,
          ...detail,
        }));
      }
    },
    [onFetchData]
  );

  const handleItemHover = useCallback(
    (
      itemId: string,
      element: HTMLElement,
      itemData?: ComboboxHoverDetailSourceData,
      options: { immediate?: boolean } = {}
    ) => {
      if (!isEnabled) return;

      clearHoverDetailTimeouts();
      currentItemIdRef.current = itemId;
      setPosition(getHoverDetailPosition(element));

      if (isPortalShownRef.current || options.immediate) {
        isPortalShownRef.current = true;
        setIsVisible(true);
        if (itemData) {
          setData(getHoverDetailData(itemId, itemData));
        }
        void fetchHoverDetail(itemId);
        return;
      }

      if (itemData) {
        setData(getHoverDetailData(itemId, itemData));
      }

      showTimeoutRef.current = setTimeout(() => {
        if (currentItemIdRef.current !== itemId) return;

        isPortalShownRef.current = true;
        setIsVisible(true);
        void fetchHoverDetail(itemId);
      }, hoverDelay);
    },
    [clearHoverDetailTimeouts, fetchHoverDetail, hoverDelay, isEnabled]
  );

  const handleItemLeave = useCallback(() => {
    if (!isEnabled) return;

    clearHoverDetailTimeouts();
    currentItemIdRef.current = null;

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

  const hidePopover = useCallback(() => {
    clearHoverDetailTimeouts();
    isPortalShownRef.current = false;
    currentItemIdRef.current = null;
    setIsVisible(false);
    scheduleDataClear();
  }, [clearHoverDetailTimeouts, scheduleDataClear]);

  useEffect(() => {
    if (!isComboboxOpen && isVisible) {
      hidePopover();
    }
  }, [hidePopover, isComboboxOpen, isVisible]);

  useEffect(() => {
    return () => {
      clearHoverDetailTimeouts();
      isPortalShownRef.current = false;
    };
  }, [clearHoverDetailTimeouts]);

  return {
    data,
    handleItemHover,
    handleItemLeave,
    hidePopover,
    isVisible,
    position,
  };
};
