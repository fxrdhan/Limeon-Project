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
    core: {
      actualOpen: core.actualOpen,
      listRef: core.listRef,
      popupContentRef: core.popupContentRef,
      searchInputRef: core.searchInputRef,
      setInputValue: core.setInputValue,
      setIsSearchNavigationFocus: core.setIsSearchNavigationFocus,
      virtualScrollToIndexRef: core.virtualScrollToIndexRef,
    },
    hoverDetail: {
      hoverDetail: config.hoverDetail,
      itemToHoverDetailData: config.itemToHoverDetailData,
      itemToStringLabel: config.itemToStringLabel,
      itemToStringValue: config.itemToStringValue,
      onFetchHoverDetail: config.onFetchHoverDetail,
      onFetchHoverDetailError: config.onFetchHoverDetailError,
    },
    selection: {
      canCreate: selection.canCreate,
      handleCreate: selection.handleCreate,
      isItemDisabled: selection.isItemDisabled,
      isSameItem: selection.isSameItem,
      items: config.items,
      normalizedInputValue: selection.normalizedInputValue,
      searchable: config.searchable,
      selectedValue: core.selectedValue,
      visibleItems: selection.visibleItems,
    },
    services: {
      requestSelectedOptionScroll,
    },
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
