import type { PharmaComboboxControllerConfig } from '../utils/preset-controller-config';
import { useComboboxFocusRestore } from './use-combobox-focus-restore';
import { usePharmaComboboxCoreState } from './use-pharma-combobox-core-state';
import { usePharmaComboboxFeedback } from './use-pharma-combobox-feedback';
import { usePharmaComboboxSelectionModel } from './use-pharma-combobox-selection-model';

export function usePharmaComboboxStateModel<Item>(
  config: PharmaComboboxControllerConfig<Item>
) {
  const core = usePharmaComboboxCoreState({
    id: config.id,
    isValueEmpty: config.isValueEmpty,
    label: config.label,
    open: config.open,
    required: config.required,
    value: config.value,
  });
  const focus = useComboboxFocusRestore<Item>({
    isOpenControlled: core.isOpenControlled,
    onOpenChange: config.onOpenChange,
    popupContentRef: core.popupContentRef,
    rootRef: core.rootRef,
    setUncontrolledOpen: core.setUncontrolledOpen,
  });
  const feedback = usePharmaComboboxFeedback({
    'aria-describedby': config.ariaDescribedBy,
    'aria-label': config.ariaLabel,
    'aria-labelledby': config.ariaLabelledBy,
    effectiveLabel: core.effectiveLabel,
    effectiveRequired: core.effectiveRequired,
    fallbackLabelId: core.fallbackLabelId,
    formFieldLabelId: core.formFieldLabelId,
    isFocusWithinCombobox: focus.isFocusWithinCombobox,
    name: config.name,
    placeholder: config.placeholder,
    selectedValue: core.selectedValue,
    validation: config.validation,
    valueId: core.valueId,
  });
  const selection = usePharmaComboboxSelectionModel({
    createAction: config.createAction,
    inputValue: core.inputValue,
    isItemDisabledProp: config.isItemDisabledProp,
    isItemEqualToValue: config.isItemEqualToValue,
    itemToStringLabel: config.itemToStringLabel,
    itemToStringValue: config.itemToStringValue,
    items: config.items,
    name: config.name,
    selectedValue: core.selectedValue,
    visibleItemLimit: config.visibleItemLimit,
  });

  return {
    core,
    feedback,
    focus,
    selection,
  };
}
