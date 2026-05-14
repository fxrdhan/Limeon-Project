import type { PharmaComboboxValidationConfig } from '../presets-types';
import { useComboboxAccessibility } from './use-combobox-accessibility';
import { useComboboxValidation } from './use-combobox-validation';

type PharmaComboboxFeedbackProps<Item> = {
  'aria-describedby'?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  effectiveLabel?: string;
  effectiveRequired: boolean;
  fallbackLabelId: string;
  formFieldLabelId?: string;
  isFocusWithinCombobox: (target: EventTarget | null) => boolean;
  name?: string;
  placeholder: string;
  selectedValue: Item | null;
  validation?: PharmaComboboxValidationConfig;
  valueId: string;
};

export function usePharmaComboboxFeedback<Item>({
  'aria-describedby': ariaDescribedBy,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  effectiveLabel,
  effectiveRequired,
  fallbackLabelId,
  formFieldLabelId,
  isFocusWithinCombobox,
  name,
  placeholder,
  selectedValue,
  validation,
  valueId,
}: PharmaComboboxFeedbackProps<Item>) {
  const {
    handleComboboxBlur,
    handleComboboxInvalid,
    showValidation,
    validationEnabled,
    validationMessageId,
  } = useComboboxValidation({
    effectiveRequired,
    isFocusWithinCombobox,
    selectedValue,
    validation,
  });
  const accessibility = useComboboxAccessibility({
    ariaDescribedBy,
    ariaLabel,
    ariaLabelledBy,
    fallbackLabelId,
    formFieldLabelId,
    label: effectiveLabel,
    name,
    placeholder,
    showValidation,
    validationMessageId,
    valueId,
  });

  return {
    ...accessibility,
    handleComboboxBlur,
    handleComboboxInvalid,
    showValidation,
    validationEnabled,
    validationMessageId,
  };
}
