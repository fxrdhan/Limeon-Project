import type { PopupMenuAction } from '@/components/image-manager/PopupMenuContent';
import PopupMenuContent from '@/components/image-manager/PopupMenuContent';
import PopupMenuPopover from '@/components/shared/popup-menu-popover';
import { createPortal } from 'react-dom';
import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

const CHAT_POPOVER_ICON_CLASS_NAME =
  '[&>svg]:!text-black hover:[&>svg]:!text-black data-[preselected=true]:[&>svg]:!text-black';
const IMAGE_ACTIONS_MENU_CLASS_NAME = 'fixed z-[120] origin-top-right';
const PDF_COMPRESSION_MENU_CLASS_NAME = 'fixed z-[121] origin-top-right';
const MENU_FADE_TRANSITION = {
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
    transform: offsetY !== 0 ? `translateY(${offsetY}px)` : undefined,
    willChange: offsetY !== 0 ? ('transform' as const) : undefined,
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
  const imageActionsMenuMotion = useVerticalMenuReposition(
    imageActionsMenuPosition
  );
  const pdfCompressionMenuMotion = useVerticalMenuReposition(
    pdfCompressionMenuPosition
  );

  if (typeof document === 'undefined' || !openImageActionsAttachmentId) {
    return null;
  }

  const imageActionsMenuStyle = resolveMenuStyle(
    imageActionsMenuPosition,
    imageActionsMenuMotion.offsetY
  );

  return (
    <>
      {createPortal(
        <PopupMenuPopover
          isOpen
          className={IMAGE_ACTIONS_MENU_CLASS_NAME}
          style={imageActionsMenuStyle}
          initial={{ opacity: 0 }}
          animate={{
            opacity: imageActionsMenuPosition ? 1 : 0,
            y: imageActionsMenuMotion.offsetY,
          }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: MENU_FADE_TRANSITION,
            y: imageActionsMenuMotion.yTransition,
          }}
        >
          <div
            ref={imageActionsMenuRef}
            onClick={event => event.stopPropagation()}
            role="presentation"
          >
            <PopupMenuContent
              actions={imageActions}
              minWidthClassName="min-w-[132px]"
              enableArrowNavigation
              autoFocusFirstItem
              iconClassName={CHAT_POPOVER_ICON_CLASS_NAME}
            />
          </div>
        </PopupMenuPopover>,
        document.body
      )}

      {pdfCompressionMenuPosition && pdfCompressionLevelActions.length > 0
        ? createPortal(
            <PopupMenuPopover
              isOpen
              className={PDF_COMPRESSION_MENU_CLASS_NAME}
              style={resolveMenuStyle(
                pdfCompressionMenuPosition,
                pdfCompressionMenuMotion.offsetY
              )}
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                y: pdfCompressionMenuMotion.offsetY,
              }}
              exit={{ opacity: 0 }}
              transition={{
                opacity: MENU_FADE_TRANSITION,
                y: pdfCompressionMenuMotion.yTransition,
              }}
            >
              <div
                ref={pdfCompressionMenuRef}
                onClick={event => event.stopPropagation()}
                role="presentation"
              >
                <PopupMenuContent
                  actions={pdfCompressionLevelActions}
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
