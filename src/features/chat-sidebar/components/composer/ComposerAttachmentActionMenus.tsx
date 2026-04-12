import type { PopupMenuAction } from '@/components/image-manager/PopupMenuContent';
import PopupMenuContent from '@/components/image-manager/PopupMenuContent';
import PopupMenuPopover from '@/components/shared/popup-menu-popover';
import { createPortal } from 'react-dom';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';

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

type MenuPosition = {
  top: number;
  left: number;
};

const HIDDEN_MENU_STYLE = {
  top: -10_000,
  left: -10_000,
  visibility: 'hidden' as const,
  pointerEvents: 'none' as const,
};

const useVerticalMenuReposition = (position: MenuPosition | null) => {
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

const resolveMenuStyle = (position: MenuPosition | null, offsetY: number) => {
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

interface ComposerAttachmentActionMenusProps {
  openImageActionsAttachmentId: string | null;
  imageActionsMenuPosition: MenuPosition | null;
  pdfCompressionMenuPosition: MenuPosition | null;
  imageActions: PopupMenuAction[];
  pdfCompressionLevelActions: PopupMenuAction[];
  imageActionsMenuRef: RefObject<HTMLDivElement | null>;
  pdfCompressionMenuRef: RefObject<HTMLDivElement | null>;
}

export const ComposerAttachmentActionMenus = ({
  openImageActionsAttachmentId,
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
    useState<MenuPosition | null>(imageActionsMenuPosition);
  const [
    cachedPdfCompressionLevelActions,
    setCachedPdfCompressionLevelActions,
  ] = useState<PopupMenuAction[]>(pdfCompressionLevelActions);
  const [
    cachedPdfCompressionMenuPosition,
    setCachedPdfCompressionMenuPosition,
  ] = useState<MenuPosition | null>(pdfCompressionMenuPosition);
  const imageMenuCleanupTimeoutRef = useRef<number | null>(null);
  const pdfMenuCleanupTimeoutRef = useRef<number | null>(null);
  const imageActionsMenuMotion = useVerticalMenuReposition(
    openImageActionsAttachmentId
      ? imageActionsMenuPosition
      : cachedImageActionsMenuPosition
  );
  const pdfCompressionMenuMotion = useVerticalMenuReposition(
    pdfCompressionMenuPosition ?? cachedPdfCompressionMenuPosition
  );
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

  const imageActionsMenuStyle = resolveMenuStyle(
    resolvedImageActionsMenuPosition,
    imageActionsMenuMotion.offsetY
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
                y: imageActionsMenuMotion.offsetY,
              }}
              animate={{
                opacity: imageActionsMenuPosition ? 1 : 0,
                scale: imageActionsMenuPosition ? 1 : 0.98,
                x: 0,
                y: imageActionsMenuMotion.offsetY,
              }}
              exit={{
                opacity: 0,
                scale: 0.98,
                x: 0,
                y: imageActionsMenuMotion.offsetY,
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
              style={resolveMenuStyle(
                resolvedPdfCompressionMenuPosition,
                pdfCompressionMenuMotion.offsetY
              )}
              initial={{
                opacity: 0,
                scale: 0.96,
                x: -6,
                y: pdfCompressionMenuMotion.offsetY,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                x: 0,
                y: pdfCompressionMenuMotion.offsetY,
              }}
              exit={{
                opacity: 0,
                scale: 0.98,
                x: 0,
                y: pdfCompressionMenuMotion.offsetY,
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
                />
              </div>
            </PopupMenuPopover>,
            document.body
          )
        : null}
    </>
  );
};
