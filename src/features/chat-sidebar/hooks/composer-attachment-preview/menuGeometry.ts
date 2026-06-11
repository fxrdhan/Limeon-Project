import {
  IMAGE_ACTIONS_MENU_FALLBACK_HEIGHT,
  IMAGE_ACTIONS_MENU_FALLBACK_WIDTH,
  IMAGE_ACTIONS_MENU_SIDE_GAP,
  IMAGE_ACTIONS_MENU_VIEWPORT_PADDING,
  PDF_COMPRESSION_LEVELS_MENU_FALLBACK_HEIGHT,
  PDF_COMPRESSION_LEVELS_MENU_FALLBACK_WIDTH,
  PDF_COMPRESSION_LEVELS_MENU_SIDE_GAP,
} from './constants';
import type { MenuPosition } from './types';

interface MenuSize {
  width: number;
  height: number;
}

const getRenderedMenuSize = (
  menuElement: HTMLDivElement | null,
  fallback: MenuSize
): MenuSize => {
  if (!menuElement) {
    return fallback;
  }

  const rect = menuElement.getBoundingClientRect();

  return {
    width: menuElement.offsetWidth || Math.ceil(rect.width) || fallback.width,
    height:
      menuElement.offsetHeight || Math.ceil(rect.height) || fallback.height,
  };
};

const getSideMenuPosition = ({
  targetButton,
  menuElement,
  fallback,
  sideGap,
}: {
  targetButton: HTMLButtonElement;
  menuElement: HTMLDivElement | null;
  fallback: MenuSize;
  sideGap: number;
}): MenuPosition => {
  const triggerRect = targetButton.getBoundingClientRect();
  const { width: menuWidth, height: menuHeight } = getRenderedMenuSize(
    menuElement,
    fallback
  );
  const maxLeft = Math.max(
    IMAGE_ACTIONS_MENU_VIEWPORT_PADDING,
    window.innerWidth - menuWidth - IMAGE_ACTIONS_MENU_VIEWPORT_PADDING
  );
  const preferredLeft = triggerRect.left - menuWidth - sideGap;
  const left = Math.min(
    Math.max(preferredLeft, IMAGE_ACTIONS_MENU_VIEWPORT_PADDING),
    maxLeft
  );
  const preferredTop =
    triggerRect.top + triggerRect.height / 2 - menuHeight / 2;
  const maxTop = Math.max(
    IMAGE_ACTIONS_MENU_VIEWPORT_PADDING,
    window.innerHeight - menuHeight - IMAGE_ACTIONS_MENU_VIEWPORT_PADDING
  );
  const top = Math.min(
    Math.max(preferredTop, IMAGE_ACTIONS_MENU_VIEWPORT_PADDING),
    maxTop
  );

  return { top, left };
};

export const getImageActionsMenuPosition = (
  targetButton: HTMLButtonElement,
  menuElement: HTMLDivElement | null
): MenuPosition =>
  getSideMenuPosition({
    targetButton,
    menuElement,
    fallback: {
      width: IMAGE_ACTIONS_MENU_FALLBACK_WIDTH,
      height: IMAGE_ACTIONS_MENU_FALLBACK_HEIGHT,
    },
    sideGap: IMAGE_ACTIONS_MENU_SIDE_GAP,
  });

export const getPdfCompressionMenuPosition = (
  targetButton: HTMLButtonElement,
  menuElement: HTMLDivElement | null
): MenuPosition =>
  getSideMenuPosition({
    targetButton,
    menuElement,
    fallback: {
      width: PDF_COMPRESSION_LEVELS_MENU_FALLBACK_WIDTH,
      height: PDF_COMPRESSION_LEVELS_MENU_FALLBACK_HEIGHT,
    },
    sideGap: PDF_COMPRESSION_LEVELS_MENU_SIDE_GAP,
  });
