export const DEFAULT_AG_GRID_NO_ROWS_TEXT_COLOR = 'oklch(55.4% 0.041 257.4)';

export const escapeAgGridOverlayText = (value: string) =>
  value.replace(/[&<>"']/g, char => {
    const replacements: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return replacements[char] ?? char;
  });

export const buildAgGridNoRowsOverlayTemplate = (
  message: string,
  textColor = DEFAULT_AG_GRID_NO_ROWS_TEXT_COLOR
) =>
  `<span style="padding: 10px; color: ${textColor};">${escapeAgGridOverlayText(message)}</span>`;
