import type { usePharmaComboboxBehavior } from '../hooks/use-pharma-combobox-behavior';
import type { usePharmaComboboxStateModel } from '../hooks/use-pharma-combobox-state-model';
import type { PharmaComboboxControllerConfig } from './preset-controller-config';
import {
  getPharmaComboboxRootProps,
  getPharmaComboboxViewProps,
} from './preset-controller-props';

type PharmaComboboxStateModel<Item> = ReturnType<
  typeof usePharmaComboboxStateModel<Item>
>;
type PharmaComboboxBehavior<Item> = ReturnType<
  typeof usePharmaComboboxBehavior<Item>
>;

export function getPharmaComboboxViewModel<Item>({
  behavior,
  config,
  state,
}: {
  behavior: PharmaComboboxBehavior<Item>;
  config: PharmaComboboxControllerConfig<Item>;
  state: PharmaComboboxStateModel<Item>;
}) {
  const { core, feedback, focus, selection } = state;
  const comboboxRootProps = getPharmaComboboxRootProps({
    actualOpen: core.actualOpen,
    disabled: config.disabled,
    effectiveHighlightedIndex: behavior.effectiveHighlightedIndex,
    effectiveRequired: core.effectiveRequired,
    form: config.form,
    handleInputValueChange: behavior.handleInputValueChange,
    handleItemHighlighted: behavior.handleItemHighlighted,
    handleOpenChange: focus.handleOpenChange,
    handleRequiredInvalid: feedback.handleComboboxInvalid,
    handleValueChange: behavior.handleValueChange,
    inputValue: core.inputValue,
    isItemDisabled: selection.isItemDisabled,
    isItemEqualToValue: config.isItemEqualToValue,
    itemToStringLabel: config.itemToStringLabel,
    itemToStringValue: config.itemToStringValue,
    items: config.items,
    listboxLabelId: feedback.listboxLabelId,
    name: config.name,
    readOnly: config.readOnly,
    searchable: config.searchable,
    selectedValue: core.selectedValue,
    visibleItems: selection.visibleItems,
  });
  const {
    emptyAction,
    optionListProps,
    searchHeaderProps,
    triggerButtonProps,
    validationState,
  } = getPharmaComboboxViewProps({
    ariaLabel: config.ariaLabel,
    canCreate: selection.canCreate,
    controlName: feedback.controlName,
    createActionLabel: selection.createActionLabel,
    effectiveHighlightedIndex: behavior.effectiveHighlightedIndex,
    effectiveId: core.effectiveId,
    handleCreate: selection.handleCreate,
    handleItemLeave: behavior.handleItemLeave,
    handleListScroll: behavior.handleListScroll,
    handleOptionListMouseLeave: behavior.handleOptionListMouseLeave,
    handleOptionMouseEnter: behavior.handleOptionMouseEnter,
    handleOptionMouseMove: behavior.handleOptionMouseMove,
    handleSearchInputKeyDown: behavior.handleSearchInputKeyDown,
    handleTriggerKeyDown: behavior.handleTriggerKeyDown,
    handleTriggerMouseEnter: behavior.handleTriggerMouseEnter,
    handleTriggerMouseLeave: behavior.handleTriggerMouseLeave,
    hasHeldHighlightFrame: behavior.heldHighlightFrame !== null,
    hasVisibleItems: selection.hasVisibleItems,
    indicator: config.indicator,
    inputValue: core.inputValue,
    isItemDisabled: selection.isItemDisabled,
    isSearchNavigationFocus: core.isSearchNavigationFocus,
    itemToStringLabel: config.itemToStringLabel,
    itemToStringValue: config.itemToStringValue,
    listRef: core.listRef,
    listboxAriaLabel: feedback.listboxAriaLabel,
    normalizedInputValue: selection.normalizedInputValue,
    placeholder: config.placeholder,
    renderOption: config.renderOption,
    renderOptionMeta: config.renderOptionMeta,
    searchInputRef: core.searchInputRef,
    searchPlaceholder: config.searchPlaceholder,
    selectedValue: core.selectedValue,
    selectedVisibleIndex: behavior.selectedVisibleIndex,
    setIsSearchNavigationFocus: core.setIsSearchNavigationFocus,
    setTriggerButtonRef: focus.setTriggerButtonRef,
    showValidation: feedback.showValidation,
    tabIndex: config.tabIndex,
    triggerDescribedBy: feedback.triggerDescribedBy,
    triggerLabelledBy: feedback.triggerLabelledBy,
    validation: config.validation,
    validationMessageId: feedback.validationMessageId,
    validationEnabled: feedback.validationEnabled,
    valueId: core.valueId,
    visibleItems: selection.visibleItems,
    virtualScrollToIndexRef: core.virtualScrollToIndexRef,
    visualHighlightId: `combobox-active-background-${core.instanceId}`,
  });

  return {
    actualOpen: core.actualOpen,
    className: config.className,
    comboboxRootProps,
    controlName: feedback.controlName,
    emptyText: config.emptyText,
    emptyAction,
    fallbackLabelId: core.fallbackLabelId,
    handleComboboxBlur: feedback.handleComboboxBlur,
    hasVisibleItems: selection.hasVisibleItems,
    heldHighlightFrame: behavior.heldHighlightFrame,
    heldHighlightFrameKey: behavior.heldHighlightFrameKey,
    hoverDetail: behavior.hoverDetail,
    optionListProps,
    popupClassName: config.popupClassName,
    popupContainerRef: config.popupContainerRef,
    popupMatchAnchorWidth: config.popupMatchAnchorWidth,
    popupContentRef: core.popupContentRef,
    rootRef: core.rootRef,
    searchable: config.searchable,
    searchHeaderProps,
    shouldRenderFallbackLabel: feedback.shouldRenderFallbackLabel,
    triggerButtonProps,
    validationState,
  };
}
