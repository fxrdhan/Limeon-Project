import { useCallback, type MouseEvent, type RefObject } from 'react';
import type { HoverDetailData } from '@/types/components';
import { getDefaultHoverDetailData } from '../utils/preset-item';
import { useComboboxHoverDetail } from './use-combobox-hover-detail';

export function useComboboxHoverDetailController<Item>({
  actualOpen,
  hoverDetail,
  itemToHoverDetailData,
  itemToStringLabel,
  itemToStringValue,
  onFetchHoverDetail,
  onFetchHoverDetailError,
  popupContentRef,
  selectedValue,
}: {
  actualOpen: boolean;
  hoverDetail?: {
    enabled?: boolean;
    delay?: number;
  };
  itemToHoverDetailData?: (item: Item) => Partial<HoverDetailData>;
  itemToStringLabel: (item: Item) => string;
  itemToStringValue: (item: Item) => string;
  onFetchHoverDetail?: (id: string) => Promise<HoverDetailData | null>;
  onFetchHoverDetailError?: (error: unknown, id: string) => void;
  popupContentRef: RefObject<HTMLDivElement | null>;
  selectedValue: Item | null;
}) {
  const hoverDetailEnabled =
    hoverDetail?.enabled ??
    Boolean(onFetchHoverDetail || itemToHoverDetailData);
  const {
    cancelPendingHoverDetail,
    data: hoverDetailData,
    handleItemHover,
    handleItemLeave,
    hidePopover: hideHoverDetail,
    isVisible: isHoverDetailVisible,
    position: hoverDetailPosition,
    syncHighlightedHoverDetail,
  } = useComboboxHoverDetail({
    boundaryRef: popupContentRef,
    hoverDelay: hoverDetail?.delay ?? 800,
    isComboboxOpen: actualOpen,
    isEnabled: hoverDetailEnabled,
    onFetchData: onFetchHoverDetail,
    onFetchError: onFetchHoverDetailError,
  });

  const getItemHoverDetailData = useCallback(
    (item: Item): Partial<HoverDetailData> => {
      const idValue = itemToStringValue(item);
      const nameValue = itemToStringLabel(item);
      const customData = itemToHoverDetailData?.(item);

      return {
        ...getDefaultHoverDetailData(item),
        ...customData,
        id: idValue,
        name: nameValue,
      };
    },
    [itemToHoverDetailData, itemToStringLabel, itemToStringValue]
  );

  const handleTriggerMouseEnter = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (actualOpen || !hoverDetailEnabled || selectedValue === null) return;

      handleItemHover(
        itemToStringValue(selectedValue),
        event.currentTarget,
        getItemHoverDetailData(selectedValue)
      );
    },
    [
      actualOpen,
      getItemHoverDetailData,
      handleItemHover,
      hoverDetailEnabled,
      itemToStringValue,
      selectedValue,
    ]
  );

  const handleTriggerMouseLeave = useCallback(() => {
    if (actualOpen || !hoverDetailEnabled || selectedValue === null) return;

    handleItemLeave();
  }, [actualOpen, handleItemLeave, hoverDetailEnabled, selectedValue]);

  return {
    cancelPendingHoverDetail,
    getItemHoverDetailData,
    handleItemHover,
    handleItemLeave,
    handleTriggerMouseEnter,
    handleTriggerMouseLeave,
    hideHoverDetail,
    hoverDetail: {
      data: hoverDetailData,
      enabled: hoverDetailEnabled,
      isVisible: isHoverDetailVisible,
      position: hoverDetailPosition,
    },
    hoverDetailEnabled,
    isHoverDetailVisible,
    syncHighlightedHoverDetail,
  };
}
