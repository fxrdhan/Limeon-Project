import type { CSSProperties } from 'react';

const EXPORT_DROPDOWN_WIDTH = 230;
const EXPORT_DROPDOWN_MARGIN = 8;

export const getExportDropdownPortalStyle = (
  button: HTMLButtonElement
): CSSProperties => {
  const buttonRect = button.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  let leftPosition = buttonRect.right - EXPORT_DROPDOWN_WIDTH;

  if (
    leftPosition + EXPORT_DROPDOWN_WIDTH >
    viewportWidth - EXPORT_DROPDOWN_MARGIN
  ) {
    leftPosition =
      viewportWidth - EXPORT_DROPDOWN_WIDTH - EXPORT_DROPDOWN_MARGIN;
  }
  if (leftPosition < EXPORT_DROPDOWN_MARGIN) {
    leftPosition = EXPORT_DROPDOWN_MARGIN;
  }

  return {
    position: 'fixed',
    left: `${leftPosition}px`,
    top: `${buttonRect.bottom + window.scrollY + EXPORT_DROPDOWN_MARGIN}px`,
    width: `${EXPORT_DROPDOWN_WIDTH}px`,
    zIndex: 50,
  };
};
