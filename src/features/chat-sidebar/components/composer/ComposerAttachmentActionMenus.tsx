import type { PopupMenuAction } from '@/components/image-manager/PopupMenuContent';
import PopupMenuContent from '@/components/image-manager/PopupMenuContent';
import PopupMenuPopover from '@/components/shared/popup-menu-popover';
import { createPortal } from 'react-dom';
import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

const CHAT_POPOVER_ICON_CLASS_NAME =
  '[&>svg]:!text-black hover:[&>svg]:!text-black data-[preselected=true]:[&>svg]:!text-black';

interface ComposerAttachmentActionMenusProps {
  openImageActionsAttachmentId: string | null;
  imageActionsMenuPosition: {
    top: number;
    left: number;
  } | null;
  pdfCompressionMenuPosition: {
    top: number;
    left: number;
  } | null;
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
  const previousImageActionsMenuTopRef = useRef<number | null>(null);
  const previousPdfCompressionMenuTopRef = useRef<number | null>(null);
  const [imageActionsMenuOffsetY, setImageActionsMenuOffsetY] = useState(0);
  const [pdfCompressionMenuOffsetY, setPdfCompressionMenuOffsetY] = useState(0);
  const [
    isImageActionsMenuRepositionAnimationEnabled,
    setIsImageActionsMenuRepositionAnimationEnabled,
  ] = useState(false);
  const [
    isPdfCompressionMenuRepositionAnimationEnabled,
    setIsPdfCompressionMenuRepositionAnimationEnabled,
  ] = useState(false);

  useLayoutEffect(() => {
    if (!imageActionsMenuPosition) {
      previousImageActionsMenuTopRef.current = null;
      setImageActionsMenuOffsetY(0);
      setIsImageActionsMenuRepositionAnimationEnabled(false);
      return;
    }

    const previousTop = previousImageActionsMenuTopRef.current;
    previousImageActionsMenuTopRef.current = imageActionsMenuPosition.top;

    if (previousTop === null) {
      setImageActionsMenuOffsetY(0);
      setIsImageActionsMenuRepositionAnimationEnabled(false);
      return;
    }

    const nextOffsetY = previousTop - imageActionsMenuPosition.top;
    if (nextOffsetY === 0) {
      setImageActionsMenuOffsetY(0);
      return;
    }

    setIsImageActionsMenuRepositionAnimationEnabled(false);
    setImageActionsMenuOffsetY(nextOffsetY);

    const rafId = window.requestAnimationFrame(() => {
      setIsImageActionsMenuRepositionAnimationEnabled(true);
      setImageActionsMenuOffsetY(0);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [imageActionsMenuPosition]);

  useLayoutEffect(() => {
    if (!pdfCompressionMenuPosition) {
      previousPdfCompressionMenuTopRef.current = null;
      setPdfCompressionMenuOffsetY(0);
      setIsPdfCompressionMenuRepositionAnimationEnabled(false);
      return;
    }

    const previousTop = previousPdfCompressionMenuTopRef.current;
    previousPdfCompressionMenuTopRef.current = pdfCompressionMenuPosition.top;

    if (previousTop === null) {
      setPdfCompressionMenuOffsetY(0);
      setIsPdfCompressionMenuRepositionAnimationEnabled(false);
      return;
    }

    const nextOffsetY = previousTop - pdfCompressionMenuPosition.top;
    if (nextOffsetY === 0) {
      setPdfCompressionMenuOffsetY(0);
      return;
    }

    setIsPdfCompressionMenuRepositionAnimationEnabled(false);
    setPdfCompressionMenuOffsetY(nextOffsetY);

    const rafId = window.requestAnimationFrame(() => {
      setIsPdfCompressionMenuRepositionAnimationEnabled(true);
      setPdfCompressionMenuOffsetY(0);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [pdfCompressionMenuPosition]);

  if (typeof document === 'undefined' || !openImageActionsAttachmentId) {
    return null;
  }

  const imageActionsMenuStyle = imageActionsMenuPosition
    ? {
        top: imageActionsMenuPosition.top,
        left: imageActionsMenuPosition.left,
        transform:
          imageActionsMenuOffsetY !== 0
            ? `translateY(${imageActionsMenuOffsetY}px)`
            : undefined,
        willChange:
          imageActionsMenuOffsetY !== 0 ? ('transform' as const) : undefined,
      }
    : {
        top: -10_000,
        left: -10_000,
        visibility: 'hidden' as const,
        pointerEvents: 'none' as const,
      };
  const imageActionsMenuClassName = 'fixed z-[120] origin-top-right';
  const pdfCompressionMenuClassName = 'fixed z-[121] origin-top-right';

  return (
    <>
      {createPortal(
        <PopupMenuPopover
          isOpen
          className={imageActionsMenuClassName}
          style={imageActionsMenuStyle}
          initial={{ opacity: 0 }}
          animate={{
            opacity: imageActionsMenuPosition ? 1 : 0,
            y: imageActionsMenuOffsetY,
          }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: { duration: 0.12, ease: 'easeOut' },
            y: isImageActionsMenuRepositionAnimationEnabled
              ? {
                  duration: 0.18,
                  ease: [0.22, 1, 0.36, 1],
                }
              : {
                  duration: 0,
                },
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
              className={pdfCompressionMenuClassName}
              style={{
                top: pdfCompressionMenuPosition.top,
                left: pdfCompressionMenuPosition.left,
              }}
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                y: pdfCompressionMenuOffsetY,
              }}
              exit={{ opacity: 0 }}
              transition={{
                opacity: { duration: 0.12, ease: 'easeOut' },
                y: isPdfCompressionMenuRepositionAnimationEnabled
                  ? {
                      duration: 0.18,
                      ease: [0.22, 1, 0.36, 1],
                    }
                  : {
                      duration: 0,
                    },
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
