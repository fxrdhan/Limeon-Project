export const truncateText = (text: string, maxWidth: number): string => {
  if (!text) return text;

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) return text;

  // Use font from Tailwind @theme (defined in App.scss)
  const fontFamily = getComputedStyle(document.documentElement)
    .getPropertyValue('--font-sans')
    .trim();
  const fontSize = getComputedStyle(document.documentElement)
    .getPropertyValue('--font-size-base')
    .trim();
  context.font = `500 ${fontSize} ${fontFamily}`;

  const textWidth = context.measureText(text).width;

  if (textWidth <= maxWidth) return text;

  let truncated = text;
  while (
    context.measureText(truncated + '...').width > maxWidth &&
    truncated.length > 0
  ) {
    truncated = truncated.slice(0, -1);
  }

  return truncated + '...';
};

export const shouldTruncateText = (text: string, maxWidth: number): boolean => {
  if (!text) return false;

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) return false;

  // Use font from Tailwind @theme (defined in App.scss)
  const fontFamily = getComputedStyle(document.documentElement)
    .getPropertyValue('--font-sans')
    .trim();
  const fontSize = getComputedStyle(document.documentElement)
    .getPropertyValue('--font-size-base')
    .trim();
  context.font = `500 ${fontSize} ${fontFamily}`;

  return context.measureText(text).width > maxWidth;
};
