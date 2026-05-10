import { getComboboxControlName } from '../utils/preset-state';

export function useComboboxAccessibility({
  ariaDescribedBy,
  ariaLabel,
  ariaLabelledBy,
  fallbackLabelId,
  formFieldLabelId,
  label,
  name,
  placeholder,
  showValidation,
  validationMessageId,
  valueId,
}: {
  ariaDescribedBy?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  fallbackLabelId: string;
  formFieldLabelId?: string;
  label?: string;
  name?: string;
  placeholder: string;
  showValidation: boolean | undefined;
  validationMessageId: string;
  valueId: string;
}) {
  const controlName = getComboboxControlName({
    ariaLabel,
    label,
    name,
    placeholder,
  });
  const shouldRenderFallbackLabel =
    !ariaLabelledBy && !ariaLabel && !formFieldLabelId;
  const triggerLabelledBy = ariaLabelledBy
    ? `${ariaLabelledBy} ${valueId}`
    : ariaLabel
      ? undefined
      : `${formFieldLabelId ?? fallbackLabelId} ${valueId}`;
  const listboxLabelId =
    ariaLabelledBy ??
    formFieldLabelId ??
    (shouldRenderFallbackLabel ? fallbackLabelId : undefined);
  const listboxAriaLabel = listboxLabelId
    ? undefined
    : (ariaLabel ?? controlName);
  const triggerDescribedBy =
    [ariaDescribedBy, showValidation ? validationMessageId : undefined]
      .filter(Boolean)
      .join(' ') || undefined;

  return {
    controlName,
    listboxAriaLabel,
    listboxLabelId,
    shouldRenderFallbackLabel,
    triggerDescribedBy,
    triggerLabelledBy,
  };
}
