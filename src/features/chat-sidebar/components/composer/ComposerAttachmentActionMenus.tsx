import type { PopupMenuAction } from '@/components/image-manager/PopupMenuContent';
import PopupMenuContent from '@/components/image-manager/PopupMenuContent';
import PopupMenuPopover from '@/components/shared/popup-menu-popover';
import { createPortal } from 'react-dom';
import { CHAT_POPUP_MENU_SURFACE_CLASS_NAME } from '../chatPopupSurface';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import {
  getDisplayedComposerAttachmentMenuPosition,
  isComposerAttachmentMenuVisible,
  resolveComposerAttachmentMenuStyle,
  type ComposerAttachmentMenuPosition,
} from './composerAttachmentActionMenuState';

const CHAT_POPOVER_ICON_CLASS_NAME =
  '[&>svg]:!text-black hover:[&>svg]:!text-black data-[preselected=true]:[&>svg]:!text-black';
const IMAGE_ACTIONS_MENU_CLASS_NAME = 'fixed z-[120] origin-top-right';
const PDF_COMPRESSION_MENU_CLASS_NAME = 'fixed z-[121] origin-top-right';
const MENU_FADE_TRANSITION = {
  duration: 0.12,
  ease: 'easeOut',
} as const;
const MENU_OPEN_TRANSITION = {
  duration: 0.12,
  ease: 'easeOut',
} as const;
const MENU_REPOSITION_TRANSITION = {
  duration: 0.18,
  ease: [0.22, 1, 0.36, 1],
} as const;
const MENU_INSTANT_TRANSITION = {
  duration: 0,
} as const;
const MENU_EXIT_ANIMATION_DURATION_MS = 140;

const useVerticalMenuReposition = (
  position: ComposerAttachmentMenuPosition | null
) => {
  const previousTopRef = useRef<number | null>(null);
  const [offsetY, setOffsetY] = useState(0);
  const [isRepositionAnimationEnabled, setIsRepositionAnimationEnabled] =
    useState(false);

  useLayoutEffect(() => {
    if (!position) {
      previousTopRef.current = null;
      setOffsetY(0);
      setIsRepositionAnimationEnabled(false);
      return;
    }

    const previousTop = previousTopRef.current;
    previousTopRef.current = position.top;

    if (previousTop === null) {
      setOffsetY(0);
      setIsRepositionAnimationEnabled(false);
      return;
    }

    const nextOffsetY = previousTop - position.top;
    if (nextOffsetY === 0) {
      setOffsetY(0);
      return;
    }

    setIsRepositionAnimationEnabled(false);
    setOffsetY(nextOffsetY);

    const rafId = window.requestAnimationFrame(() => {
      setIsRepositionAnimationEnabled(true);
      setOffsetY(0);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [position]);

  return {
    offsetY,
    yTransition: isRepositionAnimationEnabled
      ? MENU_REPOSITION_TRANSITION
      : MENU_INSTANT_TRANSITION,
  };
};

interface ComposerAttachmentActionMenusProps {
  openImageActionsAttachmentId: string | null;
  isMenuRepositionPaused?: boolean;
  imageActionsMenuPosition: ComposerAttachmentMenuPosition | null;
  pdfCompressionMenuPosition: ComposerAttachmentMenuPosition | null;
  imageActions: PopupMenuAction[];
  pdfCompressionLevelActions: PopupMenuAction[];
  imageActionsMenuRef: RefObject<HTMLDivElement | null>;
  pdfCompressionMenuRef: RefObject<HTMLDivElement | null>;
}

export const ComposerAttachmentActionMenus = ({
  openImageActionsAttachmentId,
  isMenuRepositionPaused = false,
  imageActionsMenuPosition,
  pdfCompressionMenuPosition,
  imageActions,
  pdfCompressionLevelActions,
  imageActionsMenuRef,
  pdfCompressionMenuRef,
}: ComposerAttachmentActionMenusProps) => {
  const [cachedImageActions, setCachedImageActions] =
    useState<PopupMenuAction[]>(imageActions);
  const [cachedImageActionsMenuPosition, setCachedImageActionsMenuPosition] =
    useState<ComposerAttachmentMenuPosition | null>(imageActionsMenuPosition);
  const [settledImageActionsMenuPosition, setSettledImageActionsMenuPosition] =
    useState<ComposerAttachmentMenuPosition | null>(imageActionsMenuPosition);
  const [hasImageActionsMenuBeenVisible, setHasImageActionsMenuBeenVisible] =
    useState(false);
  const [
    cachedPdfCompressionLevelActions,
    setCachedPdfCompressionLevelActions,
  ] = useState<PopupMenuAction[]>(pdfCompressionLevelActions);
  const [
    cachedPdfCompressionMenuPosition,
    setCachedPdfCompressionMenuPosition,
  ] = useState<ComposerAttachmentMenuPosition | null>(
    pdfCompressionMenuPosition
  );
  const [
    settledPdfCompressionMenuPosition,
    setSettledPdfCompressionMenuPosition,
  ] = useState<ComposerAttachmentMenuPosition | null>(
    pdfCompressionMenuPosition
  );
  const [
    hasPdfCompressionMenuBeenVisible,
    setHasPdfCompressionMenuBeenVisible,
  ] = useState(false);
  const imageMenuCleanupTimeoutRef = useRef<number | null>(null);
  const pdfMenuCleanupTimeoutRef = useRef<number | null>(null);
  const isImageActionsMenuOpen = Boolean(openImageActionsAttachmentId);
  const isPdfCompressionMenuOpen =
    Boolean(pdfCompressionMenuPosition) &&
    pdfCompressionLevelActions.length > 0;
  const resolvedImageActions = isImageActionsMenuOpen
    ? imageActions
    : cachedImageActions;
  const resolvedImageActionsMenuPosition = isImageActionsMenuOpen
    ? imageActionsMenuPosition
    : cachedImageActionsMenuPosition;
  const resolvedPdfCompressionLevelActions = isPdfCompressionMenuOpen
    ? pdfCompressionLevelActions
    : cachedPdfCompressionLevelActions;
  const resolvedPdfCompressionMenuPosition = isPdfCompressionMenuOpen
    ? pdfCompressionMenuPosition
    : cachedPdfCompressionMenuPosition;
  const shouldRenderImageActionsMenu =
    isImageActionsMenuOpen || resolvedImageActions.length > 0;
  const shouldRenderPdfCompressionMenu =
    isPdfCompressionMenuOpen || resolvedPdfCompressionLevelActions.length > 0;
  const displayedImageActionsMenuPosition =
    getDisplayedComposerAttachmentMenuPosition({
      hasBeenVisible: hasImageActionsMenuBeenVisible,
      isRepositionPaused: isMenuRepositionPaused,
      resolvedPosition: resolvedImageActionsMenuPosition,
      settledPosition: settledImageActionsMenuPosition,
    });
  const displayedPdfCompressionMenuPosition =
    getDisplayedComposerAttachmentMenuPosition({
      hasBeenVisible: hasPdfCompressionMenuBeenVisible,
      isRepositionPaused: isMenuRepositionPaused,
      resolvedPosition: resolvedPdfCompressionMenuPosition,
      settledPosition: settledPdfCompressionMenuPosition,
    });
  const isImageActionsMenuVisuallyVisible = isComposerAttachmentMenuVisible({
    displayedPosition: displayedImageActionsMenuPosition,
    hasBeenVisible: hasImageActionsMenuBeenVisible,
    isRepositionPaused: isMenuRepositionPaused,
  });
  const isPdfCompressionMenuVisuallyVisible = isComposerAttachmentMenuVisible({
    displayedPosition: displayedPdfCompressionMenuPosition,
    hasBeenVisible: hasPdfCompressionMenuBeenVisible,
    isRepositionPaused: isMenuRepositionPaused,
  });
  const imageActionsMenuMotion = useVerticalMenuReposition(
    displayedImageActionsMenuPosition
  );
  const pdfCompressionMenuMotion = useVerticalMenuReposition(
    displayedPdfCompressionMenuPosition
  );
  const imageActionsMenuOffsetY = isMenuRepositionPaused
    ? 0
    : imageActionsMenuMotion.offsetY;
  const pdfCompressionMenuOffsetY = isMenuRepositionPaused
    ? 0
    : pdfCompressionMenuMotion.offsetY;

  useEffect(() => {
    if (!isImageActionsMenuOpen) {
      return;
    }

    if (imageMenuCleanupTimeoutRef.current !== null) {
      window.clearTimeout(imageMenuCleanupTimeoutRef.current);
      imageMenuCleanupTimeoutRef.current = null;
    }

    setCachedImageActions(imageActions);
    if (imageActionsMenuPosition) {
      setCachedImageActionsMenuPosition(imageActionsMenuPosition);
    }
  }, [imageActions, imageActionsMenuPosition, isImageActionsMenuOpen]);

  useEffect(() => {
    if (isImageActionsMenuOpen) {
      return;
    }

    imageMenuCleanupTimeoutRef.current = window.setTimeout(() => {
      setCachedImageActions([]);
      setCachedImageActionsMenuPosition(null);
      setSettledImageActionsMenuPosition(null);
      setHasImageActionsMenuBeenVisible(false);
      imageMenuCleanupTimeoutRef.current = null;
    }, MENU_EXIT_ANIMATION_DURATION_MS);

    return () => {
      if (imageMenuCleanupTimeoutRef.current !== null) {
        window.clearTimeout(imageMenuCleanupTimeoutRef.current);
        imageMenuCleanupTimeoutRef.current = null;
      }
    };
  }, [isImageActionsMenuOpen]);

  useEffect(() => {
    if (isMenuRepositionPaused || !resolvedImageActionsMenuPosition) {
      return;
    }

    setSettledImageActionsMenuPosition(previousPosition => {
      if (
        previousPosition?.top === resolvedImageActionsMenuPosition.top &&
        previousPosition?.left === resolvedImageActionsMenuPosition.left
      ) {
        return previousPosition;
      }

      return resolvedImageActionsMenuPosition;
    });
    setHasImageActionsMenuBeenVisible(true);
  }, [isMenuRepositionPaused, resolvedImageActionsMenuPosition]);

  useEffect(() => {
    if (!isPdfCompressionMenuOpen) {
      return;
    }

    if (pdfMenuCleanupTimeoutRef.current !== null) {
      window.clearTimeout(pdfMenuCleanupTimeoutRef.current);
      pdfMenuCleanupTimeoutRef.current = null;
    }

    setCachedPdfCompressionLevelActions(pdfCompressionLevelActions);
    if (pdfCompressionMenuPosition) {
      setCachedPdfCompressionMenuPosition(pdfCompressionMenuPosition);
    }
  }, [
    isPdfCompressionMenuOpen,
    pdfCompressionLevelActions,
    pdfCompressionMenuPosition,
  ]);

  useEffect(() => {
    if (isPdfCompressionMenuOpen) {
      return;
    }

    pdfMenuCleanupTimeoutRef.current = window.setTimeout(() => {
      setCachedPdfCompressionLevelActions([]);
      setCachedPdfCompressionMenuPosition(null);
      setSettledPdfCompressionMenuPosition(null);
      setHasPdfCompressionMenuBeenVisible(false);
      pdfMenuCleanupTimeoutRef.current = null;
    }, MENU_EXIT_ANIMATION_DURATION_MS);

    return () => {
      if (pdfMenuCleanupTimeoutRef.current !== null) {
        window.clearTimeout(pdfMenuCleanupTimeoutRef.current);
        pdfMenuCleanupTimeoutRef.current = null;
      }
    };
  }, [isPdfCompressionMenuOpen]);

  useEffect(() => {
    if (isMenuRepositionPaused || !resolvedPdfCompressionMenuPosition) {
      return;
    }

    setSettledPdfCompressionMenuPosition(previousPosition => {
      if (
        previousPosition?.top === resolvedPdfCompressionMenuPosition.top &&
        previousPosition?.left === resolvedPdfCompressionMenuPosition.left
      ) {
        return previousPosition;
      }

      return resolvedPdfCompressionMenuPosition;
    });
    setHasPdfCompressionMenuBeenVisible(true);
  }, [isMenuRepositionPaused, resolvedPdfCompressionMenuPosition]);

  useEffect(() => {
    return () => {
      if (imageMenuCleanupTimeoutRef.current !== null) {
        window.clearTimeout(imageMenuCleanupTimeoutRef.current);
      }
      if (pdfMenuCleanupTimeoutRef.current !== null) {
        window.clearTimeout(pdfMenuCleanupTimeoutRef.current);
      }
    };
  }, []);

  if (
    typeof document === 'undefined' ||
    (!shouldRenderImageActionsMenu && !shouldRenderPdfCompressionMenu)
  ) {
    return null;
  }

  const imageActionsMenuStyle = resolveComposerAttachmentMenuStyle(
    displayedImageActionsMenuPosition,
    imageActionsMenuOffsetY
  );

  return (
    <>
      {shouldRenderImageActionsMenu
        ? createPortal(
            <PopupMenuPopover
              isOpen={isImageActionsMenuOpen}
              className={IMAGE_ACTIONS_MENU_CLASS_NAME}
              style={imageActionsMenuStyle}
              initial={{
                opacity: 0,
                scale: 0.96,
                x: -6,
                y: imageActionsMenuOffsetY,
              }}
              animate={{
                opacity: isImageActionsMenuVisuallyVisible ? 1 : 0,
                scale: isImageActionsMenuVisuallyVisible ? 1 : 0.98,
                x: 0,
                y: imageActionsMenuOffsetY,
              }}
              exit={{
                opacity: 0,
                scale: 0.98,
                x: 0,
                y: imageActionsMenuOffsetY,
              }}
              transition={{
                opacity: MENU_FADE_TRANSITION,
                scale: MENU_OPEN_TRANSITION,
                x: MENU_OPEN_TRANSITION,
                y: imageActionsMenuMotion.yTransition,
              }}
            >
              <div
                ref={imageActionsMenuRef}
                onClick={event => event.stopPropagation()}
                role="presentation"
              >
                <PopupMenuContent
                  actions={resolvedImageActions}
                  minWidthClassName="min-w-[132px]"
                  enableArrowNavigation
                  autoFocusFirstItem
                  iconClassName={CHAT_POPOVER_ICON_CLASS_NAME}
                  enableAnimatedHighlight
                  surfaceClassName={CHAT_POPUP_MENU_SURFACE_CLASS_NAME}
                />
              </div>
            </PopupMenuPopover>,
            document.body
          )
        : null}

      {shouldRenderPdfCompressionMenu
        ? createPortal(
            <PopupMenuPopover
              isOpen={isPdfCompressionMenuOpen}
              className={PDF_COMPRESSION_MENU_CLASS_NAME}
              style={resolveComposerAttachmentMenuStyle(
                displayedPdfCompressionMenuPosition,
                pdfCompressionMenuOffsetY
              )}
              initial={{
                opacity: 0,
                scale: 0.96,
                x: -6,
                y: pdfCompressionMenuOffsetY,
              }}
              animate={{
                opacity: isPdfCompressionMenuVisuallyVisible ? 1 : 0,
                scale: isPdfCompressionMenuVisuallyVisible ? 1 : 0.98,
                x: 0,
                y: pdfCompressionMenuOffsetY,
              }}
              exit={{
                opacity: 0,
                scale: 0.98,
                x: 0,
                y: pdfCompressionMenuOffsetY,
              }}
              transition={{
                opacity: MENU_FADE_TRANSITION,
                scale: MENU_OPEN_TRANSITION,
                x: MENU_OPEN_TRANSITION,
                y: pdfCompressionMenuMotion.yTransition,
              }}
            >
              <div
                ref={pdfCompressionMenuRef}
                onClick={event => event.stopPropagation()}
                role="presentation"
              >
                <PopupMenuContent
                  actions={resolvedPdfCompressionLevelActions}
                  minWidthClassName="min-w-[168px]"
                  enableArrowNavigation
                  initialPreselectedIndex={1}
                  iconClassName={CHAT_POPOVER_ICON_CLASS_NAME}
                  enableAnimatedHighlight
                  surfaceClassName={CHAT_POPUP_MENU_SURFACE_CLASS_NAME}
                />
              </div>
            </PopupMenuPopover>,
            document.body
          )
        : null}
    </>
  );
};
