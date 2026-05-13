import type { ComboboxOptionListProps } from '../components/combobox-option-list';
import type { ComboboxSearchHeaderProps } from '../components/combobox-search-header';
import type { ComboboxTriggerButtonProps } from '../components/combobox-trigger-button';
import type { ComboboxRootProps } from '../primitive';
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

type PharmaComboboxRootPropsOptions<Item> = {
  actualOpen: boolean;
  disabled: boolean;
  effectiveHighlightedIndex: number | null;
  effectiveRequired: boolean;
  form?: string;
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
  inputValue: string;
  isItemDisabled: NonNullable<ComboboxRootProps<Item>['isItemDisabled']>;
  isItemEqualToValue?: ComboboxRootProps<Item>['isItemEqualToValue'];
  itemToStringLabel: NonNullable<ComboboxRootProps<Item>['itemToStringLabel']>;
  itemToStringValue: NonNullable<ComboboxRootProps<Item>['itemToStringValue']>;
  items: Item[];
  listboxLabelId?: string;
  name?: string;
  readOnly: boolean;
  searchable: boolean;
  selectedValue: Item | null;
  visibleItems: Item[];
};

type PharmaComboboxViewPropsOptions<Item> = {
  ariaLabel?: string;
  canCreate: boolean;
  controlName: string;
  createActionLabel: string;
  effectiveHighlightedIndex: number | null;
  effectiveId?: string;
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
  hasHeldHighlightFrame: boolean;
  hasVisibleItems: boolean;
  indicator: ComboboxOptionListProps<Item>['indicator'];
  inputValue: string;
  isItemDisabled: ComboboxOptionListProps<Item>['isItemDisabled'];
  isSearchNavigationFocus: boolean;
  itemToStringLabel: ComboboxOptionListProps<Item>['itemToStringLabel'];
  itemToStringValue: ComboboxOptionListProps<Item>['itemToStringValue'];
  listRef: ComboboxOptionListProps<Item>['listRef'];
  listboxAriaLabel?: string;
  normalizedInputValue: string;
  placeholder: string;
  renderOption?: PharmaComboboxSelectProps<Item>['renderOption'];
  renderOptionMeta?: PharmaComboboxSelectProps<Item>['renderOptionMeta'];
  searchInputRef: ComboboxSearchHeaderProps['searchInputRef'];
  searchPlaceholder: string;
  selectedValue: Item | null;
  selectedVisibleIndex: number;
  setTriggerButtonRef: ComboboxTriggerButtonProps['setTriggerButtonRef'];
  setIsSearchNavigationFocus: ComboboxSearchHeaderProps['onNavigationFocusChange'];
  showValidation: boolean | undefined;
  tabIndex?: number;
  triggerDescribedBy?: string;
  triggerLabelledBy?: string;
  validation?: PharmaComboboxSelectProps<Item>['validation'];
  validationEnabled: boolean;
  validationMessageId: string;
  valueId: string;
  visibleItems: Item[];
  virtualScrollToIndexRef: ComboboxOptionListProps<Item>['virtualScrollToIndexRef'];
  visualHighlightId: string;
};

export const getPharmaComboboxRootProps = <Item>({
  actualOpen,
  disabled,
  effectiveHighlightedIndex,
  effectiveRequired,
  form,
  handleInputValueChange,
  handleItemHighlighted,
  handleOpenChange,
  handleRequiredInvalid,
  handleValueChange,
  inputValue,
  isItemDisabled,
  isItemEqualToValue,
  itemToStringLabel,
  itemToStringValue,
  items,
  listboxLabelId,
  name,
  readOnly,
  searchable,
  selectedValue,
  visibleItems,
}: PharmaComboboxRootPropsOptions<Item>): PharmaComboboxRootBoundaryProps<Item> => ({
  items,
  value: selectedValue,
  onValueChange: handleValueChange,
  open: actualOpen,
  onOpenChange: handleOpenChange,
  inputValue,
  onInputValueChange: handleInputValueChange,
  highlightedIndex: effectiveHighlightedIndex,
  onItemHighlighted: handleItemHighlighted,
  onRequiredInvalid: handleRequiredInvalid,
  itemToStringLabel,
  itemToStringValue,
  isItemDisabled,
  isItemEqualToValue,
  labelId: listboxLabelId,
  name,
  form,
  disabled,
  readOnly,
  required: effectiveRequired,
  filteredItems: visibleItems,
  filter: null,
  autoHighlight: searchable,
});

export const getPharmaComboboxViewProps = <Item>({
  ariaLabel,
  canCreate,
  controlName,
  createActionLabel,
  effectiveHighlightedIndex,
  effectiveId,
  handleCreate,
  handleItemLeave,
  handleListScroll,
  handleOptionListMouseLeave,
  handleOptionMouseEnter,
  handleOptionMouseMove,
  handleSearchInputKeyDown,
  handleTriggerKeyDown,
  handleTriggerMouseEnter,
  handleTriggerMouseLeave,
  hasHeldHighlightFrame,
  hasVisibleItems,
  indicator,
  inputValue,
  isItemDisabled,
  isSearchNavigationFocus,
  itemToStringLabel,
  itemToStringValue,
  listRef,
  listboxAriaLabel,
  normalizedInputValue,
  placeholder,
  renderOption,
  renderOptionMeta,
  searchInputRef,
  searchPlaceholder,
  selectedValue,
  selectedVisibleIndex,
  setTriggerButtonRef,
  setIsSearchNavigationFocus,
  showValidation,
  tabIndex,
  triggerDescribedBy,
  triggerLabelledBy,
  validation,
  validationEnabled,
  validationMessageId,
  valueId,
  visibleItems,
  virtualScrollToIndexRef,
  visualHighlightId,
}: PharmaComboboxViewPropsOptions<Item>) => {
  const selectedLabel =
    selectedValue == null ? '' : itemToStringLabel(selectedValue);
  const shouldAnimateListItems =
    normalizedInputValue.length > 0 && hasVisibleItems;

  return {
    emptyAction: {
      canCreate,
      label: createActionLabel,
      onCreate: handleCreate,
    },
    optionListProps: {
      effectiveHighlightedIndex,
      hasHeldHighlightFrame,
      hasVisibleItems,
      indicator,
      inputValue,
      isItemDisabled,
      itemToStringLabel,
      itemToStringValue,
      listRef,
      listboxAriaLabel,
      onItemLeave: handleItemLeave,
      onListMouseLeave: handleOptionListMouseLeave,
      onListScrollIntent: handleListScroll,
      onOptionMouseEnter: handleOptionMouseEnter,
      onOptionMouseMove: handleOptionMouseMove,
      renderOption,
      renderOptionMeta,
      selectedVisibleIndex,
      shouldAnimateListItems,
      visibleItems,
      virtualScrollToIndexRef,
      visualHighlightId,
    },
    searchHeaderProps: {
      controlName,
      isSearchNavigationFocus,
      normalizedInputValue,
      onNavigationFocusChange: setIsSearchNavigationFocus,
      onSearchInputKeyDown: handleSearchInputKeyDown,
      searchInputRef,
      searchPlaceholder,
    },
    triggerButtonProps: {
      id: effectiveId,
      ariaLabel,
      ariaLabelledBy: triggerLabelledBy,
      ariaDescribedBy: triggerDescribedBy,
      ariaInvalid: Boolean(showValidation),
      tabIndex,
      onMouseEnter: handleTriggerMouseEnter,
      onMouseLeave: handleTriggerMouseLeave,
      onNavigationKeyDown: handleTriggerKeyDown,
      placeholder,
      selectedLabel,
      setTriggerButtonRef,
      valueId,
    },
    validationState: {
      autoHide: validation?.autoHide,
      autoHideDelay: validation?.autoHideDelay,
      enabled: validationEnabled,
      messageId: validationMessageId,
      show: showValidation,
    },
  };
};
