import { useComboboxOptionInteractionHoverState } from './use-combobox-option-interaction-hover-state';
import { useComboboxOptionInteractionInfrastructure } from './use-combobox-option-interaction-infrastructure';
import { useComboboxOptionInteractionKeyboardNavigation } from './use-combobox-option-interaction-keyboard-navigation';
import { useComboboxOptionInteractionResets } from './use-combobox-option-interaction-resets';
import { useComboboxOptionInteractionScrollHoverSync } from './use-combobox-option-interaction-scroll-hover-sync';
import type { UseComboboxOptionInteractionOptions } from './use-combobox-option-interaction-types';

export function useComboboxOptionInteractionModel<Item>({
  core,
  hoverDetail,
  selection,
  services,
}: UseComboboxOptionInteractionOptions<Item>) {
  const infrastructure = useComboboxOptionInteractionInfrastructure({
    core,
    visibleItemCount: selection.visibleItems.length,
  });
  const optionHover = useComboboxOptionInteractionHoverState({
    core,
    hoverDetail,
    infrastructure,
    selection,
  });
  const keyboardNavigation = useComboboxOptionInteractionKeyboardNavigation({
    core,
    infrastructure,
    optionHover,
    selection,
    services,
  });
  const scrollHoverDetailSync = useComboboxOptionInteractionScrollHoverSync({
    core,
    hoverDetail,
    infrastructure,
    keyboardNavigation,
    optionHover,
    selection,
  });
  const resets = useComboboxOptionInteractionResets({
    cancelPendingHoverDetail: optionHover.cancelPendingHoverDetail,
    clearKeyboardHoverDetailSync: infrastructure.clearKeyboardHoverDetailSync,
    hideHoverDetail: optionHover.hideHoverDetail,
    resetKeyboardHoverSuppression: optionHover.resetKeyboardHoverSuppression,
    resetPointerHoverState: optionHover.resetPointerHoverState,
    resetScrollHoverDetailState:
      scrollHoverDetailSync.resetScrollHoverDetailState,
    setInputValue: core.setInputValue,
    setIsSearchNavigationFocus: core.setIsSearchNavigationFocus,
  });

  return {
    effectiveHighlightedIndex: keyboardNavigation.effectiveHighlightedIndex,
    handleInputValueChange: keyboardNavigation.handleInputValueChange,
    handleItemHighlighted: keyboardNavigation.handleItemHighlighted,
    handleItemLeave: optionHover.handleItemLeave,
    handleListScroll: scrollHoverDetailSync.handleListScroll,
    handleOptionListMouseLeave:
      scrollHoverDetailSync.handleOptionListMouseLeave,
    handleOptionMouseEnter: optionHover.handleOptionMouseEnter,
    handleOptionMouseMove: optionHover.handleOptionMouseMove,
    handleSearchInputKeyDown: keyboardNavigation.handleSearchInputKeyDown,
    handleTriggerKeyDown: keyboardNavigation.handleTriggerKeyDown,
    handleTriggerMouseEnter: optionHover.handleTriggerMouseEnter,
    handleTriggerMouseLeave: optionHover.handleTriggerMouseLeave,
    heldHighlightFrame: infrastructure.keyboardScroll.heldHighlightFrame,
    heldHighlightFrameKey: infrastructure.keyboardScroll.heldHighlightFrameKey,
    hoverDetail: optionHover.hoverDetail,
    resetAfterValueChange: resets.resetAfterValueChange,
    resetOnClose: resets.resetOnClose,
    resetOnOpen: resets.resetOnOpen,
  };
}
