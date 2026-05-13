import { useCallback } from 'react';
import type { PharmaComboboxChangeDetails } from '../presets-types';
import type { PharmaComboboxControllerConfig } from '../utils/preset-controller-config';
import type { usePharmaComboboxStateModel } from './use-pharma-combobox-state-model';
import { useComboboxOptionInteraction } from './use-combobox-option-interaction';
import { useComboboxSearchResultScroll } from './use-combobox-search-result-scroll';
import { useComboboxSelectedOptionScroll } from './use-combobox-selected-option-scroll';
import { usePharmaComboboxOpenLifecycle } from './use-pharma-combobox-open-lifecycle';

type PharmaComboboxStateModel<Item> = ReturnType<
  typeof usePharmaComboboxStateModel<Item>
>;

export function usePharmaComboboxBehavior<Item>({
  config,
  state,
}: {
  config: PharmaComboboxControllerConfig<Item>;
  state: PharmaComboboxStateModel<Item>;
}) {
  const { core, focus, selection } = state;
  const { requestSelectedOptionScroll, selectedVisibleIndex } =
    useComboboxSelectedOptionScroll({
      actualOpen: core.actualOpen,
      enabled: selection.normalizedInputValue.length === 0,
      isSameItem: selection.isSameItem,
      listRef: core.listRef,
      selectedValue: core.selectedValue,
      virtualScrollToIndexRef: core.virtualScrollToIndexRef,
      visibleItems: selection.visibleItems,
    });

  useComboboxSearchResultScroll({
    actualOpen: core.actualOpen,
    listRef: core.listRef,
    normalizedInputValue: selection.normalizedInputValue,
    visibleItems: selection.visibleItems,
  });

  const optionInteraction = useComboboxOptionInteraction({
    actualOpen: core.actualOpen,
    canCreate: selection.canCreate,
    handleCreate: selection.handleCreate,
    hoverDetail: config.hoverDetail,
    isItemDisabled: selection.isItemDisabled,
    isSameItem: selection.isSameItem,
    itemToHoverDetailData: config.itemToHoverDetailData,
    itemToStringLabel: config.itemToStringLabel,
    itemToStringValue: config.itemToStringValue,
    items: config.items,
    listRef: core.listRef,
    normalizedInputValue: selection.normalizedInputValue,
    onFetchHoverDetail: config.onFetchHoverDetail,
    onFetchHoverDetailError: config.onFetchHoverDetailError,
    popupContentRef: core.popupContentRef,
    requestSelectedOptionScroll,
    searchable: config.searchable,
    searchInputRef: core.searchInputRef,
    selectedValue: core.selectedValue,
    setInputValue: core.setInputValue,
    setIsSearchNavigationFocus: core.setIsSearchNavigationFocus,
    virtualScrollToIndexRef: core.virtualScrollToIndexRef,
    visibleItems: selection.visibleItems,
  });
  const { resetAfterValueChange } = optionInteraction;
  const { onValueChange } = config;

  const handleValueChange = useCallback(
    (nextValue: Item | null, details: PharmaComboboxChangeDetails<Item>) => {
      onValueChange(nextValue, details);
      if (details.isCanceled) return;

      resetAfterValueChange();
    },
    [onValueChange, resetAfterValueChange]
  );

  usePharmaComboboxOpenLifecycle({
    actualOpen: core.actualOpen,
    clearFocusRestoreIntent: focus.clearFocusRestoreIntent,
    resetOnClose: optionInteraction.resetOnClose,
    resetOnOpen: optionInteraction.resetOnOpen,
    restoreFocusAfterCloseIfNeeded: focus.restoreFocusAfterCloseIfNeeded,
  });

  return {
    ...optionInteraction,
    handleValueChange,
    selectedVisibleIndex,
  };
}
