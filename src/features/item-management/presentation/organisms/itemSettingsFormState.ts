interface ShouldRequestItemSettingsNextSectionOptions {
  hasRequestNextSection: boolean;
  key: string;
  shiftKey: boolean;
  target: EventTarget | null;
}

export const isItemSettingsExpiryTabTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;

  const isExpiryLabel =
    target.tagName === 'LABEL' &&
    target.getAttribute('for') === 'has_expiry_date';
  const isExpiryInput =
    target.tagName === 'INPUT' &&
    target.getAttribute('id') === 'has_expiry_date';

  return isExpiryLabel || isExpiryInput;
};

export const shouldRequestItemSettingsNextSection = ({
  hasRequestNextSection,
  key,
  shiftKey,
  target,
}: ShouldRequestItemSettingsNextSectionOptions) =>
  key === 'Tab' &&
  !shiftKey &&
  hasRequestNextSection &&
  isItemSettingsExpiryTabTarget(target);
