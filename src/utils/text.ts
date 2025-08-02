export const truncateText = (text: string, maxWidth: number): string => {
  if (!text) return text;

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) return text;

  context.font =
    '14px Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

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

  context.font =
    '14px Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

  return context.measureText(text).width > maxWidth;
};
