import type { ComboboxOptionListProps } from '../components/combobox-option-list';
import type { ComboboxSearchHeaderProps } from '../components/combobox-search-header';
import type { ComboboxTriggerButtonProps } from '../components/combobox-trigger-button';
import type { ComboboxRootProps } from '../internal/primitive';
import type { PharmaComboboxSelectProps } from '../presets-types';

export type PharmaComboboxRootBoundaryProps<Item> = Pick<
  ComboboxRootProps<Item>,
  | 'autoHighlight'
  | 'disabled'
  | 'filter'
  | 'filteredItems'
  | 'form'
  | 'highlightedIndex'
  | 'inputValue'
  | 'isItemDisabled'
  | 'isItemEqualToValue'
  | 'itemToStringLabel'
  | 'itemToStringValue'
  | 'items'
  | 'labelId'
  | 'name'
  | 'onInputValueChange'
  | 'onItemHighlighted'
  | 'onOpenChange'
  | 'onRequiredInvalid'
  | 'onValueChange'
  | 'open'
  | 'readOnly'
  | 'required'
  | 'value'
>;

type PharmaComboboxRootFormatters<Item> = {
  isItemDisabled: NonNullable<ComboboxRootProps<Item>['isItemDisabled']>;
  isItemEqualToValue?: ComboboxRootProps<Item>['isItemEqualToValue'];
  itemToStringLabel: NonNullable<ComboboxRootProps<Item>['itemToStringLabel']>;
  itemToStringValue: NonNullable<ComboboxRootProps<Item>['itemToStringValue']>;
};

type PharmaComboboxRootHandlers<Item> = {
  handleInputValueChange: NonNullable<
    ComboboxRootProps<Item>['onInputValueChange']
  >;
  handleItemHighlighted: NonNullable<
    ComboboxRootProps<Item>['onItemHighlighted']
  >;
  handleOpenChange: NonNullable<ComboboxRootProps<Item>['onOpenChange']>;
  handleRequiredInvalid: NonNullable<
    ComboboxRootProps<Item>['onRequiredInvalid']
  >;
  handleValueChange: NonNullable<ComboboxRootProps<Item>['onValueChange']>;
};

type PharmaComboboxRootInteraction = {
  disabled: boolean;
  readOnly: boolean;
  searchable: boolean;
};

type PharmaComboboxRootState<Item> = {
  actualOpen: boolean;
  effectiveHighlightedIndex: number | null;
  effectiveRequired: boolean;
  form?: string;
  inputValue: string;
  items: readonly Item[];
  listboxLabelId?: string;
  name?: string;
  selectedValue: Item | null;
  visibleItems: readonly Item[];
};

export interface PharmaComboboxRootPropsOptions<Item> {
  formatters: PharmaComboboxRootFormatters<Item>;
  handlers: PharmaComboboxRootHandlers<Item>;
  interaction: PharmaComboboxRootInteraction;
  state: PharmaComboboxRootState<Item>;
}

type PharmaComboboxViewAccessibility = {
  ariaLabel?: string;
  controlName: string;
  effectiveId?: string;
  listboxAriaLabel?: string;
  triggerDescribedBy?: string;
  triggerLabelledBy?: string;
  valueId: string;
  visualHighlightId: string;
};

type PharmaComboboxViewActions<Item> = {
  handleCreate: () => void;
  handleItemLeave: ComboboxOptionListProps<Item>['onItemLeave'];
  handleListScroll: ComboboxOptionListProps<Item>['onListScrollIntent'];
  handleOptionListMouseLeave: ComboboxOptionListProps<Item>['onListMouseLeave'];
  handleOptionMouseEnter: ComboboxOptionListProps<Item>['onOptionMouseEnter'];
  handleOptionMouseMove: ComboboxOptionListProps<Item>['onOptionMouseMove'];
  handleSearchInputKeyDown: ComboboxSearchHeaderProps['onSearchInputKeyDown'];
  handleTriggerKeyDown: ComboboxTriggerButtonProps['onNavigationKeyDown'];
  handleTriggerMouseEnter: ComboboxTriggerButtonProps['onMouseEnter'];
  handleTriggerMouseLeave: ComboboxTriggerButtonProps['onMouseLeave'];
  setIsSearchNavigationFocus: ComboboxSearchHeaderProps['onNavigationFocusChange'];
  setTriggerButtonRef: ComboboxTriggerButtonProps['setTriggerButtonRef'];
};

type PharmaComboboxViewDisplay<Item> = {
  createActionLabel: string;
  indicator: ComboboxOptionListProps<Item>['indicator'];
  placeholder: string;
  renderOption?: NonNullable<
    PharmaComboboxSelectProps<Item>['display']
  >['renderOption'];
  renderOptionMeta?: NonNullable<
    PharmaComboboxSelectProps<Item>['display']
  >['renderOptionMeta'];
  searchPlaceholder: string;
};

type PharmaComboboxViewInteraction = {
  tabIndex?: number;
};

type PharmaComboboxViewRefs<Item> = {
  listRef: ComboboxOptionListProps<Item>['listRef'];
  searchInputRef: ComboboxSearchHeaderProps['searchInputRef'];
  virtualScrollToIndexRef: ComboboxOptionListProps<Item>['virtualScrollToIndexRef'];
};

type PharmaComboboxViewState<Item> = {
  canCreate: boolean;
  effectiveHighlightedIndex: number | null;
  hasHeldHighlightFrame: boolean;
  hasVisibleItems: boolean;
  inputValue: string;
  isSearchNavigationFocus: boolean;
  itemToStringLabel: ComboboxOptionListProps<Item>['itemToStringLabel'];
  itemToStringValue: ComboboxOptionListProps<Item>['itemToStringValue'];
  normalizedInputValue: string;
  selectedValue: Item | null;
  selectedVisibleIndex: number;
  visibleItems: readonly Item[];
};

type PharmaComboboxViewValidation<Item> = {
  showValidation: boolean | undefined;
  validation?: PharmaComboboxSelectProps<Item>['validation'];
  validationEnabled: boolean;
  validationMessageId: string;
};

export interface PharmaComboboxViewPropsOptions<Item> {
  accessibility: PharmaComboboxViewAccessibility;
  actions: PharmaComboboxViewActions<Item>;
  display: PharmaComboboxViewDisplay<Item>;
  interaction: PharmaComboboxViewInteraction;
  refs: PharmaComboboxViewRefs<Item>;
  state: PharmaComboboxViewState<Item>;
  validation: PharmaComboboxViewValidation<Item>;
}

export const getPharmaComboboxRootProps = <Item>({
  formatters,
  handlers,
  interaction,
  state,
}: PharmaComboboxRootPropsOptions<Item>): PharmaComboboxRootBoundaryProps<Item> => ({
  items: state.items,
  value: state.selectedValue,
  onValueChange: handlers.handleValueChange,
  open: state.actualOpen,
  onOpenChange: handlers.handleOpenChange,
  inputValue: state.inputValue,
  onInputValueChange: handlers.handleInputValueChange,
  highlightedIndex: state.effectiveHighlightedIndex,
  onItemHighlighted: handlers.handleItemHighlighted,
  onRequiredInvalid: handlers.handleRequiredInvalid,
  itemToStringLabel: formatters.itemToStringLabel,
  itemToStringValue: formatters.itemToStringValue,
  isItemDisabled: formatters.isItemDisabled,
  isItemEqualToValue: formatters.isItemEqualToValue,
  labelId: state.listboxLabelId,
  name: state.name,
  form: state.form,
  disabled: interaction.disabled,
  readOnly: interaction.readOnly,
  required: state.effectiveRequired,
  filteredItems: state.visibleItems,
  filter: null,
  autoHighlight: interaction.searchable,
});

export const getPharmaComboboxViewProps = <Item>({
  accessibility,
  actions,
  display,
  interaction,
  refs,
  state,
  validation,
}: PharmaComboboxViewPropsOptions<Item>) => {
  const selectedLabel =
    state.selectedValue == null
      ? ''
      : state.itemToStringLabel(state.selectedValue);
  const shouldAnimateListItems =
    state.normalizedInputValue.length > 0 && state.hasVisibleItems;

  return {
    emptyAction: {
      canCreate: state.canCreate,
      label: display.createActionLabel,
      onCreate: actions.handleCreate,
    },
    optionListProps: {
      effectiveHighlightedIndex: state.effectiveHighlightedIndex,
      hasHeldHighlightFrame: state.hasHeldHighlightFrame,
      hasVisibleItems: state.hasVisibleItems,
      indicator: display.indicator,
      inputValue: state.inputValue,
      itemToStringLabel: state.itemToStringLabel,
      itemToStringValue: state.itemToStringValue,
      listRef: refs.listRef,
      listboxAriaLabel: accessibility.listboxAriaLabel,
      onItemLeave: actions.handleItemLeave,
      onListMouseLeave: actions.handleOptionListMouseLeave,
      onListScrollIntent: actions.handleListScroll,
      onOptionMouseEnter: actions.handleOptionMouseEnter,
      onOptionMouseMove: actions.handleOptionMouseMove,
      renderOption: display.renderOption,
      renderOptionMeta: display.renderOptionMeta,
      selectedVisibleIndex: state.selectedVisibleIndex,
      shouldAnimateListItems,
      visibleItems: state.visibleItems,
      virtualScrollToIndexRef: refs.virtualScrollToIndexRef,
      visualHighlightId: accessibility.visualHighlightId,
    },
    searchHeaderProps: {
      controlName: accessibility.controlName,
      isSearchNavigationFocus: state.isSearchNavigationFocus,
      normalizedInputValue: state.normalizedInputValue,
      onNavigationFocusChange: actions.setIsSearchNavigationFocus,
      onSearchInputKeyDown: actions.handleSearchInputKeyDown,
      searchInputRef: refs.searchInputRef,
      searchPlaceholder: display.searchPlaceholder,
    },
    triggerButtonProps: {
      id: accessibility.effectiveId,
      ariaLabel: accessibility.ariaLabel,
      ariaLabelledBy: accessibility.triggerLabelledBy,
      ariaDescribedBy: accessibility.triggerDescribedBy,
      ariaInvalid: Boolean(validation.showValidation),
      tabIndex: interaction.tabIndex,
      onMouseEnter: actions.handleTriggerMouseEnter,
      onMouseLeave: actions.handleTriggerMouseLeave,
      onNavigationKeyDown: actions.handleTriggerKeyDown,
      placeholder: display.placeholder,
      selectedLabel,
      setTriggerButtonRef: actions.setTriggerButtonRef,
      valueId: accessibility.valueId,
    },
    validationState: {
      autoHide: validation.validation?.autoHide,
      autoHideDelay: validation.validation?.autoHideDelay,
      enabled: validation.validationEnabled,
      messageId: validation.validationMessageId,
      show: validation.showValidation,
    },
  };
};
