import type { PharmaComboboxSelectProps } from '../presets-types';
import { useComboboxAccessibility } from './use-combobox-accessibility';
import { useComboboxValidation } from './use-combobox-validation';

type PharmaComboboxFeedbackProps<Item> = Pick<
  PharmaComboboxSelectProps<Item>,
  'aria-describedby' | 'aria-label' | 'aria-labelledby' | 'name' | 'validation'
> & {
  effectiveLabel?: string;
  effectiveRequired: boolean;
  fallbackLabelId: string;
  formFieldLabelId?: string;
  isFocusWithinCombobox: (target: EventTarget | null) => boolean;
  placeholder: string;
  selectedValue: Item | null;
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
    showValidation,
    validationEnabled,
    validationMessageId,
  };
}
