import { useComboboxOptionKeyboardNavigation } from './use-combobox-option-keyboard-navigation';
import type { useComboboxOptionHover } from './use-combobox-option-hover';
import type { useComboboxOptionInteractionInfrastructure } from './use-combobox-option-interaction-infrastructure';
import type {
  ComboboxOptionInteractionCore,
  ComboboxOptionInteractionSelection,
  ComboboxOptionInteractionServices,
} from './use-combobox-option-interaction-types';

export function useComboboxOptionInteractionKeyboardNavigation<Item>({
  core,
  infrastructure,
  optionHover,
  selection,
  services,
}: {
  core: Pick<
    ComboboxOptionInteractionCore,
    | 'actualOpen'
    | 'searchInputRef'
    | 'setInputValue'
    | 'setIsSearchNavigationFocus'
  >;
  infrastructure: ReturnType<typeof useComboboxOptionInteractionInfrastructure>;
  optionHover: ReturnType<typeof useComboboxOptionHover<Item>>;
  selection: ComboboxOptionInteractionSelection<Item>;
  services: ComboboxOptionInteractionServices;
}) {
  return useComboboxOptionKeyboardNavigation({
    creation: {
      canCreate: selection.canCreate,
      handleCreate: selection.handleCreate,
    },
    hoverDetail: {
      hideHoverDetail: optionHover.hideHoverDetail,
      isKeyboardHoverSuppressed: optionHover.isKeyboardHoverSuppressed,
      resetKeyboardHoverSuppression: optionHover.resetKeyboardHoverSuppression,
      suppressPointerHoverForKeyboard:
        optionHover.suppressPointerHoverForKeyboard,
    },
    interaction: {
      actualOpen: core.actualOpen,
    },
    scroll: {
      clearKeyboardScrollHighlight:
        infrastructure.keyboardScroll.clearKeyboardScrollHighlight,
      requestSelectedOptionScroll: services.requestSelectedOptionScroll,
      scheduleKeyboardHighlightedScroll:
        infrastructure.keyboardScroll.scheduleKeyboardHighlightedScroll,
    },
    search: {
      normalizedInputValue: selection.normalizedInputValue,
      searchable: selection.searchable,
      searchInputRef: core.searchInputRef,
      setInputValue: core.setInputValue,
      setIsSearchNavigationFocus: core.setIsSearchNavigationFocus,
    },
    selection: {
      isItemDisabled: selection.isItemDisabled,
      isSameItem: selection.isSameItem,
      items: selection.items,
      selectedValue: selection.selectedValue,
      visibleItems: selection.visibleItems,
    },
  });
}
