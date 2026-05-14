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
    formatters: {
      isItemDisabled: selection.isItemDisabled,
      isItemEqualToValue: config.isItemEqualToValue,
      itemToStringLabel: config.itemToStringLabel,
      itemToStringValue: config.itemToStringValue,
    },
    handlers: {
      handleInputValueChange: behavior.handleInputValueChange,
      handleItemHighlighted: behavior.handleItemHighlighted,
      handleOpenChange: focus.handleOpenChange,
      handleRequiredInvalid: feedback.handleComboboxInvalid,
      handleValueChange: behavior.handleValueChange,
    },
    interaction: {
      disabled: config.disabled,
      readOnly: config.readOnly,
      searchable: config.searchable,
    },
    state: {
      actualOpen: core.actualOpen,
      effectiveHighlightedIndex: behavior.effectiveHighlightedIndex,
      effectiveRequired: core.effectiveRequired,
      form: config.form,
      inputValue: core.inputValue,
      items: config.items,
      listboxLabelId: feedback.listboxLabelId,
      name: config.name,
      selectedValue: core.selectedValue,
      visibleItems: selection.visibleItems,
    },
  });
  const {
    emptyAction,
    optionListProps,
    searchHeaderProps,
    triggerButtonProps,
    validationState,
  } = getPharmaComboboxViewProps({
    accessibility: {
      ariaLabel: config.ariaLabel,
      controlName: feedback.controlName,
      effectiveId: core.effectiveId,
      listboxAriaLabel: feedback.listboxAriaLabel,
      triggerDescribedBy: feedback.triggerDescribedBy,
      triggerLabelledBy: feedback.triggerLabelledBy,
      valueId: core.valueId,
      visualHighlightId: `combobox-active-background-${core.instanceId}`,
    },
    actions: {
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
      setIsSearchNavigationFocus: core.setIsSearchNavigationFocus,
      setTriggerButtonRef: focus.setTriggerButtonRef,
    },
    display: {
      createActionLabel: selection.createActionLabel,
      indicator: config.indicator,
      placeholder: config.placeholder,
      renderOption: config.renderOption,
      renderOptionMeta: config.renderOptionMeta,
      searchPlaceholder: config.searchPlaceholder,
    },
    interaction: {
      tabIndex: config.tabIndex,
    },
    refs: {
      listRef: core.listRef,
      searchInputRef: core.searchInputRef,
      virtualScrollToIndexRef: core.virtualScrollToIndexRef,
    },
    state: {
      canCreate: selection.canCreate,
      effectiveHighlightedIndex: behavior.effectiveHighlightedIndex,
      hasHeldHighlightFrame: behavior.heldHighlightFrame !== null,
      hasVisibleItems: selection.hasVisibleItems,
      inputValue: core.inputValue,
      isSearchNavigationFocus: core.isSearchNavigationFocus,
      itemToStringLabel: config.itemToStringLabel,
      itemToStringValue: config.itemToStringValue,
      normalizedInputValue: selection.normalizedInputValue,
      selectedValue: core.selectedValue,
      selectedVisibleIndex: behavior.selectedVisibleIndex,
      visibleItems: selection.visibleItems,
    },
    validation: {
      showValidation: feedback.showValidation,
      validation: config.validation,
      validationEnabled: feedback.validationEnabled,
      validationMessageId: feedback.validationMessageId,
    },
  });

  return {
    feedback: {
      controlName: feedback.controlName,
      fallbackLabelId: core.fallbackLabelId,
      shouldRenderFallbackLabel: feedback.shouldRenderFallbackLabel,
      validationState,
    },
    highlight: {
      heldFrame: behavior.heldHighlightFrame,
      heldFrameKey: behavior.heldHighlightFrameKey,
    },
    hoverDetail: behavior.hoverDetail,
    options: {
      emptyAction,
      emptyText: config.emptyText,
      hasVisibleItems: selection.hasVisibleItems,
      optionListProps,
    },
    popup: {
      className: config.popupClassName,
      containerRef: config.popupContainerRef,
      contentRef: core.popupContentRef,
      matchAnchorWidth: config.popupMatchAnchorWidth,
    },
    root: {
      actualOpen: core.actualOpen,
      className: config.className,
      comboboxRootProps,
      handleComboboxBlur: feedback.handleComboboxBlur,
      rootRef: core.rootRef,
    },
    search: {
      searchable: config.searchable,
      searchHeaderProps,
    },
    trigger: {
      triggerButtonProps,
    },
  };
}
