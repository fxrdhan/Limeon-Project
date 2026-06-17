export const focusIdentitySearchInput = () => {
  document
    .querySelector<HTMLInputElement>('input[placeholder*="Cari"]')
    ?.focus();
};

export const focusEditableIdentityField = (fieldId: string) => {
  const element = document.getElementById(fieldId);
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  ) {
    element.focus();
  }
};
