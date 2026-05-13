import { useCallback, type RefObject } from 'react';
import type { HoverDetailData } from '@/types/components';
import { useComboboxHoverDetailController } from './use-combobox-hover-detail-controller';
import { useComboboxPointerHover } from './use-combobox-pointer-hover';

export function useComboboxOptionHover<Item>({
  actualOpen,
  clearKeyboardHoverDetailSync,
  clearKeyboardScrollHighlight,
  hoverDetail,
  isItemDisabled,
  itemToHoverDetailData,
  itemToStringLabel,
  itemToStringValue,
  onFetchHoverDetail,
  onFetchHoverDetailError,
  popupContentRef,
  selectedValue,
}: {
  actualOpen: boolean;
  clearKeyboardHoverDetailSync: () => void;
  clearKeyboardScrollHighlight: () => void;
  hoverDetail?: {
    enabled?: boolean;
    delay?: number;
  };
  isItemDisabled: (item: Item) => boolean;
  itemToHoverDetailData?: (item: Item) => Partial<HoverDetailData>;
  itemToStringLabel: (item: Item) => string;
  itemToStringValue: (item: Item) => string;
  onFetchHoverDetail?: (id: string) => Promise<HoverDetailData | null>;
  onFetchHoverDetailError?: (error: unknown, id: string) => void;
  popupContentRef: RefObject<HTMLDivElement | null>;
  selectedValue: Item | null;
}) {
  const hoverDetailController = useComboboxHoverDetailController({
    actualOpen,
    hoverDetail,
    itemToHoverDetailData,
    itemToStringLabel,
    itemToStringValue,
    onFetchHoverDetail,
    onFetchHoverDetailError,
    popupContentRef,
    selectedValue,
  });
  const {
    getItemHoverDetailData,
    handleItemHover,
    handleItemLeave,
    hoverDetailEnabled,
  } = hoverDetailController;

  const applyPointerHover = useCallback(
    (item: Item, element: HTMLElement) => {
      if (isItemDisabled(item)) return;

      clearKeyboardHoverDetailSync();
      clearKeyboardScrollHighlight();

      if (!hoverDetailEnabled) return;

      handleItemHover(
        itemToStringValue(item),
        element,
        getItemHoverDetailData(item)
      );
    },
    [
      clearKeyboardHoverDetailSync,
      clearKeyboardScrollHighlight,
      getItemHoverDetailData,
      handleItemHover,
      hoverDetailEnabled,
      isItemDisabled,
      itemToStringValue,
    ]
  );

  const pointerHover = useComboboxPointerHover({
    onHoverAllowed: applyPointerHover,
    onLeave: handleItemLeave,
  });

  return {
    ...hoverDetailController,
    ...pointerHover,
  };
}
