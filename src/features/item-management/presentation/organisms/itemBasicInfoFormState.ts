interface ItemCodeStateParams {
  currentCode: string;
  generatedCode: string;
  isEditMode: boolean;
}

const hasGeneratedPlaceholder = (code: string) =>
  code.includes('[XXX]') || code.includes('-...');

export const shouldApplyGeneratedItemCode = ({
  currentCode,
  generatedCode,
  isEditMode,
}: ItemCodeStateParams) => {
  if (!generatedCode) return false;

  const shouldUpdateCode =
    !isEditMode || !currentCode.trim() || hasGeneratedPlaceholder(currentCode);

  return shouldUpdateCode && generatedCode !== currentCode;
};

export const getItemBasicInfoDisplayCode = ({
  currentCode,
  generatedCode,
  isEditMode,
}: ItemCodeStateParams) => {
  if (
    isEditMode &&
    currentCode.trim() &&
    !hasGeneratedPlaceholder(currentCode)
  ) {
    return currentCode;
  }

  return generatedCode || currentCode || 'Auto-generated';
};
