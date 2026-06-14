export type ComposerAttachmentMenuPosition = {
  top: number;
  left: number;
};

const HIDDEN_MENU_STYLE = {
  top: -10_000,
  left: -10_000,
  visibility: 'hidden' as const,
  pointerEvents: 'none' as const,
};

export const getDisplayedComposerAttachmentMenuPosition = ({
  hasBeenVisible,
  isRepositionPaused,
  resolvedPosition,
  settledPosition,
}: {
  hasBeenVisible: boolean;
  isRepositionPaused: boolean;
  resolvedPosition: ComposerAttachmentMenuPosition | null;
  settledPosition: ComposerAttachmentMenuPosition | null;
}) => {
  if (!isRepositionPaused) {
    return resolvedPosition;
  }

  return hasBeenVisible ? settledPosition : null;
};

export const isComposerAttachmentMenuVisible = ({
  displayedPosition,
  hasBeenVisible,
  isRepositionPaused,
}: {
  displayedPosition: ComposerAttachmentMenuPosition | null;
  hasBeenVisible: boolean;
  isRepositionPaused: boolean;
}) => (isRepositionPaused ? hasBeenVisible : Boolean(displayedPosition));

export const resolveComposerAttachmentMenuStyle = (
  position: ComposerAttachmentMenuPosition | null,
  offsetY: number
) => {
  if (!position) {
    return HIDDEN_MENU_STYLE;
  }

  return {
    top: position.top,
    left: position.left,
    willChange:
      offsetY !== 0 ? ('transform, opacity' as const) : ('opacity' as const),
  };
};
