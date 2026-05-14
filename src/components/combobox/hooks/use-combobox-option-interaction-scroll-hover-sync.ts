import { useComboboxHighlightedOptionAnchor } from './use-combobox-option-elements';
import { useComboboxOptionHoverDetailSync } from './use-combobox-option-hover-detail-sync';
import type { useComboboxOptionHover } from './use-combobox-option-hover';
import type { useComboboxOptionInteractionInfrastructure } from './use-combobox-option-interaction-infrastructure';
import type { useComboboxOptionKeyboardNavigation } from './use-combobox-option-keyboard-navigation';
import type {
  ComboboxOptionInteractionCore,
  ComboboxOptionInteractionHoverDetail,
  ComboboxOptionInteractionSelection,
} from './use-combobox-option-interaction-types';

export function useComboboxOptionInteractionScrollHoverSync<Item>({
  core,
  hoverDetail,
  infrastructure,
  keyboardNavigation,
  optionHover,
  selection,
}: {
  core: Pick<
    ComboboxOptionInteractionCore,
    'actualOpen' | 'listRef' | 'popupContentRef'
  >;
  hoverDetail: Pick<
    ComboboxOptionInteractionHoverDetail<Item>,
    'itemToStringValue'
  >;
  infrastructure: ReturnType<typeof useComboboxOptionInteractionInfrastructure>;
  keyboardNavigation: ReturnType<
    typeof useComboboxOptionKeyboardNavigation<Item>
  >;
  optionHover: ReturnType<typeof useComboboxOptionHover<Item>>;
  selection: Pick<
    ComboboxOptionInteractionSelection<Item>,
    'isItemDisabled' | 'visibleItems'
  >;
}) {
  const getHighlightedHoverDetailAnchorElement =
    useComboboxHighlightedOptionAnchor({
      getOptionElementAtIndex: infrastructure.getOptionElementAtIndex,
      hasHeldHighlightFrame:
        infrastructure.keyboardScroll.heldHighlightFrame !== null,
      popupContentRef: core.popupContentRef,
    });

  return useComboboxOptionHoverDetailSync({
    actualOpen: core.actualOpen,
    cancelPendingHoverDetail: optionHover.cancelPendingHoverDetail,
    clearKeyboardHoverDetailSync: infrastructure.clearKeyboardHoverDetailSync,
    effectiveHighlightedIndex: keyboardNavigation.effectiveHighlightedIndex,
    getHighlightedHoverDetailAnchorElement,
    getItemHoverDetailData: optionHover.getItemHoverDetailData,
    getOptionElementAtIndex: infrastructure.getOptionElementAtIndex,
    handleListMouseLeave: optionHover.handleListMouseLeave,
    hideHoverDetail: optionHover.hideHoverDetail,
    hoverDetailEnabled: optionHover.hoverDetailEnabled,
    isHoverDetailVisible: optionHover.isHoverDetailVisible,
    isItemDisabled: selection.isItemDisabled,
    isKeyboardHoverSuppressed: optionHover.isKeyboardHoverSuppressed,
    isOptionElementFullyVisible: infrastructure.isOptionElementFullyVisible,
    itemToStringValue: hoverDetail.itemToStringValue,
    keyboardHoverDetailSyncTimeoutRef:
      infrastructure.keyboardHoverDetailSyncTimeoutRef,
    listRef: core.listRef,
    syncHighlightedHoverDetail: optionHover.syncHighlightedHoverDetail,
    visibleItems: selection.visibleItems,
  });
}
