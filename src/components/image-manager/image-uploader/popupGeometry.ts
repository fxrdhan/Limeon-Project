export type ImageUploaderPopupPosition = 'left' | 'right';

interface PopupSizeOptions {
  hasDelete: boolean;
  measuredRect?: Pick<DOMRect, 'height' | 'width'> | null;
  optionCount: number;
}

interface ClickPopupCoordinatesOptions {
  clickX: number;
  clickY: number;
  popupHeight: number;
  popupWidth: number;
  viewportHeight: number;
  viewportWidth: number;
}

interface AnchoredPopupGeometryOptions {
  containerRect: Pick<DOMRect, 'height' | 'left' | 'right' | 'top'>;
  popupWidth: number;
  viewportWidth: number;
}

const POPUP_MARGIN = 8;

export const getImageUploaderPopupSize = ({
  hasDelete,
  measuredRect,
  optionCount,
}: PopupSizeOptions) => ({
  width: measuredRect?.width || (hasDelete ? 120 : 100),
  height: measuredRect?.height || optionCount * 36 + 8,
});

export const getImageUploaderClickPopupCoordinates = ({
  clickX,
  clickY,
  popupHeight,
  popupWidth,
  viewportHeight,
  viewportWidth,
}: ClickPopupCoordinatesOptions) => ({
  x: Math.min(
    Math.max(clickX, POPUP_MARGIN),
    viewportWidth - popupWidth - POPUP_MARGIN
  ),
  y: Math.min(
    Math.max(clickY, POPUP_MARGIN),
    viewportHeight - popupHeight - POPUP_MARGIN
  ),
});

export const getImageUploaderAnchoredPopupGeometry = ({
  containerRect,
  popupWidth,
  viewportWidth,
}: AnchoredPopupGeometryOptions): {
  coordinates: { x: number; y: number };
  position: ImageUploaderPopupPosition;
} => {
  const spaceOnRight = viewportWidth - containerRect.right - POPUP_MARGIN;
  const spaceOnLeft = containerRect.left - POPUP_MARGIN;
  const centerY = containerRect.top + containerRect.height / 2;

  if (spaceOnRight >= popupWidth) {
    return {
      position: 'right',
      coordinates: {
        x: containerRect.right + POPUP_MARGIN,
        y: centerY,
      },
    };
  }

  if (spaceOnLeft >= popupWidth) {
    return {
      position: 'left',
      coordinates: {
        x: containerRect.left - popupWidth - POPUP_MARGIN,
        y: centerY,
      },
    };
  }

  if (spaceOnRight >= spaceOnLeft) {
    return {
      position: 'right',
      coordinates: {
        x: Math.min(
          containerRect.right + POPUP_MARGIN,
          viewportWidth - popupWidth - POPUP_MARGIN
        ),
        y: centerY,
      },
    };
  }

  return {
    position: 'left',
    coordinates: {
      x: Math.max(containerRect.left - popupWidth - POPUP_MARGIN, POPUP_MARGIN),
      y: centerY,
    },
  };
};
