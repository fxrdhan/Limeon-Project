export const getPercentageInputValue = (
  value: string,
  maxValue: number = 100
) => {
  const inputValue = value.endsWith('%') ? value.slice(0, -1) : value;
  const numericValue = parseInt(inputValue.replace(/[^\d]/g, ''), 10) || 0;

  return Math.min(numericValue, maxValue);
};

export const getPercentageBackspaceValue = ({
  currentValue,
  inputLength,
  key,
  selectionStart,
}: {
  currentValue: number;
  inputLength: number;
  key: string;
  selectionStart: number | null;
}) => {
  if (
    key !== 'Backspace' ||
    currentValue <= 0 ||
    selectionStart !== inputLength
  ) {
    return null;
  }

  return Math.floor(currentValue / 10);
};
